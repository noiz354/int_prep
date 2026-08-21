import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEventBus } from '../../../services/event-gateway/src/eventBus.mjs';
import { createProductServices } from '../src/productServices.mjs';
import { MemoryInterviewRepository } from '../src/repositories.mjs';

const tenantId = 'northstar';

function makeHarness(tenant = tenantId) {
  const events = new MemoryEventBus();
  const repository = new MemoryInterviewRepository([
    { id: 'int-2048', tenantId, candidateName: 'Alex Morgan', role: 'Senior Frontend Engineer', stage: 'Technical deep dive', status: 'live' },
    { id: 'int-2051', tenantId, candidateName: 'Nadia Rahman', role: 'Data Platform Manager', stage: 'Leadership conversation', status: 'scheduled' },
    { id: 'int-9000', tenantId: 'other-tenant', candidateName: 'Stella Cross', role: 'Secret', stage: 'Hmm', status: 'draft' },
  ]);
  const services = createProductServices({ events, repository, tenantId: tenant });
  return { events, repository, services };
}

test('BE-03 availability matching honors business hours, panel conflicts, and buffers', () => {
  const { services } = makeHarness();
  const from = '2026-08-24T00:00:00.000Z';
  const to = '2026-08-31T00:00:00.000Z';
  const slots = services.availability({ from, to, durationMinutes: 60, panelIds: ['panel-ada'] });
  assert.ok(Array.isArray(slots.available));
  assert.ok(slots.available.length > 0, 'expected at least one business-hours slot');
  // Singapore business hours 09:00-18:00 local: slot start must be in that window.
  for (const slot of slots.available) {
    const startHour = new Date(slot.start).getUTCHours() + 8; // Asia/Singapore
    assert.ok(startHour >= 9 && startHour < 18, `slot outside business hours: ${slot.start}`);
  }
  assert.equal(slots.bufferMinutes, 15);
  assert.ok(slots.rule.includes('business-hours'));
});

test('BE-03 scheduling rejects duplicate interview schedules and requires a valid start', () => {
  const { services } = makeHarness();
  services.createSchedule({ interviewId: 'int-2048', start: '2026-08-25T09:00:00.000Z' });
  assert.throws(() => services.createSchedule({ interviewId: 'int-2048', start: '2026-08-26T09:00:00.000Z' }), /already has a schedule/);
  assert.throws(() => services.createSchedule({ interviewId: 'int-2051' }), /valid start time/);
});

test('BE-04 calendar sync reconciles external events and reports conflicts for availability', () => {
  const { services } = makeHarness();
  const sync = services.createCalendarSync({ panelId: 'panel-ada', externalCalendarId: 'cal-ada-1' });
  sync.reconcile([
    { start: '2026-08-25T01:00:00.000Z', end: '2026-08-25T02:00:00.000Z', summary: 'Team standup' },
  ]);
  assert.equal(sync.status, 'synced');
  assert.equal(sync.events.length, 1);
  // A slot overlapping 01:00-02:00 UTC on Aug 25 must be excluded.
  const slots = services.availability({ from: '2026-08-25T00:00:00.000Z', to: '2026-08-26T00:00:00.000Z', panelIds: ['panel-ada'] });
  assert.ok(slots.available.every((s) => new Date(s.start) >= new Date('2026-08-25T02:00:00.000Z')));
});

test('BE-05 invitations expire, carry delivery status and locale, and are tenant-scoped', () => {
  const { services } = makeHarness();
  const invitation = services.createInvitation({ interviewId: 'int-2048', recipient: 'candidate@example.test', channel: 'email', locale: 'id' });
  assert.equal(invitation.locale, 'id');
  assert.match(invitation.localizedSubject, /Undangan wawancara/);
  assert.equal(invitation.deliveryStatus, 'queued');
  assert.ok(invitation.expiresAt > new Date().toISOString());
  // Valid verification.
  assert.equal(services.verifyInvitation(invitation.token).valid, true);
  // Expired verification: craft a past expiry via a direct call.
  const expired = services.createInvitation({ interviewId: 'int-2048', recipient: 'old@example.test', deliverBy: '2020-01-01T00:00:00.000Z' });
  assert.equal(services.verifyInvitation(expired.token).valid, false);
  assert.equal(services.verifyInvitation(expired.token).reason, 'expired');
});

test('BE-12 unified search is permission-filtered and never leaks cross-tenant records', () => {
  const { services } = makeHarness();
  const result = services.search({ query: 'Alex', scope: ['interviews'], permission: 'search:read' });
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].label, 'Alex Morgan');
  assert.equal(result.results[0].permission, 'search:read');
  // Cross-tenant record must never appear.
  const cross = services.search({ query: 'Stella', scope: ['interviews'] });
  assert.equal(cross.results.length, 0);
  // Empty query yields no results.
  assert.equal(services.search({ query: '', scope: ['interviews'] }).results.length, 0);
});

test('BE-13 notifications respect quiet hours, retry limits, and escalation', () => {
  const { services } = makeHarness();
  const job = services.createNotificationJob({ recipient: 'lead@example.test', channel: 'email', template: 'interview-summary', retries: 1, escalateTo: 'ops-oncall' });
  // Force quiet hours (23:00 local) → deferred.
  const deferred = services.attemptNotification(job.id, { nowMs: new Date('2026-08-25T23:30:00.000Z').getTime() });
  assert.equal(deferred.status, 'deferred-quiet-hours');
  // Retry outside quiet hours → delivered.
  const delivered = services.attemptNotification(job.id, { nowMs: new Date('2026-08-25T10:00:00.000Z').getTime() });
  assert.equal(delivered.status, 'delivered');
  // Exceed retries → escalated to the escalation target.
  const fragile = services.createNotificationJob({ recipient: 'x@example.test', template: 'nudge', retries: 0, escalateTo: 'privacy-admin' });
  const escalated = services.attemptNotification(fragile.id, { nowMs: new Date('2026-08-25T10:00:00.000Z').getTime() });
  assert.equal(escalated.status, 'escalated');
  assert.equal(escalated.escalatedTo, 'privacy-admin');
  const status = services.notificationStatus(fragile.id);
  assert.equal(status.status, 'escalated');
});

test('Phase 1 mutations publish contract events with tenant context', () => {
  const { services, events } = makeHarness();
  services.createSchedule({ interviewId: 'int-2048', start: '2026-08-25T09:00:00.000Z' });
  services.createInvitation({ interviewId: 'int-2048', recipient: 'c@example.test' });
  services.createNotificationJob({ recipient: 'n@example.test', template: 'reminder' });
  const types = events.list({ tenantId }).map((event) => event.type);
  assert.ok(types.includes('schedule.confirmed'));
  assert.ok(types.includes('invitation.created'));
  assert.ok(types.includes('notification.job.created'));
});

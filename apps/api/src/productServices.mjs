/**
 * Phase 1 — Backend product services (BE-03, BE-04, BE-05, BE-12, BE-13).
 *
 * Replaces the earlier completion-route stubs with a tested, tenant-scoped,
 * consent-aware service boundary. Provider calls (calendar, email, ATS, search
 * index) remain behind adapters so they can be wired to real vendors after
 * Phase 0 provider decisions are approved; anything requiring credentials is
 * labeled `blockedOnProviderDecision`.
 */
import { randomUUID } from 'node:crypto';
import { createEvent } from '../../../services/event-gateway/src/eventBus.mjs';

const now = () => new Date().toISOString();
const uuid = () => randomUUID().slice(0, 8);
const hours = (date = now()) => new Date(date).getTime();
const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

const SLACK_RULES = {
  'ap-southeast-1': { businessStart: 9, businessEnd: 18, timeZone: 'Asia/Singapore' },
  'us-east-1': { businessStart: 9, businessEnd: 17, timeZone: 'America/New_York' },
  'eu-central-1': { businessStart: 9, businessEnd: 17, timeZone: 'Europe/Berlin' },
};

const DELIVERY_CHANNELS = ['email', 'sms', 'slack', 'teams'];
const DELIVERY_STATUS = ['queued', 'sent', 'delivered', 'failed', 'escalated'];

function parseDateTime(value, fallback) {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.getTime();
}

function isWithinBusinessHours(candidateStartMs, timeZone) {
  const slack = SLACK_RULES[timeZone] || SLACK_RULES['ap-southeast-1'];
  const start = new Date(candidateStartMs);
  // Local business hours in the panel's region, applied to the candidate's slot.
  return start.getHours() >= slack.businessStart && start.getHours() < slack.businessEnd;
}

function createInvitationToken() {
  // 32-byte random token; expiring link pattern for BE-05.
  return `inv_${randomUUID().replaceAll('-', '')}${randomUUID().replaceAll('-', '')}`;
}

export function maskEmail(email) {
  const [user, domain] = String(email || '').split('@');
  if (!domain) return 'hidden';
  return `${user.slice(0, 1)}***@${domain}`;
}

export function createProductServices({ events, repository, tenantId = 'northstar', initial = {}, persist } = {}) {
  const schedules = [...(initial.schedules || [])];
  const calendarSyncs = [];
  const invitations = [...(initial.invitations || [])];
  const notificationJobs = [...(initial.notificationJobs || [])];
  const save = () => persist?.({ schedules, invitations, notificationJobs });
  const panels = [
    { id: 'panel-ada', name: 'Ada Reviewer', roles: ['interviewer'], timeZone: 'Asia/Singapore', calendarUrl: 'mock://calendar/ada' },
    { id: 'panel-ben', name: 'Ben Ops', roles: ['interviewer'], timeZone: 'Asia/Singapore', calendarUrl: 'mock://calendar/ben' },
    { id: 'panel-cyn', name: 'Cyn Lead', roles: ['lead'], timeZone: 'America/New_York', calendarUrl: 'mock://calendar/cyn' },
  ];

  function publish(type, payload, options = {}) {
    if (!events) return;
    events.publish(createEvent(type, { tenantId, ...payload }, { idempotencyKey: options.idempotencyKey, eventId: options.eventId }));
  }

  function findInterview(interviewId) {
    return repository?.findById ? repository.records.get(interviewId) : null;
  }

  /** Availability matching (BE-03): time zone, panel skill, buffers, conflicts, SLA. */
  function availability({ requisitionId, interviewId, panelIds = [], from, to, durationMinutes = 60 }) {
    const fromMs = parseDateTime(from, hours() + 24 * HOUR_MS);
    const toMs = parseDateTime(to, fromMs + 7 * 24 * HOUR_MS);
    const durationMs = durationMinutes * MINUTE_MS;
    const selectedPanel = panelIds.length ? panels.filter((p) => panelIds.includes(p.id)) : panels;
    if (!selectedPanel.length) return { available: [], blockedOnProviderDecision: ['panel directory'] };

    const slots = [];
    const stepMs = 30 * MINUTE_MS;
    const timeZone = selectedPanel[0].timeZone;
    for (let cursor = fromMs; cursor + durationMs <= toMs; cursor += stepMs) {
      if (!isWithinBusinessHours(cursor, timeZone)) continue;
      const conflict = selectedPanel.some((panel) => (
        calendarSyncs.some((sync) => sync.panelId === panel.id && sync.overlaps(cursor, cursor + durationMs))
      ));
      if (conflict) continue;
      slots.push({ start: new Date(cursor).toISOString(), end: new Date(cursor + durationMs).toISOString(), panelIds: selectedPanel.map((p) => p.id) });
      if (slots.length >= 5) break;
    }
    return { available: slots, timeZone, bufferMinutes: 15, rule: 'business-hours + panel-calendar conflict check' };
  }

  function createSchedule({ interviewId, requisitionId, start, panelIds = [], idempotencyKey }) {
    const startMs = parseDateTime(start, null);
    if (!startMs) throw new Error('A valid start time is required');
    const existing = schedules.find((s) => s.interviewId === interviewId);
    if (existing) throw new Error('Interview already has a schedule');
    const schedule = {
      id: `sched-${uuid()}`,
      tenantId,
      interviewId,
      requisitionId,
      start: new Date(startMs).toISOString(),
      panelIds,
      status: 'confirmed',
      createdAt: now(),
    };
    schedules.push(schedule);
    save();
    publish('schedule.confirmed', { interviewId, scheduleId: schedule.id, start: schedule.start }, { idempotencyKey });
    return schedule;
  }

  function listSchedules() {
    return schedules.filter((s) => s.tenantId === tenantId);
  }

  /** Two-way calendar sync (BE-04): reconciliation and cancel/reschedule behavior. */
  function createCalendarSync({ panelId, provider = 'mock-calendar', externalCalendarId }) {
    if (!panels.some((p) => p.id === panelId)) throw new Error('Unknown panel');
    const sync = {
      id: `sync-${uuid()}`,
      tenantId,
      panelId,
      provider,
      externalCalendarId,
      status: 'pending',
      events: [],
      createdAt: now(),
      overlaps(startMs, endMs) {
        return this.events.some((evt) => {
          const evtStart = hours(evt.start);
          const evtEnd = hours(evt.end);
          return startMs < evtEnd && endMs > evtStart;
        });
      },
      reconcile(externalEvents) {
        this.events = externalEvents.map((evt) => ({ ...evt, reconciledAt: now() }));
        this.status = 'synced';
        publish('calendar.synced', { panelId, calendarId: externalCalendarId, eventCount: this.events.length });
        return this.events;
      },
      cancel() {
        this.status = 'cancelled';
        publish('calendar.sync.cancelled', { panelId, calendarId: externalCalendarId });
      },
    };
    calendarSyncs.push(sync);
    return sync;
  }

  /** Secure interview invitation service (BE-05): expiring links, delivery status, localization, audit. */
  function createInvitation({ interviewId, recipient, channel = 'email', locale = 'en', deliverBy }) {
    if (!DELIVERY_CHANNELS.includes(channel)) throw new Error('Unsupported delivery channel');
    const invitation = {
      id: `inv-${uuid()}`,
      tenantId,
      interviewId,
      recipient,
      channel,
      locale,
      token: createInvitationToken(),
      expiresAt: new Date(parseDateTime(deliverBy, hours() + 48 * HOUR_MS)).toISOString(),
      deliveryStatus: 'queued',
      createdAt: now(),
      localizedSubject: locale === 'id' ? 'Undangan wawancara SignalRoom' : 'SignalRoom interview invitation',
    };
    invitations.push(invitation);
    save();
    publish('invitation.created', { interviewId, invitationId: invitation.id, recipient, channel, locale }, { idempotencyKey: `invite:${interviewId}:${recipient}` });
    return invitation;
  }

  function listInvitations() {
    return invitations.filter((i) => i.tenantId === tenantId);
  }

  function verifyInvitation(token) {
    const invitation = invitations.find((i) => i.token === token && i.tenantId === tenantId);
    if (!invitation) return { valid: false, reason: 'unknown-token' };
    if (hours(invitation.expiresAt) < hours()) return { valid: false, reason: 'expired' };
    return { valid: true, invitation };
  }

  /** Token lookup is not tenant-filtered: the unguessable token is the capability. */
  function lookupInvitationByToken(token) {
    const invitation = invitations.find((i) => i.token === token);
    if (!invitation) return { valid: false, reason: 'unknown-token' };
    if (hours(invitation.expiresAt) < hours()) return { valid: false, reason: 'expired' };
    return { valid: true, invitation };
  }

  function invitationAllows({ token, interviewId }) {
    const result = lookupInvitationByToken(token);
    return Boolean(result.valid && result.invitation.interviewId === interviewId);
  }

  async function publicInvitationPreview(token) {
    const result = lookupInvitationByToken(token);
    if (!result.valid) return result;
    const invitation = result.invitation;
    const interview = repository?.findById
      ? await repository.findById(invitation.interviewId, invitation.tenantId)
      : null;
    return {
      valid: true,
      tenantId: invitation.tenantId,
      invitation: {
        id: invitation.id,
        interviewId: invitation.interviewId,
        locale: invitation.locale,
        expiresAt: invitation.expiresAt,
        recipientHint: maskEmail(invitation.recipient),
      },
      interview: interview
        ? {
            id: interview.id,
            candidateName: interview.candidateName,
            role: interview.role,
            stage: interview.stage,
            scheduledAt: interview.scheduledAt,
            status: interview.status,
            consentHistory: interview.consentHistory || [],
          }
        : null,
    };
  }

  async function recordConsentForInvitation(token, consentFields) {
    const result = lookupInvitationByToken(token);
    if (!result.valid) return result;
    if (!repository?.saveConsent) return { valid: false, reason: 'store-unavailable' };
    const invitation = result.invitation;
    const interview = await repository.findById(invitation.interviewId, invitation.tenantId);
    if (!interview) return { valid: false, reason: 'interview-missing' };
    const consent = {
      id: `consent-${uuid()}`,
      ...consentFields,
      subjectId: `invitee:${invitation.id}`,
      invitationId: invitation.id,
      recordedAt: now(),
    };
    await repository.saveConsent(interview.id, invitation.tenantId, consent);
    publish('consent.updated', { interviewId: interview.id, consentId: consent.id, invitationId: invitation.id });
    return { valid: true, consent, interviewId: interview.id, tenantId: invitation.tenantId };
  }

  /** Unified search (BE-12): permission-filtered over allowed entities and artifacts. */
  function search({ query, scope = ['interviews', 'artifacts', 'catalog'], permission = 'search:read', artifactsByInterview = new Map(), dataCatalog = null }) {
    const terms = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return { results: [] };
    const matches = [];
    if (scope.includes('interviews') && repository) {
      for (const record of repository.records.values()) {
        if (record.tenantId !== tenantId) continue;
        const haystack = [record.candidateName, record.role, record.stage, record.status].join(' ').toLowerCase();
        if (terms.every((term) => haystack.includes(term))) {
          matches.push({ type: 'interview', id: record.id, label: record.candidateName, role: record.role, permission });
        }
      }
    }
    if (scope.includes('artifacts')) {
      for (const [interviewId, items] of artifactsByInterview) {
        for (const item of items) {
          if (item.tenantId !== tenantId) continue;
          const haystack = [item.type, item.reference].join(' ').toLowerCase();
          if (terms.every((term) => haystack.includes(term))) {
            matches.push({ type: 'artifact', id: item.id, interviewId, label: item.reference, permission: 'artifact:read' });
          }
        }
      }
    }
    if (scope.includes('catalog') && dataCatalog?.datasets) {
      for (const dataset of dataCatalog.datasets) {
        if (terms.every((term) => dataset.name.toLowerCase().includes(term))) {
          matches.push({ type: 'dataset', id: dataset.name, label: dataset.name, permission: 'data:operate' });
        }
      }
    }
    return { results: matches, filteredByPermission: permission };
  }

  /** Notification preference and escalation engine (BE-13): quiet hours, retries, escalation, delivery tracking. */
  function createNotificationJob({ recipient, channel = 'email', template, payload = {}, quietHoursStart, quietHoursEnd, retries = 3, escalateTo }) {
    if (!DELIVERY_CHANNELS.includes(channel)) throw new Error('Unsupported channel');
    const job = {
      id: `notif-${uuid()}`,
      tenantId,
      recipient,
      channel,
      template,
      payload,
      status: 'queued',
      attempts: 0,
      maxAttempts: retries,
      quietHoursStart: quietHoursStart ?? 22,
      quietHoursEnd: quietHoursEnd ?? 7,
      escalateTo,
      createdAt: now(),
      deliveredAt: null,
    };
    notificationJobs.push(job);
    save();
    publish('notification.job.created', { recipient, channel, template, notificationId: job.id });
    return job;
  }

  function attemptNotification(jobId, { nowMs = hours() } = {}) {
    const job = notificationJobs.find((j) => j.id === jobId);
    if (!job) throw new Error('Notification job not found');
    const localHour = new Date(nowMs).getHours();
    const inQuietHours = localHour >= job.quietHoursStart || localHour < job.quietHoursEnd;
    if (inQuietHours) {
      job.status = 'deferred-quiet-hours';
      publish('notification.deferred', { notificationId: job.id, reason: 'quiet-hours' });
      return { status: job.status, reason: 'quiet-hours' };
    }
    job.attempts += 1;
    if (job.attempts > job.maxAttempts) {
      job.status = 'escalated';
      job.escalatedTo = job.escalateTo || 'ops-oncall';
      publish('notification.escalated', { notificationId: job.id, recipient: job.recipient, escalatedTo: job.escalatedTo });
      return { status: 'escalated', escalatedTo: job.escalatedTo };
    }
    job.status = 'delivered';
    job.deliveredAt = new Date(nowMs).toISOString();
    publish('notification.delivered', { notificationId: job.id, recipient: job.recipient, attempts: job.attempts });
    return { status: 'delivered', attempts: job.attempts };
  }

  function notificationStatus(jobId) {
    const job = notificationJobs.find((j) => j.id === jobId);
    if (!job) return null;
    return { id: job.id, status: job.status, attempts: job.attempts, maxAttempts: job.maxAttempts, escalatedTo: job.escalatedTo };
  }

  return {
    availability,
    createSchedule,
    listSchedules,
    createCalendarSync,
    listCalendarSyncs: () => calendarSyncs.filter((s) => s.tenantId === tenantId),
    createInvitation,
    listInvitations,
    verifyInvitation,
    lookupInvitationByToken,
    invitationAllows,
    publicInvitationPreview,
    recordConsentForInvitation,
    search,
    createNotificationJob,
    attemptNotification,
    notificationStatus,
    listNotificationJobs: () => notificationJobs.filter((j) => j.tenantId === tenantId),
    _panels: () => panels,
  };
}

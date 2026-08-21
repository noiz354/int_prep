/**
 * Contract-first event adapter.
 * The in-memory adapter is used for the local vertical slice. A production
 * Kafka producer/consumer can implement the same publish/subscribe surface.
 */
export const EVENT_CONTRACT_VERSION = '1.0';

export const allowedEventTypes = new Set([
  'interview.created',
  'interview.lifecycle.transitioned',
  'interview.room.joined',
  'interview.room.left',
  'interview.recording.consent.captured',
  'artifact.created',
  'transcript.segment.finalized',
  'ai.copilot.followup.created',
  'ai.code.evaluated',
  'scorecard.submitted',
  'consent.updated',
  'consent.withdrawn',
  'data.telemetry.recorded',
  'data.replay.requested',
  'privacy.deletion.requested',
  'feature.flag.updated',
  'incident.created',
  'webhook.created',
  'completion.action.executed',
  'schedule.confirmed',
  'schedule.rescheduled',
  'schedule.cancelled',
  'calendar.synced',
  'calendar.sync.cancelled',
  'invitation.created',
  'invitation.expired',
  'notification.job.created',
  'notification.deferred',
  'notification.delivered',
  'notification.escalated',
  'media.session.provisioned',
  'media.session.ready',
  'media.session.audio-only',
  'media.session.ice-restart',
  'media.session.ended',
  'media.whiteboard.created',
  'media.whiteboard.annotated',
  'media.whiteboard.ended',
  'media.enhancement.applied',
  'recording.started',
  'recording.completed',
  'cdc.stream.created',
  'cdc.record.captured',
  'cdc.replay.requested',
  'cdc.backfill.completed',
  'lakehouse.ingested',
  'artifact.ingested',
  'pipeline.created',
  'pipeline.task.retried',
  'pipeline.task.succeeded',
  'pipeline.task.dlq',
  'pipeline.completed',
  'feature.defined',
  'backup.completed',
  'backup.restore-verified',
  'semantic.metric.published',
  'ai.interviewer.plan-created',
  'ai.resume.parsed',
  'ai.behavior.analyzed',
  'ai.engagement.analyzed',
  'ai.claim.verification',
  'ai.integrity.reviewed',
  'ai.language.coached',
  'security.stepup.issued',
  'security.stepup.verified',
  'security.secret.rotated',
  'security.envelope-key.rotated',
  'security.dlp.scanned',
  'security.waf.policy-set',
  'security.evidence.assembled',
  'security.dr.drill-planned',
]);

export function createEvent(type, payload = {}, options = {}) {
  if (!allowedEventTypes.has(type)) {
    throw new Error(`Unsupported event type: ${type}`);
  }
  if (!payload.tenantId) {
    throw new Error('Event payload must include tenantId');
  }
  return {
    eventId: options.eventId || crypto.randomUUID(),
    type,
    contractVersion: EVENT_CONTRACT_VERSION,
    occurredAt: options.occurredAt || new Date().toISOString(),
    idempotencyKey: options.idempotencyKey || `${type}:${payload.tenantId}:${payload.interviewId || 'platform'}:${crypto.randomUUID()}`,
    payload,
  };
}

export class MemoryEventBus {
  #events = [];
  #listeners = new Map();
  #keys = new Set();

  publish(event) {
    if (!event?.eventId || !event?.type || !event?.payload?.tenantId) {
      throw new Error('Invalid event contract');
    }
    if (this.#keys.has(event.idempotencyKey)) {
      return { ...event, duplicate: true };
    }
    this.#keys.add(event.idempotencyKey);
    const stored = { ...event, offset: this.#events.length, duplicate: false };
    this.#events.push(stored);
    for (const listener of this.#listeners.get(event.type) || []) listener(stored);
    for (const listener of this.#listeners.get('*') || []) listener(stored);
    return stored;
  }

  subscribe(type, listener) {
    const listeners = this.#listeners.get(type) || new Set();
    listeners.add(listener);
    this.#listeners.set(type, listeners);
    return () => listeners.delete(listener);
  }

  list({ type, tenantId, afterOffset = -1 } = {}) {
    return this.#events.filter((event) => (
      event.offset > afterOffset
      && (!type || event.type === type)
      && (!tenantId || event.payload.tenantId === tenantId)
    ));
  }
}

/**
 * Minimal seam for a KafkaJS-style producer. Provider setup and credentials
 * live outside the app layer; this class keeps the event envelope stable.
 */
export class KafkaProducerAdapter {
  constructor(producer, topicResolver = (event) => event.type.replaceAll('.', '-')) {
    this.producer = producer;
    this.topicResolver = topicResolver;
  }

  async publish(event) {
    if (!event?.eventId || !event?.payload?.tenantId) throw new Error('Invalid event contract');
    await this.producer.send({
      topic: this.topicResolver(event),
      messages: [{ key: event.payload.interviewId || event.eventId, value: JSON.stringify(event), headers: { 'contract-version': event.contractVersion } }],
    });
    return event;
  }
}

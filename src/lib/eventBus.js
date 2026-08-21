/**
 * Browser-safe domain-event bus used by the vertical slice.
 * In production this adapter is replaced by the Kafka gateway while preserving
 * the event contract and idempotency key behavior.
 */
export class LocalEventBus {
  constructor() {
    this.listeners = new Set();
    this.events = [];
  }

  publish(type, payload = {}) {
    const event = {
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      type,
      payload,
      occurredAt: new Date().toISOString(),
      idempotencyKey: payload.idempotencyKey || `${type}:${payload.interviewId || 'platform'}:${Date.now()}`,
    };
    this.events = [event, ...this.events].slice(0, 50);
    this.listeners.forEach((listener) => listener(event));
    return event;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const clientEventBus = new LocalEventBus();

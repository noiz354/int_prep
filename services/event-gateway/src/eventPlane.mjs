/**
 * Dual event plane: memory log (always) + KafkaProducerAdapter when Redpanda
 * is reachable. Schema Registry registration for existing contracts.
 */
import { KafkaProducerAdapter, MemoryEventBus, EVENT_CONTRACT_VERSION } from './eventBus.mjs';
import { createKafkaLite } from './kafkaLite.mjs';

const PROBE_TTL_MS = 15_000;

export const EVENT_JSON_SCHEMAS = [
  {
    subject: 'signalroom.event.envelope.v1-value',
    schema: {
      type: 'object',
      required: ['eventId', 'type', 'contractVersion', 'payload'],
      properties: {
        eventId: { type: 'string' },
        type: { type: 'string' },
        contractVersion: { type: 'string' },
        occurredAt: { type: 'string' },
        payload: { type: 'object', required: ['tenantId'], properties: { tenantId: { type: 'string' } } },
      },
    },
  },
  {
    subject: 'interview.lifecycle.v1-value',
    schema: { type: 'object', required: ['tenantId', 'interviewId'], properties: { tenantId: { type: 'string' }, interviewId: { type: 'string' }, status: { type: 'string' } } },
  },
  {
    subject: 'media.telemetry.v2-value',
    schema: { type: 'object', required: ['tenantId', 'interviewId', 'latencyMs', 'packetLoss'], properties: { tenantId: { type: 'string' }, interviewId: { type: 'string' }, latencyMs: { type: 'number' }, packetLoss: { type: 'number' } } },
  },
  {
    subject: 'ai.recommendations.v1-value',
    schema: { type: 'object', required: ['tenantId', 'interviewId', 'recommendationType', 'modelVersion'], properties: { tenantId: { type: 'string' }, interviewId: { type: 'string' }, recommendationType: { type: 'string' }, modelVersion: { type: 'string' } } },
  },
  {
    subject: 'consent.policy.v1-value',
    schema: { type: 'object', required: ['tenantId', 'interviewId', 'consentId'], properties: { tenantId: { type: 'string' }, interviewId: { type: 'string' }, consentId: { type: 'string' } } },
  },
];

export function createSchemaRegistryClient({ url, fetchImpl = globalThis.fetch.bind(globalThis), timeoutMs = 800 } = {}) {
  let last = { ok: false, at: 0, error: 'unprobed', registered: 0 };

  async function timed(pathname, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetchImpl(`${String(url).replace(/\/$/, '')}${pathname}`, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async function probe() {
    if (!url) {
      last = { ...last, ok: false, at: Date.now(), error: 'unconfigured' };
      return last;
    }
    if (last.at && Date.now() - last.at < PROBE_TTL_MS && last.error !== 'unprobed') return last;
    try {
      const response = await timed('/subjects');
      last = { ...last, ok: response.ok, at: Date.now(), error: response.ok ? null : `http-${response.status}` };
    } catch (error) {
      last = { ...last, ok: false, at: Date.now(), error: error.name === 'AbortError' ? 'timeout' : (error.message || 'unreachable') };
    }
    return last;
  }

  async function register(schemas = EVENT_JSON_SCHEMAS) {
    const status = await probe();
    if (!status.ok) return { ...status, registered: 0 };
    let registered = 0;
    const errors = [];
    for (const item of schemas) {
      try {
        const response = await timed(`/subjects/${encodeURIComponent(item.subject)}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/vnd.schemaregistry.v1+json' },
          body: JSON.stringify({ schemaType: 'JSON', schema: JSON.stringify(item.schema) }),
        });
        if (response.ok || response.status === 409) registered += 1;
        else errors.push(`${item.subject}:http-${response.status}`);
      } catch (error) {
        errors.push(`${item.subject}:${error.message}`);
      }
    }
    last = { ok: true, at: Date.now(), error: errors[0] || null, registered };
    return last;
  }

  return { probe, register, last: () => ({ ...last }), configured: Boolean(url) };
}

export class CompositeEventBus {
  #memory;
  #kafka;
  #kafkaLite;
  lastKafka = { ok: false, at: 0, error: 'idle' };

  constructor(memory, kafkaAdapter = null, kafkaLite = null) {
    this.#memory = memory;
    this.#kafka = kafkaAdapter;
    this.#kafkaLite = kafkaLite;
  }

  publish(event) {
    const stored = this.#memory.publish(event);
    if (!stored.duplicate && this.#kafka && this.#kafkaLite?.last()?.ok) {
      Promise.resolve(this.#kafka.publish(event)).then(() => {
        this.lastKafka = { ok: true, at: Date.now(), error: null };
      }).catch((error) => {
        this.lastKafka = { ok: false, at: Date.now(), error: error.message };
      });
    }
    return stored;
  }

  subscribe(type, listener) {
    return this.#memory.subscribe(type, listener);
  }

  list(query) {
    return this.#memory.list(query);
  }
}

export function createEventPlane({
  broker = process.env.REDPANDA_BROKER,
  schemaRegistry = process.env.REDPANDA_SCHEMA_REGISTRY,
  fetchImpl,
  connectImpl,
  kafkaLite,
} = {}) {
  const memory = new MemoryEventBus();
  const lite = kafkaLite || createKafkaLite({ broker, connectImpl });
  const registry = createSchemaRegistryClient({ url: schemaRegistry, fetchImpl });
  const kafkaAdapter = broker ? new KafkaProducerAdapter(lite) : null;
  const bus = new CompositeEventBus(memory, kafkaAdapter, lite);

  async function probe() {
    const [brokerStatus, registryStatus] = await Promise.all([
      lite.configured ? lite.probe() : Promise.resolve({ ok: false, error: 'unconfigured', at: Date.now() }),
      registry.configured ? registry.register() : Promise.resolve({ ok: false, error: 'unconfigured', at: Date.now(), registered: 0 }),
    ]);
    return {
      adapter: brokerStatus.ok ? 'memory+redpanda' : 'memory',
      contractVersion: EVENT_CONTRACT_VERSION,
      broker: { configured: lite.configured, ...brokerStatus },
      schemaRegistry: { configured: registry.configured, ...registryStatus },
      lastKafkaPublish: bus.lastKafka,
    };
  }

  return Object.assign(bus, {
    probe,
    kafkaLite: lite,
    registry,
    memory,
  });
}

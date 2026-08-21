/**
 * Honest provider health for operators. Never reports a sandbox mock as
 * “Connected to Greenhouse”. Probes are cached and fail-soft.
 */
const PROBE_TTL_MS = 15_000;
const HTTP_TIMEOUT_MS = 700;

function nowIso(ms = Date.now()) {
  return new Date(ms).toISOString();
}

async function timedFetch(fetchImpl, url, timeoutMs = HTTP_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { method: 'GET', signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function parseHostPort(raw, fallbackPort) {
  if (!raw) return null;
  try {
    if (/^[a-z]+:\/\//i.test(raw)) {
      const url = new URL(raw);
      return { host: url.hostname, port: Number(url.port || fallbackPort) };
    }
  } catch {
    return null;
  }
  const [host, port] = String(raw).split(':');
  return host ? { host, port: Number(port || fallbackPort) } : null;
}

export const INTEGRATION_CATALOG = [
  { id: 'greenhouse', name: 'Greenhouse', type: 'Applicant tracking', initials: 'GH', accent: 'green', kind: 'ats', probe: 'wiremock' },
  { id: 'google-workspace', name: 'Google Workspace', type: 'Calendar & identity', initials: 'GW', accent: 'blue', kind: 'calendar', probe: 'none' },
  { id: 'slack', name: 'Slack', type: 'Notifications', initials: 'SL', accent: 'purple', kind: 'comms', probe: 'none' },
  { id: 'workday', name: 'Workday', type: 'HRIS', initials: 'WD', accent: 'orange', kind: 'hris', probe: 'wiremock' },
];

export function createProviderHealth({
  fetchImpl = globalThis.fetch.bind(globalThis),
  eventPlane = null,
  persistenceMode = 'memory',
  env = process.env,
} = {}) {
  const cache = new Map();

  async function httpProbe(id, url, { okWhen } = {}) {
    const cached = cache.get(id);
    if (cached && Date.now() - cached.at < PROBE_TTL_MS) return cached;
    if (!url) {
      const row = { id, configured: false, state: 'unconfigured', ok: false, lastSuccess: null, lastError: 'unconfigured', at: Date.now() };
      cache.set(id, row);
      return row;
    }
    try {
      const response = await timedFetch(fetchImpl, url);
      const ok = okWhen ? okWhen(response) : response.ok;
      const row = {
        id,
        configured: true,
        state: ok ? 'up' : 'down',
        ok,
        lastSuccess: ok ? nowIso() : cached?.lastSuccess || null,
        lastError: ok ? null : `http-${response.status}`,
        at: Date.now(),
        httpStatus: response.status,
      };
      cache.set(id, row);
      return row;
    } catch (error) {
      const row = {
        id,
        configured: true,
        state: 'down',
        ok: false,
        lastSuccess: cached?.lastSuccess || null,
        lastError: error.name === 'AbortError' ? 'timeout' : (error.code || error.message || 'unreachable'),
        at: Date.now(),
      };
      cache.set(id, row);
      return row;
    }
  }

  async function snapshot() {
    const otlpBase = env.OTLP_ENDPOINT || env.OTEL_EXPORTER_OTLP_ENDPOINT || '';
    const wiremock = env.MOCK_OAUTH_URL || '';
    const keycloak = env.KEYCLOAK_URL || '';
    const qdrant = env.QDRANT_URL || '';
    const ollama = env.OLLAMA_URL || '';
    const minio = env.MINIO_ENDPOINT || '';
    const mongo = env.MONGO_URL || '';

    const plane = eventPlane?.probe ? await eventPlane.probe() : { adapter: 'memory', broker: { configured: false, ok: false, error: 'unconfigured' }, schemaRegistry: { configured: false, ok: false, error: 'unconfigured' } };

    const [otlp, mockOauth, idp, vectors, models, objects] = await Promise.all([
      otlpBase ? httpProbe('otlp', `${String(otlpBase).replace(/\/$/, '')}/v1/traces`, { okWhen: (res) => res.status < 500 }) : httpProbe('otlp', ''),
      wiremock ? httpProbe('wiremock', `${String(wiremock).replace(/\/$/, '')}/__admin/mappings`) : httpProbe('wiremock', ''),
      keycloak ? httpProbe('keycloak', `${String(keycloak).replace(/\/$/, '')}/realms/${env.KEYCLOAK_REALM || 'signalroom'}/.well-known/openid-configuration`) : httpProbe('keycloak', ''),
      qdrant ? httpProbe('qdrant', `${String(qdrant).replace(/\/$/, '')}/collections`) : httpProbe('qdrant', ''),
      ollama ? httpProbe('ollama', `${String(ollama).replace(/\/$/, '')}/api/tags`) : httpProbe('ollama', ''),
      minio ? httpProbe('minio', `${String(minio).replace(/\/$/, '')}/minio/health/live`) : httpProbe('minio', ''),
    ]);

    const mongoTarget = parseHostPort(mongo, 27017);
    const providers = [
      {
        id: 'event-bus',
        label: 'Event bus',
        state: plane.adapter === 'memory+redpanda' ? 'up' : 'local_only',
        ok: true,
        configured: true,
        lastSuccess: nowIso(),
        lastError: plane.broker?.ok ? null : plane.broker?.error || null,
        note: plane.adapter === 'memory+redpanda' ? 'Memory log plus Redpanda produce' : 'In-process memory log. KafkaProducerAdapter idle until Redpanda answers.',
      },
      {
        id: 'redpanda',
        label: 'Redpanda / Kafka',
        state: plane.broker?.ok ? 'up' : (plane.broker?.configured ? 'down' : 'unconfigured'),
        ok: Boolean(plane.broker?.ok),
        configured: Boolean(plane.broker?.configured),
        lastSuccess: plane.broker?.ok ? nowIso(plane.broker.at) : null,
        lastError: plane.broker?.ok ? null : plane.broker?.error || 'unconfigured',
        note: 'Produce uses KafkaProducerAdapter when the broker answers ApiVersions.',
      },
      {
        id: 'schema-registry',
        label: 'Schema registry',
        state: plane.schemaRegistry?.ok ? 'up' : (plane.schemaRegistry?.configured ? 'down' : 'unconfigured'),
        ok: Boolean(plane.schemaRegistry?.ok),
        configured: Boolean(plane.schemaRegistry?.configured),
        lastSuccess: plane.schemaRegistry?.ok ? nowIso(plane.schemaRegistry.at) : null,
        lastError: plane.schemaRegistry?.ok ? null : plane.schemaRegistry?.error || 'unconfigured',
        note: plane.schemaRegistry?.registered ? `${plane.schemaRegistry.registered} contract(s) registered` : 'Existing event contracts register when the registry is up.',
      },
      {
        id: 'otlp',
        label: 'OTLP collector',
        state: otlp.ok ? 'up' : (otlp.configured ? 'down' : 'unconfigured'),
        ok: otlp.ok,
        configured: otlp.configured,
        lastSuccess: otlp.lastSuccess,
        lastError: otlp.lastError,
        note: otlp.ok ? 'Trace exporter pointed at collector' : 'Spans stay process-local until OTLP_ENDPOINT answers.',
      },
      {
        id: 'wiremock',
        label: 'ATS/HRIS sandbox (WireMock)',
        state: mockOauth.ok ? 'sandbox_mock' : (mockOauth.configured ? 'down' : 'unconfigured'),
        ok: mockOauth.ok,
        configured: mockOauth.configured,
        lastSuccess: mockOauth.lastSuccess,
        lastError: mockOauth.lastError,
        note: 'Sandbox mock only. Not an OAuth connection to Greenhouse or Workday.',
      },
      {
        id: 'keycloak',
        label: 'Keycloak OIDC',
        state: idp.ok ? 'up' : (idp.configured ? 'down' : 'unconfigured'),
        ok: idp.ok,
        configured: idp.configured,
        lastSuccess: idp.lastSuccess,
        lastError: idp.lastError,
        note: 'OIDC start returns 503 until this is up.',
      },
      {
        id: 'mongo',
        label: 'MongoDB',
        state: mongoTarget ? 'unprobed_tcp' : 'unconfigured',
        ok: false,
        configured: Boolean(mongoTarget),
        lastSuccess: null,
        lastError: mongoTarget ? 'tcp probe skipped (file store is the running path)' : 'unconfigured',
        note: `Interview persistence is ${persistenceMode}. Mongo is not the default path.`,
      },
      {
        id: 'ollama',
        label: 'Ollama',
        state: models.ok ? 'up' : (models.configured ? 'down' : 'unconfigured'),
        ok: models.ok,
        configured: models.configured,
        lastSuccess: models.lastSuccess,
        lastError: models.lastError,
        note: models.ok ? 'Model gateway may call Ollama' : 'Copilot uses labelled deterministic fallback.',
      },
      {
        id: 'qdrant',
        label: 'Qdrant',
        state: vectors.ok ? 'up' : (vectors.configured ? 'down' : 'unconfigured'),
        ok: vectors.ok,
        configured: vectors.configured,
        lastSuccess: vectors.lastSuccess,
        lastError: vectors.lastError,
        note: vectors.ok ? 'Retrieval may use Qdrant' : 'Keyword retrieval fallback.',
      },
      {
        id: 'minio',
        label: 'MinIO',
        state: objects.ok ? 'up' : (objects.configured ? 'down' : 'unconfigured'),
        ok: objects.ok,
        configured: objects.configured,
        lastSuccess: objects.lastSuccess,
        lastError: objects.lastError,
        note: 'Artifact ingest still records hashes locally unless object storage is wired.',
      },
    ];

    const integrations = INTEGRATION_CATALOG.map((item) => {
      if (item.probe === 'wiremock') {
        return {
          ...item,
          status: mockOauth.ok ? 'Sandbox mock' : 'Not connected',
          statusKind: mockOauth.ok ? 'sandbox_mock' : (mockOauth.configured ? 'down' : 'unconfigured'),
          sync: mockOauth.ok ? `WireMock ${mockOauth.lastSuccess || 'up'}` : 'No OAuth app',
          lastSuccess: mockOauth.lastSuccess,
          lastError: mockOauth.lastError,
          note: 'Do not treat this as Connected to Greenhouse / Workday.',
        };
      }
      return {
        ...item,
        status: 'Not connected',
        statusKind: 'unconfigured',
        sync: 'OAuth app not configured',
        lastSuccess: null,
        lastError: 'oauth_unconfigured',
        note: 'Blocked until an OAuth application exists.',
      };
    });

    return {
      generatedAt: nowIso(),
      persistence: persistenceMode,
      eventAdapter: plane.adapter,
      otlpConfigured: Boolean(otlpBase),
      providers,
      integrations,
    };
  }

  return { snapshot, httpProbe };
}

import { metrics, trace, SpanStatusCode } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { createHash } from 'node:crypto';

let sdk;
let tracer;
let meter;
let httpDuration;
let requestCounter;
let errorCounter;
let abstentionCounter;
let mediaLatency;
let mediaPacketLoss;
let mediaJitter;
let mediaJoinCounter;
let roomJoinCounter;

function makeTracer(serviceName) {
  return trace.getTracer(serviceName, '0.1.0');
}

function makeMeter(serviceName) {
  const m = metrics.getMeter(serviceName, '0.1.0');
  httpDuration = m.createHistogram('http.server.duration', { description: 'HTTP request duration in seconds', unit: 's' });
  requestCounter = m.createCounter('http.server.requests', { description: 'HTTP requests handled' });
  errorCounter = m.createCounter('http.server.errors', { description: 'HTTP requests that failed (5xx)' });
  abstentionCounter = m.createCounter('career_vault.rag.abstentions', { description: 'RAG Career Coach abstentions by reason' });
  mediaLatency = m.createHistogram('media.rtc.latency_ms', { description: 'Realtime media round-trip latency in milliseconds', unit: 'ms' });
  mediaPacketLoss = m.createHistogram('media.rtc.packet_loss_percent', { description: 'Realtime media packet loss percentage', unit: '%' });
  mediaJitter = m.createHistogram('media.rtc.jitter_ms', { description: 'Realtime media jitter in milliseconds', unit: 'ms' });
  mediaJoinCounter = m.createCounter('media.session.joins', { description: 'Authorized media session joins' });
  roomJoinCounter = m.createCounter('realtime.room.joins', { description: 'Authorized realtime room joins' });
  return m;
}

export async function startTelemetry({ serviceName = 'signalroom-service' } = {}) {
  if (sdk || process.env.OTEL_ENABLED === 'false' || process.env.NODE_ENV === 'test') return;
  tracer = makeTracer(serviceName);
  meter = makeMeter(serviceName);
  const otlp = process.env.OTLP_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  let traceExporter;
  if (otlp) {
    try {
      const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
      const base = String(otlp).replace(/\/$/, '');
      const url = base.endsWith('/v1/traces') ? base : `${base}/v1/traces`;
      traceExporter = new OTLPTraceExporter({ url });
    } catch (error) {
      console.error('OTLP exporter unavailable:', error.message);
    }
  }
  sdk = new NodeSDK({
    serviceName,
    ...(traceExporter ? { traceExporter } : {}),
    instrumentations: [getNodeAutoInstrumentations()],
  });
  try {
    sdk.start();
  } catch (error) {
    // Fail-soft: telemetry must never take the service down.
    sdk = undefined;
    // eslint-disable-next-line no-console
    console.error('telemetry start failed (continuing without OTLP):', error.message);
  }
}

export async function stopTelemetry() {
  if (sdk) {
    await sdk.shutdown();
    sdk = undefined;
  }
}

export async function inSpan(name, attributes, callback) {
  const t = tracer || trace.getTracer('signalroom-service', '0.1.0');
  return t.startActiveSpan(name, async (span) => {
    try {
      Object.entries(attributes || {}).forEach(([key, value]) => span.setAttribute(key, value));
      const result = await callback(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}

export function hashTenant(tenantId) {
  // Tenant IDs may be sensitive in external telemetry; emit a stable low-cardinality hash.
  if (!tenantId) return 'unknown';
  return createHash('sha256').update(tenantId).digest('hex').slice(0, 12);
}

function activeTraceId() {
  const span = trace.getActiveSpan();
  const id = span?.spanContext()?.traceId;
  if (!id || /^0+$/.test(id)) return null;
  return id;
}

export function requestLogger(logger = console) {
  return (req, res, next) => {
    req.id = req.headers['x-request-id'] || `${req.actor?.tenantId || 'anon'}-${createHash('sha256').update(String(Math.random())).digest('hex').slice(0, 10)}`;
    req.traceId = req.headers['x-trace-id'] || activeTraceId() || req.id;
    res.setHeader('x-request-id', req.id);
    res.setHeader('x-trace-id', req.traceId);
    const startedAt = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const statusClass = `${Math.floor(res.statusCode / 100)}xx`;
      const route = req.route?.path || req.path || 'unknown';
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      const entry = {
        event: 'http.request',
        request_id: req.id,
        trace_id: req.traceId,
        method: req.method,
        route,
        status: res.statusCode,
        status_class: statusClass,
        duration_ms: Math.round(durationMs * 10) / 10,
        tenant: hashTenant(req.actor?.tenantId),
        actor: req.actor?.role || 'unknown',
      };
      logger[level](JSON.stringify(entry));
      recordRed({ route, statusClass });
    });
    next();
  };
}

export function recordRed({ route, statusClass }) {
  if (!requestCounter) return;
  requestCounter.add(1, { route, status_class: statusClass });
  if (statusClass === '5xx') errorCounter.add(1, { route });
  if (httpDuration) httpDuration.record(0.001, { route, status_class: statusClass });
}

export function recordRagAbstention(reason) {
  if (!abstentionCounter) return;
  abstentionCounter.add(1, { reason });
}

export function recordMediaQuality({ latencyMs, packetLoss, jitterMs, interviewId }) {
  if (!mediaLatency) return;
  const labels = { interview: interviewId || 'unknown' };
  mediaLatency.record(Math.max(0, latencyMs || 0), labels);
  mediaPacketLoss.record(Math.max(0, Math.min(100, packetLoss || 0)), labels);
  mediaJitter.record(Math.max(0, jitterMs || 0), labels);
}

export function recordMediaJoin({ tenantId, role }) {
  if (!mediaJoinCounter) return;
  mediaJoinCounter.add(1, { tenant: hashTenant(tenantId), role: role || 'unknown' });
}

export function recordRoomJoinSignal({ tenantId, role }) {
  if (!roomJoinCounter) return;
  roomJoinCounter.add(1, { tenant: hashTenant(tenantId), role: role || 'unknown' });
}

export function isTelemetryEnabled() {
  return Boolean(sdk);
}

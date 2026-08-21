import { metrics, trace, SpanStatusCode } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { hashTenant, requestLogger } from '../../../packages/observability/src/telemetry.mjs';

export { hashTenant, requestLogger };

let sdk;
const tracer = trace.getTracer('signalroom-api', '0.2.0');
const meter = metrics.getMeter('signalroom-api', '0.2.0');
const requestCounter = meter.createCounter('signalroom.api.requests', { description: 'HTTP API requests handled by the interview control plane' });
const roomJoinCounter = meter.createCounter('signalroom.room.joins', { description: 'Authorized realtime room joins' });
const mediaLatency = meter.createHistogram('media.rtc.latency_ms', { description: 'Realtime media round-trip latency in milliseconds', unit: 'ms' });
const mediaPacketLoss = meter.createHistogram('media.rtc.packet_loss_percent', { description: 'Realtime media packet loss percentage', unit: '%' });
const mediaJitter = meter.createHistogram('media.rtc.jitter_ms', { description: 'Realtime media jitter in milliseconds', unit: 'ms' });
const mediaJoinCounter = meter.createCounter('media.session.joins', { description: 'Authorized media session joins' });
const signalRoomJoinCounter = meter.createCounter('realtime.room.joins', { description: 'Authorized realtime room joins (signal)' });

export async function startTelemetry() {
  if (sdk || process.env.OTEL_ENABLED === 'false') return;
  sdk = new NodeSDK({
    serviceName: process.env.OTEL_SERVICE_NAME || 'signalroom-api',
    instrumentations: [getNodeAutoInstrumentations()],
  });
  sdk.start();
}

export async function stopTelemetry() {
  if (sdk) await sdk.shutdown();
  sdk = undefined;
}

export async function inSpan(name, attributes, callback) {
  return tracer.startActiveSpan(name, async (span) => {
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

export function recordRequest({ route, method, statusCode, tenantId }) {
  requestCounter.add(1, { route, method, status_code: statusCode, tenant_id: tenantId || 'unknown' });
}

export function recordRoomJoin({ tenantId, role }) {
  roomJoinCounter.add(1, { tenant_id: tenantId, role: role || 'unknown' });
}

export function recordMediaQuality({ latencyMs, packetLoss, jitterMs, interviewId }) {
  const labels = { interview: interviewId || 'unknown' };
  mediaLatency.record(Math.max(0, latencyMs || 0), labels);
  mediaPacketLoss.record(Math.max(0, Math.min(100, packetLoss || 0)), labels);
  mediaJitter.record(Math.max(0, jitterMs || 0), labels);
}

export function recordMediaJoin({ tenantId, role }) {
  mediaJoinCounter.add(1, { tenant_id: tenantId, role: role || 'unknown' });
}

export function recordRoomJoinSignal({ tenantId, role }) {
  signalRoomJoinCounter.add(1, { tenant_id: tenantId, role: role || 'unknown' });
}

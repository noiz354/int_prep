import { metrics, trace, SpanStatusCode } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

let sdk;
const tracer = trace.getTracer('signalroom-api', '0.2.0');
const meter = metrics.getMeter('signalroom-api', '0.2.0');
const requestCounter = meter.createCounter('signalroom.api.requests', { description: 'HTTP API requests handled by the interview control plane' });
const roomJoinCounter = meter.createCounter('signalroom.room.joins', { description: 'Authorized realtime room joins' });

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

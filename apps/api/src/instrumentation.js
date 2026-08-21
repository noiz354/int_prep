import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION, ATTR_DEPLOYMENT_ENVIRONMENT_NAME } from '@opentelemetry/semantic-conventions';

const SERVICE_NAME = 'signalroom-api';
const SERVICE_VERSION = '0.1.0';
const DEPLOYMENT_ENV = process.env.NODE_ENV || 'development';

function createTraceExporter() {
  const endpoint = process.env.OTLP_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return undefined;
  const base = String(endpoint).replace(/\/$/, '');
  const url = base.endsWith('/v1/traces') ? base : `${base}/v1/traces`;
  try {
    return new OTLPTraceExporter({ url });
  } catch (error) {
    console.error('[instrumentation] OTLP trace exporter unavailable:', error.message);
    return undefined;
  }
}

function createMetricReader() {
  const endpoint = process.env.OTLP_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return undefined;
  const base = String(endpoint).replace(/\/$/, '');
  const url = base.endsWith('/v1/metrics') ? base : `${base}/v1/metrics`;
  try {
    const exporter = new OTLPMetricExporter({ url });
    return new PeriodicExportingMetricReader({
      exporter,
      exportIntervalMillis: Number(process.env.OTEL_METRIC_EXPORT_INTERVAL_MS || 30_000),
    });
  } catch (error) {
    console.error('[instrumentation] OTLP metric exporter unavailable:', error.message);
    return undefined;
  }
}

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: SERVICE_NAME,
  [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
  [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: DEPLOYMENT_ENV,
});

const traceExporter = createTraceExporter();
const metricReader = createMetricReader();

const sdk = new NodeSDK({
  resource,
  ...(traceExporter ? { traceExporter } : {}),
  ...(metricReader ? { metricReader } : {}),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': { enabled: false },
      '@opentelemetry/instrumentation-express': { enabled: false },
    }),
  ],
});

sdk.start();

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, async () => {
    try {
      await sdk.shutdown();
    } catch (error) {
      console.error('[instrumentation] OTel shutdown error:', error.message);
    }
  });
}

if (process.env.NODE_ENV !== 'test') {
  console.log(`[instrumentation] OTel SDK started for ${SERVICE_NAME}@${SERVICE_VERSION} (${DEPLOYMENT_ENV})`);
}

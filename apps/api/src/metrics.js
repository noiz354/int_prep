import { metrics } from '@opentelemetry/api';

const EXCLUDED_PATHS = new Set(['/health', '/metrics', '/api/health']);

const meter = metrics.getMeter('signalroom-api', '0.2.0');

const httpDuration = meter.createHistogram('http.server.request.duration', {
  description: 'HTTP request duration in milliseconds',
  unit: 'ms',
  advice: {
    explicitBucketBoundaries: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
  },
});

const httpRequestsTotal = meter.createCounter('http.server.requests.total', {
  description: 'Total HTTP requests by method, route, and status',
});

const activeRequests = meter.createUpDownCounter('http.server.requests.active', {
  description: 'Number of in-flight HTTP requests',
});

export function metricsMiddleware(req, res, next) {
  const path = req.route?.path || req.path || 'unknown';
  if (EXCLUDED_PATHS.has(path)) return next();

  activeRequests.add(1, { method: req.method, route: path });
  const startTime = performance.now();

  res.on('finish', () => {
    const durationMs = performance.now() - startTime;
    const labels = {
      method: req.method,
      route: path,
      status_code: String(res.statusCode),
    };

    httpDuration.record(durationMs, labels);
    httpRequestsTotal.add(1, labels);
    activeRequests.add(-1, { method: req.method, route: path });
  });

  next();
}

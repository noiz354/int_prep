import pino from 'pino';

const level = process.env.LOG_LEVEL || 'info';

const logger = pino({
  level,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

export function createChildLogger(bindings) {
  return logger.child(bindings);
}

export function extractTraceId(req) {
  return req?.traceId || req?.id || req?.headers?.['x-request-id'] || undefined;
}

export default logger;

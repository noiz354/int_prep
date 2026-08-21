import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('logger', () => {
  it('exports a pino logger with default level', async () => {
    const mod = await import('../src/logger.js');
    assert.ok(mod.default);
    assert.equal(mod.default.level, process.env.LOG_LEVEL || 'info');
  });

  it('extractTraceId returns traceId from request object', async () => {
    const { extractTraceId } = await import('../src/logger.js');
    assert.equal(extractTraceId({ traceId: 'abc-123' }), 'abc-123');
    assert.equal(extractTraceId({ id: 'req-456', traceId: undefined }), 'req-456');
    assert.equal(extractTraceId({ headers: { 'x-request-id': 'hdr-789' } }), 'hdr-789');
    assert.equal(extractTraceId({}), undefined);
    assert.equal(extractTraceId(null), undefined);
  });

  it('createChildLogger returns a child logger', async () => {
    const { createChildLogger } = await import('../src/logger.js');
    const child = createChildLogger({ component: 'test' });
    assert.ok(child);
    assert.equal(typeof child.info, 'function');
  });
});

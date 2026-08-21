import test from 'node:test';
import assert from 'node:assert/strict';
import { createModelGateway, inputSignature } from '../src/modelGateway.mjs';

test('U4 gateway falls back when Ollama is unreachable and never requires the prompt in the result', async () => {
  const gateway = createModelGateway({
    ollamaUrl: 'http://127.0.0.1:9',
    qdrantUrl: '',
    fetchImpl: async () => { throw new Error('offline'); },
    timeoutMs: 50,
  });
  const result = await gateway.complete({ prompt: 'secret transcript alex@example.test', fallbackText: 'How would you measure the outcome?' });
  assert.equal(result.fallback, true);
  assert.equal(result.provider, 'deterministic-fallback');
  assert.equal(result.text, 'How would you measure the outcome?');
  assert.equal(result.requiresHumanReview, true);
  assert.equal(JSON.stringify(result).includes('alex@example.test'), false);
  assert.equal(inputSignature('abc').length, 16);
});

test('U4 gateway uses Ollama text when the probe and generate succeed', async () => {
  const gateway = createModelGateway({
    ollamaUrl: 'http://ollama.test:11434',
    fetchImpl: async (url) => {
      if (String(url).endsWith('/api/tags')) return { ok: true };
      return { ok: true, json: async () => ({ response: 'Could you quantify the accessibility outcome?' }) };
    },
  });
  const result = await gateway.complete({ prompt: 'rubric', fallbackText: 'fallback' });
  assert.equal(result.fallback, false);
  assert.equal(result.provider, 'ollama');
  assert.match(result.text, /accessibility/);
});

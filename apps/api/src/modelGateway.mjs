import { createHash } from 'node:crypto';

const DEFAULT_TIMEOUT_MS = 2500;
const PROBE_TTL_MS = 15_000;

export function inputSignature(text) {
  return createHash('sha256').update(String(text || '').slice(0, 2000)).digest('hex').slice(0, 16);
}

export function createModelGateway({
  ollamaUrl = process.env.OLLAMA_URL,
  qdrantUrl = process.env.QDRANT_URL,
  model = process.env.OLLAMA_CHAT_MODEL || 'granite3.1-dense:2b',
  fetchImpl = globalThis.fetch.bind(globalThis),
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  let lastOllama = { at: 0, ok: false, reason: 'unprobed' };
  let lastQdrant = { at: 0, ok: false, reason: 'unprobed' };

  async function timed(url, options = {}, ms = timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      return await fetchImpl(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async function probeOllama() {
    if (!ollamaUrl) {
      lastOllama = { at: Date.now(), ok: false, reason: 'unconfigured' };
      return lastOllama;
    }
    if (Date.now() - lastOllama.at < PROBE_TTL_MS) return lastOllama;
    try {
      const response = await timed(`${String(ollamaUrl).replace(/\/$/, '')}/api/tags`, {}, 800);
      lastOllama = { at: Date.now(), ok: response.ok, reason: response.ok ? 'up' : `http-${response.status}` };
    } catch (error) {
      lastOllama = { at: Date.now(), ok: false, reason: error.name === 'AbortError' ? 'timeout' : 'unreachable' };
    }
    return lastOllama;
  }

  async function probeQdrant() {
    if (!qdrantUrl) {
      lastQdrant = { at: Date.now(), ok: false, reason: 'unconfigured' };
      return lastQdrant;
    }
    if (Date.now() - lastQdrant.at < PROBE_TTL_MS) return lastQdrant;
    try {
      const response = await timed(`${String(qdrantUrl).replace(/\/$/, '')}/collections`, {}, 800);
      lastQdrant = { at: Date.now(), ok: response.ok, reason: response.ok ? 'up' : `http-${response.status}` };
    } catch (error) {
      lastQdrant = { at: Date.now(), ok: false, reason: error.name === 'AbortError' ? 'timeout' : 'unreachable' };
    }
    return lastQdrant;
  }

  async function status() {
    const [ollama, qdrant] = await Promise.all([probeOllama(), probeQdrant()]);
    return {
      ollama: { configured: Boolean(ollamaUrl), ...ollama, model },
      qdrant: { configured: Boolean(qdrantUrl), ...qdrant },
      retrieval: qdrant.ok ? 'qdrant' : 'local-keyword',
      generation: ollama.ok ? 'ollama' : 'deterministic-fallback',
    };
  }

  function fallbackResult(fallbackText, reason) {
    return {
      text: fallbackText,
      provider: 'deterministic-fallback',
      model: 'local-heuristic',
      fallback: true,
      reason,
      requiresHumanReview: true,
    };
  }

  async function complete({ prompt, fallbackText }) {
    const probe = await probeOllama();
    if (!probe.ok) return fallbackResult(fallbackText, probe.reason);
    try {
      const response = await timed(`${String(ollamaUrl).replace(/\/$/, '')}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, stream: false, options: { temperature: 0.2, num_predict: 180 } }),
      });
      if (!response.ok) return fallbackResult(fallbackText, `http-${response.status}`);
      const body = await response.json();
      const text = String(body?.response || '').trim();
      if (!text) return fallbackResult(fallbackText, 'empty-model-output');
      return {
        text,
        provider: 'ollama',
        model,
        fallback: false,
        reason: 'ok',
        requiresHumanReview: true,
      };
    } catch (error) {
      return fallbackResult(fallbackText, error.name === 'AbortError' ? 'timeout' : 'generate-failed');
    }
  }

  return { probeOllama, probeQdrant, status, complete, inputSignature };
}

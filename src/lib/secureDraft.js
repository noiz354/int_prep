/**
 * Encrypts only non-sensitive, recoverable UI state (never media, transcripts,
 * passwords, or access tokens). The AES key is session-scoped so data cannot be
 * recovered after an explicit browser-session reset.
 */
const prefix = 'signalroom:encrypted-draft:';
const keyPrefix = 'signalroom:session-key:';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBase64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const fromBase64 = (value) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

function supportsCrypto() {
  return Boolean(globalThis.crypto?.subtle && globalThis.localStorage && globalThis.sessionStorage);
}

async function keyFor(scope) {
  const keyName = `${keyPrefix}${scope}`;
  const stored = sessionStorage.getItem(keyName);
  if (stored) {
    return crypto.subtle.importKey('raw', fromBase64(stored), 'AES-GCM', false, ['encrypt', 'decrypt']);
  }
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const raw = await crypto.subtle.exportKey('raw', key);
  sessionStorage.setItem(keyName, toBase64(raw));
  return key;
}

export async function saveEncryptedDraft(scope, payload, { ttlMs = 12 * 60 * 60 * 1000 } = {}) {
  if (!supportsCrypto()) return { persisted: false, reason: 'Web Crypto is unavailable' };
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await keyFor(scope);
    const plaintext = encoder.encode(JSON.stringify({ expiresAt: Date.now() + ttlMs, payload }));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
    localStorage.setItem(`${prefix}${scope}`, JSON.stringify({ version: 1, iv: toBase64(iv), ciphertext: toBase64(encrypted) }));
    return { persisted: true };
  } catch {
    return { persisted: false, reason: 'The local draft could not be encrypted' };
  }
}

export async function readEncryptedDraft(scope) {
  if (!supportsCrypto()) return null;
  try {
    const raw = localStorage.getItem(`${prefix}${scope}`);
    if (!raw) return null;
    const stored = JSON.parse(raw);
    const key = await keyFor(scope);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(stored.iv) }, key, fromBase64(stored.ciphertext));
    const draft = JSON.parse(decoder.decode(plaintext));
    if (!draft.expiresAt || draft.expiresAt < Date.now()) {
      clearEncryptedDraft(scope);
      return null;
    }
    return draft.payload;
  } catch {
    clearEncryptedDraft(scope);
    return null;
  }
}

export function clearEncryptedDraft(scope) {
  localStorage.removeItem(`${prefix}${scope}`);
  sessionStorage.removeItem(`${keyPrefix}${scope}`);
}

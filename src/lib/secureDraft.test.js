import { beforeEach, describe, expect, it } from 'vitest';
import { clearEncryptedDraft, readEncryptedDraft, saveEncryptedDraft } from './secureDraft.js';

describe('encrypted offline draft', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('persists recoverable state without leaving its plaintext in localStorage', async () => {
    const payload = { consent: { recording: true, aiProcessing: false }, submitted: false };
    const result = await saveEncryptedDraft('test-preflight', payload);
    const serialized = localStorage.getItem('signalroom:encrypted-draft:test-preflight');
    expect(result.persisted).toBe(true);
    expect(serialized).not.toContain('recording');
    await expect(readEncryptedDraft('test-preflight')).resolves.toEqual(payload);
  });

  it('purges an expired draft', async () => {
    await saveEncryptedDraft('expired', { value: 'temporary' }, { ttlMs: -1 });
    await expect(readEncryptedDraft('expired')).resolves.toBeNull();
    expect(localStorage.getItem('signalroom:encrypted-draft:expired')).toBeNull();
    clearEncryptedDraft('expired');
  });
});

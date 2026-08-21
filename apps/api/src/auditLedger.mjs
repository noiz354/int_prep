import { createHash, randomUUID } from 'node:crypto';

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

export class AuditLedger {
  #entries = [];
  #lastHashByTenant = new Map();

  append({ tenantId, actor, action, target, metadata = {}, occurredAt = new Date().toISOString() }) {
    const previousHash = this.#lastHashByTenant.get(tenantId) || 'GENESIS';
    const entry = {
      id: `aud-${randomUUID()}`,
      tenantId,
      actor: { id: actor?.id || 'system', name: actor?.name || 'System', roles: actor?.roles || [] },
      action,
      target,
      metadata,
      occurredAt,
      previousHash,
    };
    entry.hash = hash(`${previousHash}:${canonicalize(entry)}`);
    this.#entries.push(Object.freeze(entry));
    this.#lastHashByTenant.set(tenantId, entry.hash);
    return entry;
  }

  list({ tenantId, limit = 50 } = {}) {
    return this.#entries.filter((entry) => !tenantId || entry.tenantId === tenantId).slice(-limit).reverse();
  }

  verify({ tenantId } = {}) {
    const entries = this.#entries.filter((entry) => !tenantId || entry.tenantId === tenantId);
    const previousHashByTenant = new Map();
    for (const entry of entries) {
      const previousHash = previousHashByTenant.get(entry.tenantId) || 'GENESIS';
      const { hash: entryHash, ...withoutHash } = entry;
      const expectedHash = hash(`${previousHash}:${canonicalize(withoutHash)}`);
      if (entry.previousHash !== previousHash || entryHash !== expectedHash) {
        return { valid: false, invalidEntryId: entry.id, entriesChecked: entries.length };
      }
      previousHashByTenant.set(entry.tenantId, entryHash);
    }
    return { valid: true, entriesChecked: entries.length, latestHash: tenantId ? previousHashByTenant.get(tenantId) || 'GENESIS' : undefined };
  }
}

import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { MemoryInterviewRepository } from './repositories.mjs';
import { AuditLedger } from './auditLedger.mjs';
import { northstarOrganization } from './organization.mjs';

function defaultPath() {
  return resolve(process.cwd(), process.env.SIGNALROOM_STORE_PATH || 'data/signalroom-store.json');
}

function readJson(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function writeJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(tmp, filePath);
}

export class FileInterviewRepository extends MemoryInterviewRepository {
  constructor({ records = [], persist } = {}) {
    super(records);
    this.persist = persist;
  }

  async create(record) {
    const created = await super.create(record);
    this.persist?.();
    return created;
  }

  async saveScorecard(id, tenantId, scorecard) {
    const updated = await super.saveScorecard(id, tenantId, scorecard);
    if (updated) this.persist?.();
    return updated;
  }

  async saveConsent(id, tenantId, consent) {
    const updated = await super.saveConsent(id, tenantId, consent);
    if (updated) this.persist?.();
    return updated;
  }

  async replace(record) {
    const updated = await super.replace(record);
    if (updated) this.persist?.();
    return updated;
  }

  snapshot() {
    return [...this.records.values()];
  }
}

export function createPersistence({ mode, filePath, seedInterviews = [] } = {}) {
  const resolvedMode = mode || (process.env.NODE_ENV === 'test' ? 'memory' : (process.env.SIGNALROOM_PERSISTENCE || 'file'));
  const path = filePath || defaultPath();
  const loaded = resolvedMode === 'file' ? readJson(path) : null;

  const state = {
    interviews: loaded?.interviews || seedInterviews,
    audit: loaded?.audit || [],
    idempotency: loaded?.idempotency || {},
    revokedJti: loaded?.revokedJti || [],
    organizations: loaded?.organizations || [northstarOrganization],
    product: loaded?.product || { schedules: [], invitations: [], notificationJobs: [] },
  };

  const persist = () => {
    if (resolvedMode !== 'file') return;
    writeJson(path, {
      interviews: interviews.snapshot(),
      audit: auditLedger.snapshot(),
      idempotency: Object.fromEntries(idempotency),
      revokedJti: [...revokedJti],
      organizations: orgs,
      product: productState,
    });
  };

  const interviews = new FileInterviewRepository({
    records: state.interviews,
    persist: resolvedMode === 'file' ? persist : undefined,
  });

  const auditLedger = new AuditLedger({
    entries: state.audit,
    persist: resolvedMode === 'file' ? persist : undefined,
  });

  const idempotency = new Map(Object.entries(state.idempotency));
  const originalSet = idempotency.set.bind(idempotency);
  idempotency.set = (key, value) => {
    const result = originalSet(key, value);
    persist();
    return result;
  };

  const revokedJti = new Set(state.revokedJti);
  const orgs = state.organizations;
  const productState = {
    schedules: state.product?.schedules || [],
    invitations: state.product?.invitations || [],
    notificationJobs: state.product?.notificationJobs || [],
  };

  return {
    mode: resolvedMode,
    filePath: path,
    interviews,
    auditLedger,
    idempotency,
    revokedJti,
    orgs,
    persist,
    revoke(jti) {
      if (!jti) return;
      revokedJti.add(jti);
      persist();
    },
    isRevoked(jti) {
      return Boolean(jti) && revokedJti.has(jti);
    },
    listOrganizations(tenantId) {
      return orgs.filter((org) => !tenantId || org.tenantId === tenantId);
    },
    upsertOrganization(org) {
      const index = orgs.findIndex((item) => item.id === org.id && item.tenantId === org.tenantId);
      if (index >= 0) orgs[index] = org;
      else orgs.push(org);
      persist();
      return org;
    },
    productState,
    saveProduct(next) {
      productState.schedules = next.schedules || [];
      productState.invitations = next.invitations || [];
      productState.notificationJobs = next.notificationJobs || [];
      persist();
    },
  };
}

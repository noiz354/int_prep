/** Repository seam: use MemoryInterviewRepository for the runnable demo and
 * provide a Mongo-compatible collection in production. */
export class MemoryInterviewRepository {
  constructor(seed = []) {
    this.records = new Map(seed.map((record) => [record.id, structuredClone(record)]));
  }

  async list(tenantId) {
    return [...this.records.values()].filter((record) => record.tenantId === tenantId);
  }

  async findById(id, tenantId) {
    const record = this.records.get(id);
    return record && record.tenantId === tenantId ? structuredClone(record) : null;
  }

  async create(record) {
    this.records.set(record.id, structuredClone(record));
    return structuredClone(record);
  }

  async saveScorecard(id, tenantId, scorecard) {
    const record = await this.findById(id, tenantId);
    if (!record) return null;
    record.scorecards = [...(record.scorecards || []), scorecard];
    record.updatedAt = new Date().toISOString();
    this.records.set(id, record);
    return structuredClone(record);
  }

  async saveConsent(id, tenantId, consent) {
    const record = await this.findById(id, tenantId);
    if (!record) return null;
    record.consentHistory = [...(record.consentHistory || []), consent];
    record.updatedAt = new Date().toISOString();
    this.records.set(id, record);
    return structuredClone(record);
  }

  async replace(record) {
    if (!record?.id || !record?.tenantId || !this.records.has(record.id)) return null;
    const next = { ...structuredClone(record), updatedAt: new Date().toISOString() };
    this.records.set(next.id, next);
    return structuredClone(next);
  }
}

export class MongoInterviewRepository {
  constructor(collection) {
    this.collection = collection;
  }

  list(tenantId) { return this.collection.find({ tenantId }).sort({ scheduledAt: 1 }).toArray(); }
  findById(id, tenantId) { return this.collection.findOne({ id, tenantId }); }
  create(record) { return this.collection.insertOne(record).then(() => record); }
  saveScorecard(id, tenantId, scorecard) {
    return this.collection.findOneAndUpdate(
      { id, tenantId },
      { $push: { scorecards: scorecard }, $set: { updatedAt: new Date().toISOString() } },
      { returnDocument: 'after' },
    ).then((result) => result?.value || null);
  }

  saveConsent(id, tenantId, consent) {
    return this.collection.findOneAndUpdate(
      { id, tenantId },
      { $push: { consentHistory: consent }, $set: { updatedAt: new Date().toISOString() } },
      { returnDocument: 'after' },
    ).then((result) => result?.value || null);
  }

  replace(record) {
    return this.collection.findOneAndReplace(
      { id: record.id, tenantId: record.tenantId },
      { ...record, updatedAt: new Date().toISOString() },
      { returnDocument: 'after' },
    ).then((result) => result?.value || null);
  }
}

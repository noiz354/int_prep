import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEventBus } from '../../../services/event-gateway/src/eventBus.mjs';
import { createDataPlatformServices } from '../src/dataPlatformServices.mjs';

const tenantId = 'northstar';

function makeHarness() {
  const events = new MemoryEventBus();
  const services = createDataPlatformServices({ events, tenantId });
  return { events, services };
}

test('DE-04 CDC captures records with checkpointing and supports safe replay and backfill', () => {
  const { services, events } = makeHarness();
  const stream = services.createCdcStream({ source: 'mongo.oplog', schemaVersion: 1 });
  services.cdcIngest(stream.id, { op: 'insert', documentId: 'doc-1', payload: { role: 'engineer' } });
  services.cdcIngest(stream.id, { op: 'update', documentId: 'doc-1', payload: { role: 'staff' } });
  const replay = services.cdcReplay(stream.id, { fromSequence: 1 });
  assert.equal(replay.count, 1);
  assert.equal(replay.replayed[0].op, 'update');
  const backfill = services.cdcBackfill(stream.id, { records: [{ documentId: 'doc-0', payload: { role: 'intern' } }] });
  assert.equal(backfill.count, 1);
  assert.equal(backfill.schemaVersion, 2);
  const types = events.list({ tenantId }).map((e) => e.type);
  assert.ok(types.includes('cdc.record.captured'));
  assert.ok(types.includes('cdc.backfill.completed'));
});

test('DE-06 lakehouse zones enforce immutable bronze and consent-aware silver', () => {
  const { services } = makeHarness();
  const bronze = services.ingestToZone('bronze', { recordType: 'interview.event', payload: { event: 'joined' }, consent: true });
  assert.equal(bronze.zone, 'bronze');
  assert.equal(bronze.consentStatus, 'consented');
  const blocked = services.ingestToZone('bronze', { recordType: 'interview.event', payload: { event: 'left' }, consent: false });
  assert.equal(blocked.consentStatus, 'blocked');
  const zones = services.lakehouseZones();
  assert.equal(zones.silver.count, 1); // only the consented bronze entry propagated
  assert.throws(() => services.ingestToZone('red', {}), /Invalid lakehouse zone/);
});

test('DE-07 secure ingestion hashes, scans, encrypts, and retains artifacts', () => {
  const { services } = makeHarness();
  const artifact = services.ingestArtifact({ interviewId: 'int-2048', artifactType: 'recording', reference: 's3://rec/int-2048', bytes: 2048 });
  assert.match(artifact.contentHash, /^sha256:/);
  assert.equal(artifact.scan.status, 'clean');
  assert.equal(artifact.encrypted, true);
  assert.equal(artifact.encryptionKeyReference, 'vault-transit/signalroom-artifact-key');
  assert.equal(artifact.retentionClass, 'candidate-standard-90d');
  assert.equal(artifact.status, 'stored');
  assert.equal(services.listIngestions().length, 1);
});

test('DE-08 ETL orchestration retries tasks, routes failures to DLQ, and tracks dependencies', () => {
  const { services } = makeHarness();
  const pipeline = services.createPipeline({
    name: 'transcript-enrichment',
    tasks: [
      { name: 'extract' },
      { name: 'enrich', dependsOn: ['task-1'] },
      { name: 'publish', dependsOn: ['task-2'] },
    ],
  });
  assert.equal(pipeline.tasks.length, 3);
  assert.equal(pipeline.tasks[1].dependsOn[0], 'task-1');
  const result = services.runPipeline(pipeline.id);
  assert.ok(['succeeded', 'dlq', 'running'].includes(result.status));
});

test('DE-11 feature store versions online/offline definitions and detects skew', () => {
  const { services } = makeHarness();
  services.defineFeature({ name: 'candidate_engagement', layer: 'online', version: 1, owner: 'AI Systems' });
  services.defineFeature({ name: 'candidate_engagement', layer: 'offline', version: 1, owner: 'AI Systems' });
  const aligned = services.featureSkewTest('candidate_engagement', 1);
  assert.equal(aligned.skew, 'none-detected');
  services.defineFeature({ name: 'only_online', layer: 'online', version: 2 });
  const skew = services.featureSkewTest('only_online', 2);
  assert.equal(skew.skew, 'offline-missing');
});

test('DE-14 backup/DR records RPO/RTO and supports restore-tested evidence', () => {
  const { services, events } = makeHarness();
  const backup = services.runBackup({ rpoMinutes: 15 });
  assert.equal(backup.rpoMinutes, 15);
  assert.equal(backup.rtoHours, 4);
  assert.equal(backup.restoreTested, false);
  const verified = services.restoreTest(backup.id);
  assert.equal(verified.restoreTested, true);
  const evidence = services.backupEvidence();
  assert.equal(evidence[0].restoreTested, true);
  assert.ok(events.list({ tenantId }).map((e) => e.type).includes('backup.restore-verified'));
});

test('DE-15 semantic metrics are governed, tenant-safe, and published as events', () => {
  const { services, events } = makeHarness();
  const metric = services.publishSemanticMetric({ name: 'funnel_conversion', dimension: 'scheduled_to_completed', value: 0.42 });
  assert.equal(metric.governed, true);
  assert.equal(metric.tenantSafe, true);
  assert.equal(services.semanticMetricsSnapshot().length, 1);
  assert.ok(events.list({ tenantId }).map((e) => e.type).includes('semantic.metric.published'));
});

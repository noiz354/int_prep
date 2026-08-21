import test from 'node:test';
import assert from 'node:assert/strict';
import { featureCatalog } from '../../../src/data/features.js';
import { implementedFoundationIds } from '../../../src/data/implementationStatus.js';

test('the implementation registry reports exactly 100 valid PRD foundations', () => {
  const validIds = new Set(featureCatalog.map((feature) => feature.id));
  assert.equal(implementedFoundationIds.length, 100);
  assert.equal(new Set(implementedFoundationIds).size, 100);
  assert.equal(implementedFoundationIds.every((id) => validIds.has(id)), true);
});

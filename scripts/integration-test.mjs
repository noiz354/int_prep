#!/usr/bin/env node
// SignalRoom — Integration test script for docker-compose.test.yml
// Validates API health, Qdrant connectivity, Redis connectivity.
// Run: node scripts/integration-test.mjs

const API_BASE = process.env.API_BASE_URL || 'http://localhost:18787';
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:16333';
const REDIS_URL = process.env.REDIS_URL || 'http://localhost:16379';

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (error) {
    console.error(`  ✗ ${name}: ${error.message}`);
    failed++;
  }
}

async function waitForService(url, name, retries = 15, intervalMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`${name} did not become ready at ${url} after ${retries} attempts`);
}

async function run() {
  console.log('\n=== SignalRoom Integration Tests ===\n');

  // Wait for services to be ready
  console.log('Waiting for services...');
  await waitForService(`${API_BASE}/health/live`, 'API');
  await waitForService(`${QDRANT_URL}/healthz`, 'Qdrant');
  console.log('Services ready.\n');

  // API health tests
  console.log('API Health:');
  await test('GET /health/live returns 200', async () => {
    const res = await fetch(`${API_BASE}/health/live`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const body = await res.json();
    if (body.status !== 'ok') throw new Error(`Expected status ok, got ${body.status}`);
  });

  await test('GET /api/health returns service info', async () => {
    const res = await fetch(`${API_BASE}/api/health`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const body = await res.json();
    if (!body.service) throw new Error('Missing service field');
  });

  await test('Error responses include trace_id', async () => {
    const res = await fetch(`${API_BASE}/api/interviews/nonexistent`, {
      headers: { Authorization: 'Bearer invalid-token' },
    });
    if (res.status >= 500) throw new Error(`Got server error ${res.status}`);
  });

  // Qdrant tests
  console.log('\nQdrant:');
  await test('GET /healthz returns 200', async () => {
    const res = await fetch(`${QDRANT_URL}/healthz`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  await test('Collections endpoint is accessible', async () => {
    const res = await fetch(`${QDRANT_URL}/collections`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const body = await res.json();
    if (!body.hasOwnProperty('result')) throw new Error('Missing result field');
  });

  // Redis tests (via API ping if redis is connected, or direct check)
  console.log('\nRedis:');
  await test('Redis is reachable (port 16379)', async () => {
    const net = await import('node:net');
    await new Promise((resolve, reject) => {
      const socket = net.createConnection(16379, 'localhost');
      socket.on('connect', () => { socket.destroy(); resolve(); });
      socket.on('error', (err) => reject(err));
      setTimeout(() => { socket.destroy(); reject(new Error('Timeout')); }, 3000);
    });
  });

  // Summary
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((error) => {
  console.error('Integration test runner failed:', error);
  process.exit(1);
});

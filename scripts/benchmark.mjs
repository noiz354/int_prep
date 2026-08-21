#!/usr/bin/env node
// SignalRoom — Benchmark Suite
// Measures RAG query latency (P50/P90/P99), WebRTC join time, and recording upload speed.
// Run: npm run benchmark
//
// Requires: API running at API_BASE_URL (default http://localhost:8787)

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_BASE = process.env.API_BASE_URL || 'http://localhost:8787';
const ITERATIONS = Number(process.env.BENCH_ITERATIONS || 100);
const OUTPUT_FILE = join(__dirname, '..', 'bench-results.json');

function percentile(sorted, p) {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function stats(latencies) {
  const sorted = [...latencies].sort((a, b) => a - b);
  return {
    count: sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: sorted.reduce((a, b) => a + b, 0) / sorted.length,
    p50: percentile(sorted, 50),
    p90: percentile(sorted, 90),
    p99: percentile(sorted, 99),
  };
}

async function getAuthToken() {
  const res = await fetch(`${API_BASE}/api/auth/demo-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'bench-user', email: 'bench@signalroom.test', roles: ['admin'] }),
  });
  const body = await res.json();
  return body?.data?.token;
}

async function measure(fn) {
  const start = performance.now();
  await fn();
  return performance.now() - start;
}

// ── RAG Benchmark ──────────────────────────────────────────────────
async function benchmarkRAG(token) {
  console.log(`\n[RAG] Running ${ITERATIONS} AI follow-up queries...`);
  const latencies = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const latency = await measure(async () => {
      const res = await fetch(`${API_BASE}/api/ai/follow-up`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Idempotency-Key': `bench-rag-${Date.now()}-${i}`,
        },
        body: JSON.stringify({
          interviewId: 'int-2048',
          transcript: 'Candidate demonstrated strong React knowledge with hooks and state management patterns.',
          uncovered: ['system-design', 'testing-strategy'],
        }),
      });
      if (!res.ok) throw new Error(`RAG query failed: ${res.status}`);
    });
    latencies.push(latency);
  }

  const result = stats(latencies);
  console.log(`  P50: ${result.p50.toFixed(1)}ms  P90: ${result.p90.toFixed(1)}ms  P99: ${result.p99.toFixed(1)}ms  Mean: ${result.mean.toFixed(1)}ms`);
  return { name: 'RAG Query Latency', ...result, unit: 'ms' };
}

// ── WebRTC Join Benchmark ──────────────────────────────────────────
async function benchmarkWebRTCJoin(token) {
  console.log(`\n[WebRTC] Measuring room join time (${ITERATIONS} iterations)...`);
  const latencies = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const latency = await measure(async () => {
      const res = await fetch(`${API_BASE}/api/media/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Idempotency-Key': `bench-webrtc-${Date.now()}-${i}`,
        },
        body: JSON.stringify({
          interviewId: 'int-2048',
          region: 'ap-southeast-1',
        }),
      });
      if (!res.ok) throw new Error(`WebRTC join failed: ${res.status}`);
    });
    latencies.push(latency);
  }

  const result = stats(latencies);
  console.log(`  P50: ${result.p50.toFixed(1)}ms  P90: ${result.p90.toFixed(1)}ms  P99: ${result.p99.toFixed(1)}ms  Mean: ${result.mean.toFixed(1)}ms`);
  return { name: 'WebRTC Join Time', ...result, unit: 'ms' };
}

// ── Recording Upload Benchmark ─────────────────────────────────────
async function benchmarkRecordingUpload(token) {
  console.log(`\n[Recording] Measuring upload speed (${Math.min(10, ITERATIONS)} iterations)...`);
  const iterations = Math.min(10, ITERATIONS);
  const latencies = [];
  const chunkSizes = [64 * 1024, 256 * 1024, 1024 * 1024]; // 64KB, 256KB, 1MB

  // First start a recording
  const startRes = await fetch(`${API_BASE}/api/media/recordings/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'Idempotency-Key': `bench-rec-start-${Date.now()}`,
    },
    body: JSON.stringify({ interviewId: 'int-2048' }),
  });
  const startBody = await startRes.json();
  const recordingId = startBody?.data?.recording?.id;

  if (!recordingId) {
    console.log('  Skipped: could not start recording');
    return { name: 'Recording Upload Speed', count: 0, unit: 'bytes/s' };
  }

  for (let i = 0; i < iterations; i++) {
    const chunkSize = chunkSizes[i % chunkSizes.length];

    const latency = await measure(async () => {
      const res = await fetch(`${API_BASE}/api/media/recordings/${recordingId}/chunk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ chunkIndex: i, size: chunkSize }),
      });
      if (!res.ok) throw new Error(`Recording chunk failed: ${res.status}`);
    });

    const throughput = chunkSize / (latency / 1000); // bytes/s
    latencies.push(throughput);
  }

  const result = stats(latencies);
  const mbps = (result.mean / (1024 * 1024)).toFixed(2);
  console.log(`  Mean throughput: ${mbps} MB/s  P50: ${(result.p50 / 1024 / 1024).toFixed(2)} MB/s  P90: ${(result.p90 / 1024 / 1024).toFixed(2)} MB/s`);
  return { name: 'Recording Upload Speed', ...result, unit: 'bytes/s' };
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  console.log('=== SignalRoom Benchmark Suite ===');
  console.log(`API: ${API_BASE}  Iterations: ${ITERATIONS}`);

  const start = performance.now();
  const token = await getAuthToken();
  if (!token) {
    console.error('Failed to get auth token. Is the API running with ALLOW_DEMO_LOGIN=true?');
    process.exit(1);
  }
  console.log('Authenticated successfully.');

  const results = [];
  results.push(await benchmarkRAG(token));
  results.push(await benchmarkWebRTCJoin(token));
  results.push(await benchmarkRecordingUpload(token));

  const output = {
    timestamp: new Date().toISOString(),
    apiBase: API_BASE,
    iterations: ITERATIONS,
    totalDurationMs: Math.round(performance.now() - start),
    benchmarks: results,
  };

  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\nResults saved to ${OUTPUT_FILE}`);
  console.log(`Total benchmark duration: ${output.totalDurationMs}ms\n`);
}

main().catch((error) => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});

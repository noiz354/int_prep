#!/usr/bin/env node
/**
 * Boot the human-usable local path in one command (<15 minutes after npm install):
 * main API + Vite (VITE_USE_API=true) and, unless START_READY_VAULT=false,
 * Ready + Vault APIs/web.
 *
 * This is not production. See docs/USER-RUNBOOK.md and README.md.
 */
import { spawn } from 'node:child_process';

const children = [];
const startReadyVault = process.env.START_READY_VAULT !== 'false';

function run(label, command, args, extraEnv = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  });
  child.on('exit', (code, signal) => {
    if (signal) return;
    if (code !== 0 && code !== null) {
      console.error(`[start:usable] ${label} exited with code ${code}`);
    }
  });
  children.push(child);
}

function shutdown(signal) {
  for (const child of children) {
    try { child.kill(signal); } catch { /* already gone */ }
  }
}

process.on('SIGINT', () => { shutdown('SIGINT'); process.exit(130); });
process.on('SIGTERM', () => { shutdown('SIGTERM'); process.exit(143); });

console.log(`
SignalRoom local usable path  (NOT production)
  1. Open the Vite URL printed below (port 5190).
  2. Sign in with a labelled demo identity (Maya = talent ops, Alex = candidate).
  3. Create an interview — it persists in data/signalroom-store.json.
  4. Ready :5193 and Vault :5191 use Alex. Gmail/payments/SFU stay blocked.

  Interview API  0.0.0.0:8787
  Interview web  0.0.0.0:5190   VITE_USE_API=true  (relative /api)
${startReadyVault ? `  Ready API      0.0.0.0:8790   Ready web :5193
  Vault API      0.0.0.0:8792   Vault web :5191
` : '  Ready/Vault    skipped (START_READY_VAULT=false)\n'}  Docs           docs/USER-RUNBOOK.md · docs/UAT-EVIDENCE.md

Ctrl+C stops all processes.
`);

run('api', 'node', ['apps/api/src/server.js']);
run('web', 'npx', ['vite', '--host', '0.0.0.0'], { VITE_USE_API: 'true' });

if (startReadyVault) {
  run('ready-api', 'npm', ['--prefix', 'services/candidate-readiness-api', 'run', 'dev']);
  run('ready-web', 'npm', ['--prefix', 'apps/candidate-readiness-web', 'run', 'dev'], { VITE_USE_API: 'true' });
  run('vault-api', 'npm', ['--prefix', 'services/career-vault-api', 'run', 'dev']);
  run('vault-web', 'npm', ['--prefix', 'apps/career-vault-web', 'run', 'dev'], { VITE_USE_API: 'true' });
}

#!/usr/bin/env node
/**
 * Boot the human-usable local path for the main interview product:
 * Express API + Vite with VITE_USE_API=true (relative /api proxy).
 *
 * Also starts Ready + Vault APIs/web when START_READY_VAULT is not false.
 * See docs/USER-RUNBOOK.md.
 */
import { spawn } from 'node:child_process';

const children = [];

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
SignalRoom local usable path
  API        http://0.0.0.0:8787
  Web        Vite on port 5190  (VITE_USE_API=true)
  Ready API  :8790   Ready web :5193
  Vault API  :8792   Vault web :5191
  Auth       labelled demo JWT (Alex for Ready/Vault)
  Docs       docs/USER-RUNBOOK.md

Ctrl+C stops all processes. START_READY_VAULT=false skips Ready/Vault.
`);

run('api', 'node', ['apps/api/src/server.js']);
run('web', 'npx', ['vite', '--host', '0.0.0.0'], { VITE_USE_API: 'true' });

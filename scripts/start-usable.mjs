#!/usr/bin/env node
/**
 * Boot the human-usable local path for the main interview product:
 * Express API + Vite with VITE_USE_API=true (relative /api proxy).
 *
 * Does not start Docker providers, OIDC, Mongo, or the Ready/Vault/RTC apps.
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
  API     http://0.0.0.0:8787
  Web     Vite on port 5190  (VITE_USE_API=true)
  Auth    demo JWT still default until Phase U1
  Docs    docs/USER-RUNBOOK.md

Ctrl+C stops both processes.
`);

run('api', 'node', ['apps/api/src/server.js']);
run('web', 'npx', ['vite', '--host', '0.0.0.0'], { VITE_USE_API: 'true' });

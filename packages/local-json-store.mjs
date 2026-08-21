import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function createLocalJsonStore({ filePath, empty = {} } = {}) {
  const memory = process.env.NODE_ENV === 'test' || process.env.SIGNALROOM_PERSISTENCE === 'memory';
  const path = filePath ? resolve(process.cwd(), filePath) : null;

  function load() {
    if (memory || !path || !existsSync(path)) return structuredClone(empty);
    try {
      return { ...empty, ...JSON.parse(readFileSync(path, 'utf8')) };
    } catch {
      return structuredClone(empty);
    }
  }

  function save(state) {
    if (memory || !path) return;
    mkdirSync(dirname(path), { recursive: true });
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`);
    renameSync(tmp, path);
  }

  return { mode: memory ? 'memory' : 'file', filePath: path, load, save };
}

export function mapFromEntries(entries = []) {
  return new Map(entries);
}

export function mapToEntries(map) {
  return [...map.entries()];
}

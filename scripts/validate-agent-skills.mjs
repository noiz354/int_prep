#!/usr/bin/env node
/**
 * Validates the project-local coding-agent skills under `.agents/skills/`
 * against the Addy Osmani agent-skills anatomy:
 *   - every skill directory contains a SKILL.md
 *   - YAML frontmatter with a `name:` (lowercase-hyphen slug) and a
 *     non-placeholder `description:`
 *   - the frontmatter `name` matches its directory name
 *   - names are unique across the pack
 *   - a top-level `#` heading follows the frontmatter
 *
 * Dependency-free so it runs before `npm install`. Exit code 0 on pass,
 * 1 on any failure.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const skillsDir = join(root, '.agents', 'skills');

const PLACEHOLDERS = ['tbd', 'todo', 'lorem', 'placeholder', 'coming soon', 'xxx'];

function parseFrontmatter(content) {
  if (!content.startsWith('---')) return null;
  const end = content.indexOf('\n---', 3);
  if (end === -1) return null;
  const raw = content.slice(3, end);
  const fields = {};
  for (const line of raw.split('\n')) {
    const match = /^(\w+):\s*(.+)$/.exec(line.trim());
    if (match) fields[match[1]] = match[2].trim();
  }
  return { fields, bodyStart: end + 4 };
}

function slugMatches(slug) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

function isValidDescription(description) {
  if (!description || description.length < 20) return false;
  const lower = description.toLowerCase();
  return !PLACEHOLDERS.some((word) => lower.includes(word));
}

function main() {
  if (!existsSync(skillsDir)) {
    console.error(`FAIL  .agents/skills/ does not exist (${skillsDir})`);
    process.exitCode = 1;
    return;
  }

  const entries = readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  if (entries.length === 0) {
    console.error('FAIL  no skill directories found under .agents/skills/');
    process.exitCode = 1;
    return;
  }

  const seenNames = new Set();
  let failures = 0;
  let warnings = 0;

  for (const entry of entries) {
    const skillPath = join(skillsDir, entry.name);
    const skillFile = join(skillPath, 'SKILL.md');
    const problems = [];

    if (!existsSync(skillFile)) {
      problems.push('SKILL.md missing');
    } else {
      const content = readFileSync(skillFile, 'utf8');
      const parsed = parseFrontmatter(content);
      if (!parsed) {
        problems.push('YAML frontmatter missing or malformed');
      } else {
        const { fields } = parsed;
        if (!fields.name) {
          problems.push('frontmatter `name:` missing');
        } else {
          if (fields.name !== entry.name) {
            problems.push(`frontmatter name "${fields.name}" does not match directory "${entry.name}"`);
          }
          if (!slugMatches(fields.name)) {
            problems.push(`name "${fields.name}" is not a lowercase-hyphen slug`);
          }
          if (seenNames.has(fields.name)) {
            problems.push(`duplicate skill name "${fields.name}"`);
          }
          seenNames.add(fields.name);
        }
        if (!fields.description) {
          problems.push('frontmatter `description:` missing');
        } else if (!isValidDescription(fields.description)) {
          problems.push('description is too short or looks like a placeholder');
        }
        const body = content.slice(parsed.bodyStart).trim();
        if (!/^#\s+\S+/m.test(body)) {
          problems.push('no top-level `#` heading after frontmatter');
        }
      }
    }

    if (problems.length === 0) {
      console.log(`ok    ${entry.name}`);
    } else {
      failures += 1;
      console.log(`FAIL  ${entry.name}`);
      for (const problem of problems) {
        console.log(`      - ${problem}`);
      }
    }
  }

  const discoveryTargets = [
    ['.claude', 'skills'],
    ['.github', 'skills'],
    ['.cursor', 'rules'],
  ];
  for (const [agentDir, sub] of discoveryTargets) {
    if (!existsSync(join(root, agentDir, sub))) {
      warnings += 1;
      console.warn(`warn  discovery link ${agentDir}/${sub}/ not present (AGENTS.md references it)`);
    }
  }

  const total = entries.length;
  console.log('');
  if (failures === 0) {
    console.log(`${total} skills validated`);
  } else {
    console.log(`${total - failures}/${total} skills valid, ${failures} failed`);
  }
  if (warnings > 0) {
    console.log(`${warnings} discovery-link warning(s)`);
  }
  process.exitCode = failures === 0 ? 0 : 1;
}

main();

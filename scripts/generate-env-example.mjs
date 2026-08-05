#!/usr/bin/env node
/**
 * Generate .env.example from the env schema — or verify it is in sync.
 *
 *   npm run env:example   → rewrite .env.example from src/config/envSchema.js
 *   npm run env:check     → exit 1 if .env.example differs from the schema
 *
 * The schema is the single source of truth for every env var the repo reads;
 * .env.example is build output. CI runs the check so the two cannot drift.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENV_SECTIONS, FILE_HEADER, FILE_FOOTER } from '../src/config/envSchema.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(repoRoot, '.env.example');

const BANNER = '# ==========================================';

/** Render the schema to the full .env.example text. */
function render() {
  const lines = [...FILE_HEADER, ''];
  for (const section of ENV_SECTIONS) {
    const vars = section.vars.filter((v) => v.emit !== false);
    if (vars.length === 0) continue;
    lines.push(BANNER, `# ${section.title}`, BANNER);
    if (section.comment) lines.push(...section.comment);
    lines.push('');
    vars.forEach((spec, i) => {
      if (spec.purpose && i > 0) lines.push('');
      if (spec.purpose) {
        lines.push(...spec.purpose.split('\n').map((l) => `# ${l}`));
      }
      const assignment = `${spec.name}=${spec.example ?? ''}`;
      lines.push(spec.commentedOut ? `# ${assignment}` : assignment);
    });
    if (section.footer) lines.push('', ...section.footer);
    lines.push('');
  }
  lines.push(...FILE_FOOTER);
  return lines.join('\n') + '\n';
}

const expected = render();
const checkMode = process.argv.includes('--check');

if (checkMode) {
  let actual = null;
  try {
    actual = readFileSync(target, 'utf8');
  } catch {
    // fall through — missing file is drift
  }
  if (actual !== expected) {
    console.error(
      '.env.example is out of sync with src/config/envSchema.js.\n' +
        'Run `npm run env:example` and commit the result.',
    );
    process.exit(1);
  }
  console.log('.env.example is in sync with the env schema.');
} else {
  writeFileSync(target, expected);
  console.log(`Wrote ${target} from src/config/envSchema.js`);
}

/**
 * Human review CLI for the style-ontology proposal queue (ADR-0011).
 *
 * Nothing enters data/style-ontology.json except through these commands,
 * run by a human:
 *
 *   node scripts/propose-ontology-candidates.mjs --list
 *   node scripts/propose-ontology-candidates.mjs --approve <term>
 *   node scripts/propose-ontology-candidates.mjs --merge <term> --into <tag-id>
 *   node scripts/propose-ontology-candidates.mjs --reject <term>
 *
 * --approve promotes a pending proposal to a new tag (id = normalized term).
 * --merge adds it as an alias of an existing tag — the "fineline" vs
 * "fine-line" collapse is a human judgment every time.
 * --reject keeps the entry as rejected so re-harvests never re-queue it.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import {
  approveTerm,
  loadJson,
  mergeTerm,
  rejectTerm,
  saveJson,
} from './lib/ontology.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ONTOLOGY_PATH = path.join(ROOT, 'data', 'style-ontology.json');
const PROPOSALS_PATH = path.join(ROOT, 'data', 'ontology-proposals.json');

/** Parse CLI flags into exactly one action. Throws on ambiguous/invalid usage. */
export function parseArgs(argv) {
  const opts = { list: false, approve: null, merge: null, into: null, reject: null };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--list':
        opts.list = true;
        break;
      case '--approve':
        opts.approve = argv[++i];
        break;
      case '--merge':
        opts.merge = argv[++i];
        break;
      case '--into':
        opts.into = argv[++i];
        break;
      case '--reject':
        opts.reject = argv[++i];
        break;
      default:
        throw new Error(`Unknown argument: ${argv[i]}`);
    }
  }
  const actions = [opts.list, opts.approve, opts.merge, opts.reject].filter(Boolean);
  if (actions.length !== 1) {
    throw new Error('Usage: --list | --approve <term> | --merge <term> --into <tag-id> | --reject <term>');
  }
  if (opts.merge && !opts.into) {
    throw new Error('--merge requires --into <tag-id>');
  }
  if (opts.into && !opts.merge) {
    throw new Error('--into only makes sense with --merge <term>');
  }
  return opts;
}

function listPending(proposals) {
  const pending = proposals
    .filter((p) => p.status === 'pending')
    .sort((a, b) => b.count - a.count);
  if (pending.length === 0) {
    console.log('No pending proposals.');
    return;
  }
  console.log(`${pending.length} pending proposal(s):`);
  for (const p of pending) {
    console.log(`  ${p.normalized}  (term: "${p.term}", count: ${p.count}, source: ${p.source})`);
  }
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const ontology = loadJson(ONTOLOGY_PATH);
  const proposals = loadJson(PROPOSALS_PATH, []);
  const today = new Date().toISOString().slice(0, 10);

  if (opts.list) {
    listPending(proposals);
    return;
  }

  if (opts.approve) {
    const result = approveTerm(ontology, proposals, opts.approve, today);
    saveJson(ONTOLOGY_PATH, result.ontology);
    saveJson(PROPOSALS_PATH, result.proposals);
    console.log(`Approved "${opts.approve}" as new tag "${result.tag.id}" (ontology v${result.ontology.version}).`);
    return;
  }

  if (opts.merge) {
    const result = mergeTerm(ontology, proposals, opts.merge, opts.into, today);
    saveJson(ONTOLOGY_PATH, result.ontology);
    saveJson(PROPOSALS_PATH, result.proposals);
    console.log(`Merged "${opts.merge}" into "${opts.into}" as an alias (ontology v${result.ontology.version}).`);
    return;
  }

  const result = rejectTerm(proposals, opts.reject);
  saveJson(PROPOSALS_PATH, result.proposals);
  console.log(`Rejected "${opts.reject}".`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (err) {
    console.error(`[propose-ontology-candidates] ${err.message}`);
    process.exit(1);
  }
}

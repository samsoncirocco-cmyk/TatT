import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];

const currentDocs = [
  'README.md',
  'CONTEXT.md',
  'DEMO.md',
  'docs/README.md',
  'docs/product/current-product.md',
  'docs/product/customer-journeys.md',
  'docs/product/glossary.md',
  'docs/product/pitch-facts.md',
  'docs/architecture/current-architecture.md',
  'docs/status/known-contradictions.md',
  'docs/status/document-classification.md',
  'docs/operations/documentation-maintenance.md',
  'docs/SITE_MAP.md',
];

const highRiskLegacyDocs = [
  'docs/QUICK_START_GCP.md',
  'docs/API_V1_DOCUMENTATION.md',
  'docs/API_REFERENCE.md',
  'docs/PR_REVIEW_ACCEPTANCE_CRITERIA.md',
  'docs/PR_DESCRIPTION.md',
  'docs/brand/tatttester-landing-copy.md',
  'docs/brand/two-door-brand-guide.md',
  'docs/brand/image2ink-landing-copy.md',
  'YC-DEMO-SCRIPT.md',
];

const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

for (const relativePath of [...currentDocs, 'docs/status/features.yaml']) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    errors.push(`missing canonical document: ${relativePath}`);
  }
}

for (const relativePath of currentDocs) {
  if (!fs.existsSync(path.join(root, relativePath))) continue;
  const markdown = read(relativePath);
  const links = markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/g);
  for (const [, target] of links) {
    if (
      target.startsWith('#') ||
      target.includes('://') ||
      target.startsWith('mailto:')
    ) {
      continue;
    }
    const localTarget = target.split('#')[0];
    const resolved = path.resolve(root, path.dirname(relativePath), localTarget);
    if (!fs.existsSync(resolved)) {
      errors.push(`${relativePath}: broken link ${target}`);
    }
  }
}

for (const relativePath of highRiskLegacyDocs) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    errors.push(`missing classified legacy document: ${relativePath}`);
    continue;
  }
  const opening = read(relativePath).split('\n').slice(0, 8).join('\n');
  if (!opening.includes('Status:')) {
    errors.push(`${relativePath}: missing opening status notice`);
  }
}

const featureLedger = read('docs/status/features.yaml');
const allowedStatuses = new Set([
  'implemented',
  'partial',
  'accepted_not_implemented',
  'implemented_unverified',
  'demo_only',
  'retired',
]);

for (const match of featureLedger.matchAll(/^\s{4}status:\s+(\S+)\s*$/gm)) {
  if (!allowedStatuses.has(match[1])) {
    errors.push(`features.yaml: unknown status ${match[1]}`);
  }
}

for (const block of featureLedger.split(/\n(?=  [a-z][a-z0-9_]+:\n)/)) {
  if (!/^\s{4}status:\s+implemented\s*$/m.test(block)) continue;
  if (!/(?:__tests__\/|\.test\.[a-z]+)/.test(block)) {
    const name = block.match(/^  ([a-z][a-z0-9_]+):/m)?.[1] ?? 'unknown';
    errors.push(`features.yaml: implemented feature ${name} lacks focused test evidence`);
  }
}

for (const match of featureLedger.matchAll(/^\s{6}-\s+((?:src|docs)\/\S+)\s*$/gm)) {
  const evidencePath = match[1];
  if (!fs.existsSync(path.join(root, evidencePath))) {
    errors.push(`features.yaml: missing evidence path ${evidencePath}`);
  }
}

const adrFiles = fs
  .readdirSync(path.join(root, 'docs/adr'))
  .filter((name) => /^\d{4}-.*\.md$/.test(name));
const adrGroups = new Map();
for (const name of adrFiles) {
  const prefix = name.slice(0, 4);
  adrGroups.set(prefix, [...(adrGroups.get(prefix) ?? []), name]);
}

const acceptedDuplicate = new Set([
  '0026-money-in-cents-reject-out-of-range.md',
  '0026-reinstatement-self-signup.md',
]);
for (const [prefix, names] of adrGroups) {
  if (names.length < 2) continue;
  const isKnown0026 =
    prefix === '0026' &&
    names.length === acceptedDuplicate.size &&
    names.every((name) => acceptedDuplicate.has(name));
  if (!isKnown0026) {
    errors.push(`duplicate ADR prefix ${prefix}: ${names.join(', ')}`);
  }
}

if (!/verified_against:\s+[0-9a-f]{7,40}/.test(featureLedger)) {
  errors.push('features.yaml: missing verified_against commit');
}

if (errors.length) {
  console.error('Documentation validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Documentation validation passed (${currentDocs.length} canonical documents, ${highRiskLegacyDocs.length} classified legacy documents).`,
);

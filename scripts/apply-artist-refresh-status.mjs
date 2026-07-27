#!/usr/bin/env node
/**
 * Preview or apply the refresh-state ledger produced by
 * execution/apify_ig_enrich.py.
 *
 * DRY RUN BY DEFAULT. This command writes reachability/freshness properties
 * only. It never changes artist-owned profile fields, ownership, verification,
 * Instagram, payments, or portfolio content.
 *
 * Usage:
 *   node scripts/apply-artist-refresh-status.mjs --ledger /path/refresh-status.json
 *   node scripts/apply-artist-refresh-status.mjs --ledger /path/refresh-status.json \
 *     --execute --confirm APPLY-REFRESH-STATUS
 */

import { readFile } from 'node:fs/promises';
import neo4j from 'neo4j-driver';
import { config } from 'dotenv';
import {
  buildRefreshStatusUpdate,
  executeRefreshStatus,
  planRefreshStatus,
} from './lib/artist-refresh-status.mjs';

config();
config({ path: '.env.local', override: false });

function parseArgs(argv) {
  const opts = { ledger: null, limit: Infinity, execute: false, confirm: null };
  for (let index = 0; index < argv.length; index++) {
    const next = () => argv[++index];
    switch (argv[index]) {
      case '--ledger': opts.ledger = next(); break;
      case '--limit': opts.limit = Math.max(0, Number.parseInt(next(), 10) || 0); break;
      case '--execute': opts.execute = true; break;
      case '--confirm': opts.confirm = next(); break;
      default: break;
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.ledger) {
    throw new Error('--ledger <refresh-status.json> is required');
  }
  const ledger = JSON.parse(await readFile(opts.ledger, 'utf8'));
  const plan = planRefreshStatus(ledger, { limit: opts.limit });

  console.log('artist refresh status plan');
  console.log(`  selected:  ${plan.summary.selected}`);
  console.log(`  active:    ${plan.summary.active}`);
  console.log(`  dead:      ${plan.summary.dead}`);
  console.log(`  transient: ${plan.summary.transient}`);
  console.log(`  stale:     ${plan.summary.stale}`);
  console.log(`  invalid:   ${plan.invalidHandles.length}`);
  for (const entry of plan.entries) {
    console.log(
      `  - @${entry.handle}: ${entry.lastRefreshStatus}, ` +
        `dead=${entry.consecutiveDeadRefreshes}, stale=${entry.stale}`,
    );
  }

  if (!opts.execute) {
    console.log('\nDRY RUN — nothing changed.');
    return;
  }

  const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(
      process.env.NEO4J_USERNAME || process.env.NEO4J_USER,
      process.env.NEO4J_PASSWORD,
    ),
  );
  const session = driver.session(
    process.env.NEO4J_DATABASE ? { database: process.env.NEO4J_DATABASE } : undefined,
  );
  try {
    const result = await executeRefreshStatus(
      {
        async apply(entry) {
          const { query, params } = buildRefreshStatusUpdate(entry);
          const response = await session.executeWrite((transaction) =>
            transaction.run(query, params),
          );
          const rawCount = response.records[0]?.get('matchCount');
          return typeof rawCount?.toNumber === 'function'
            ? rawCount.toNumber()
            : Number(rawCount ?? 0);
        },
      },
      plan,
      { execute: opts.execute, confirm: opts.confirm },
    );
    if (!result.ok) {
      const details = [
        result.missing.length ? `no artist matched: ${result.missing.join(', ')}` : null,
        result.ambiguous?.length
          ? `ambiguous handles: ${result.ambiguous
              .map(({ handle, matchCount }) => `${handle} (${matchCount})`)
              .join(', ')}`
          : null,
      ].filter(Boolean);
      throw new Error(result.error || details.join('; '));
    }
    console.log(`\nAPPLIED ${result.applied} refresh status record(s).`);
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch((error) => {
  console.error(`[apply-artist-refresh-status] ${error.message}`);
  process.exit(1);
});

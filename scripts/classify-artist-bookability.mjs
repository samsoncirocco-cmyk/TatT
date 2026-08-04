/**
 * Probe shop websites and record reachability, so the ADR-0043 bookable tier
 * rests on a contact channel we have actually reached (src/lib/artist-bookability).
 *
 * What it writes, and nothing else:
 *   (:Shop).websiteLive       boolean — did the site answer at the last check
 *   (:Shop).websiteCheckedAt  ISO-8601 string — when we asked
 *
 * Both are new, additive properties. Nothing existing is overwritten and
 * nothing is deleted, so a bad run is fixed by another run. The :Artist node is
 * never touched: the tier is derived at read time from evidence the graph
 * already holds plus this flag, which keeps one source of truth. Denormalizing
 * a `bookable` boolean onto the artist would let it rot the moment a shop's
 * site goes down.
 *
 * SAFETY: dry run by default, matching scripts/import-national-to-neo4j.js. It
 * prints the full tier breakdown and changes nothing until you pass --apply.
 *
 * Usage:
 *   node --env-file=.env.local scripts/classify-artist-bookability.mjs --state AZ
 *   node --env-file=.env.local scripts/classify-artist-bookability.mjs --state AZ --apply
 *   node --env-file=.env.local scripts/classify-artist-bookability.mjs           # all states
 *
 * Requires NEO4J_URI, NEO4J_USERNAME (or NEO4J_USER), NEO4J_PASSWORD.
 */
import neo4j from 'neo4j-driver';

const HTTP_TIMEOUT_MS = 20_000;
const CONCURRENCY = 10;
/** A retry, because one connection reset is not a dead business. */
const ATTEMPTS = 2;
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/125.0 Safari/537.36';

export function parseArgs(argv) {
  const apply = argv.includes('--apply');
  const stateIndex = argv.indexOf('--state');
  let state = null;
  if (stateIndex >= 0) {
    const value = argv[stateIndex + 1];
    if (!value || value.startsWith('--')) {
      throw new Error('--state requires a value');
    }
    state = value.toLowerCase();
  }
  return { apply, state };
}

/**
 * Any 2xx or 3xx means somebody is home. A 403 does not: Cloudflare and
 * storefront hosts return it for a parked or delisted page as readily as for a
 * live one, and this gate is about confidence, not optimism.
 */
export function isLiveStatus(status) {
  return status >= 200 && status < 400;
}

/** Percent for console summaries; empty cohorts print 0.0% instead of NaN%. */
const pct = (num, den) => (den === 0 ? 0 : (num / den) * 100);

const toNumber = (value) =>
  value && typeof value.toNumber === 'function' ? value.toNumber() : value;

async function probe(url) {
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        redirect: 'follow',
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      });
      return { live: isLiveStatus(response.status), detail: String(response.status) };
    } catch (error) {
      if (attempt === ATTEMPTS - 1) return { live: false, detail: error.name };
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
}

const stateFilter = (state) =>
  state
    ? `toLower(trim(coalesce(a.state,''))) IN $stateVariants`
    : 'true';

const stateVariants = (state) => {
  if (!state) return [];
  // Operators pass either the postal code or the full name; graph rows use both.
  if (state === 'az' || state === 'arizona') return ['az', 'arizona'];
  return [state];
};

async function main() {
  const { apply, state } = parseArgs(process.argv.slice(2));
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USERNAME || process.env.NEO4J_USER;
  const password = process.env.NEO4J_PASSWORD;
  if (!uri || !user || !password) {
    throw new Error('NEO4J_URI, NEO4J_USERNAME/NEO4J_USER and NEO4J_PASSWORD are required.');
  }

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const database = process.env.NEO4J_DATABASE || undefined;
  const session = driver.session(database ? { database } : undefined);
  const params = { stateVariants: stateVariants(state) };

  try {
    const shops = await session.run(
      `MATCH (a:Artist)-[:WORKS_AT|HAS_SHOP]->(sh:Shop)
       WHERE ${stateFilter(state)} AND trim(coalesce(sh.website,'')) <> ''
       RETURN DISTINCT sh.placeId AS placeId, sh.website AS website, sh.name AS name
       ORDER BY sh.name`,
      params,
    );
    const rows = shops.records.map((record) => ({
      placeId: record.get('placeId'),
      website: record.get('website'),
      name: record.get('name'),
    }));
    console.log(
      `Probing ${rows.length} distinct shop websites${state ? ` in ${state.toUpperCase()}` : ' (all states)'}…`,
    );

    const results = [];
    for (let i = 0; i < rows.length; i += CONCURRENCY) {
      const batch = rows.slice(i, i + CONCURRENCY);
      results.push(
        ...(await Promise.all(
          batch.map(async (row) => ({ ...row, ...(await probe(row.website)) })),
        )),
      );
      process.stderr.write(`  ${results.length}/${rows.length}\r`);
    }

    const live = results.filter((row) => row.live);
    console.log(
      `\nreachable ${live.length}/${results.length} ` +
        `(${pct(live.length, results.length).toFixed(1)}%)`,
    );
    for (const row of results.filter((r) => !r.live)) {
      console.log(`  unreachable [${row.detail}] ${row.website} — ${row.name}`);
    }

    if (!apply) {
      console.log('\nDRY RUN — nothing written. Re-run with --apply.');
    } else {
      const checkedAt = new Date().toISOString();
      await session.executeWrite(async (tx) => {
        await tx.run(
          `UNWIND $rows AS row
           MATCH (sh:Shop {placeId: row.placeId})
           SET sh.websiteLive = row.live, sh.websiteCheckedAt = $checkedAt`,
          {
            rows: results.map(({ placeId, live }) => ({ placeId, live })),
            checkedAt,
          },
        );
        // Cleared websites are skipped by the probe query, so reset any leftover
        // websiteLive — otherwise a prior true keeps the artist bookable.
        // Unscoped by --state: Shop.website is cleared nationally, and a shop
        // linked only to out-of-filter artists would otherwise keep a stale true.
        await tx.run(
          `MATCH (sh:Shop)
           WHERE trim(coalesce(sh.website,'')) = ''
             AND sh.websiteLive IS NOT NULL
           SET sh.websiteLive = false, sh.websiteCheckedAt = $checkedAt`,
          { checkedAt },
        );
      });
      console.log(`\nWrote websiteLive + websiteCheckedAt=${checkedAt} to ${results.length} shops.`);
    }

    // Report the tier split from the graph rather than from the in-memory
    // results, so the number quoted is the number the app will read. Runs on
    // dry run too (current graph state) so operators can preview cohorts.
    const tiers = await session.run(
      `MATCH (a:Artist) WHERE ${stateFilter(state)}
       WITH a,
         ((a.portfolioImages IS :: LIST<ANY> AND size(a.portfolioImages) > 0) OR
          (a.portfolioPermalinks IS :: LIST<ANY> AND size(a.portfolioPermalinks) > 0)) AS evidence,
         EXISTS { MATCH (a)-[:WORKS_AT|HAS_SHOP]->(sh:Shop) WHERE sh.websiteLive = true AND trim(coalesce(sh.website,'')) <> '' } AS reachable
       RETURN count(*) AS total,
              sum(CASE WHEN evidence THEN 1 ELSE 0 END) AS withEvidence,
              sum(CASE WHEN reachable THEN 1 ELSE 0 END) AS withContact,
              sum(CASE WHEN evidence AND reachable THEN 1 ELSE 0 END) AS bookable`,
      params,
    );
    const record = tiers.records[0];
    const total = toNumber(record.get('total'));
    const bookable = toNumber(record.get('bookable'));
    console.log(
      `\ntotal ${total} | evidence ${toNumber(record.get('withEvidence'))} | ` +
        `reachable ${toNumber(record.get('withContact'))} | ` +
        `BOOKABLE ${bookable} (${pct(bookable, total).toFixed(1)}%) | ` +
        `browse-only ${total - bookable}`,
    );
  } finally {
    await session.close();
    await driver.close();
  }
}

// Importable for tests without running the probe.
if (process.argv[1]?.endsWith('classify-artist-bookability.mjs')) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

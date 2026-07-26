/**
 * Persistence for the artist ↔ Stripe connected-account mapping.
 *
 * The connected account id (`acct_...`) is the join key between a TatT artist
 * (a node in Neo4j) and their Stripe Connect account. It's stored on the
 * Artist node as `stripeAccountId`. Reads reuse the shared server cypher
 * helper; writes go through a small executeWrite since the shared helper is
 * read-only.
 */

export interface ArtistStripeInfo {
  id: string;
  name: string | null;
  email: string | null;
  stripeAccountId: string | null;
  chargesEnabled: boolean;
  /** Firebase uid that claimed this profile, or null if unclaimed. */
  claimedByUid: string | null;
}

async function runRead(query: string, params: Record<string, unknown>) {
  const { executeServerCypherQuery } = await import('@/features/match-pulse/services/neo4jService');
  return executeServerCypherQuery(query, params);
}

async function runWrite(query: string, params: Record<string, unknown>): Promise<void> {
  const { getNeo4jDriver, NEO4J_DATABASE, NEO4J_QUERY_TIMEOUT } = await import('@/lib/neo4j');
  const neo4j = (await import('neo4j-driver')).default;
  const driver = getNeo4jDriver();
  if (!driver) {
    throw new Error('Neo4j driver not configured — cannot persist Stripe account id.');
  }
  const session = driver.session(NEO4J_DATABASE ? { database: NEO4J_DATABASE } : undefined);
  try {
    await session.executeWrite((tx: { run: (q: string, p: Record<string, unknown>) => Promise<unknown> }) => tx.run(query, params), {
      timeout: neo4j.int(NEO4J_QUERY_TIMEOUT),
    });
  } finally {
    await session.close();
  }
}

/** Read the Stripe mapping for one artist, or null if the artist doesn't exist. */
export async function getArtistStripe(artistId: string): Promise<ArtistStripeInfo | null> {
  const rows = await runRead(
    `MATCH (a:Artist {id: $artistId})
     RETURN a.id AS id, a.name AS name, a.email AS email,
            a.stripeAccountId AS stripeAccountId,
            coalesce(a.stripeChargesEnabled, false) AS chargesEnabled,
            a.claimedByUid AS claimedByUid`,
    { artistId }
  );
  if (!rows.length) return null;
  const r = rows[0] as Record<string, unknown>;
  return {
    id: String(r.id),
    name: (r.name as string) ?? null,
    email: (r.email as string) ?? null,
    stripeAccountId: (r.stripeAccountId as string) ?? null,
    chargesEnabled: Boolean(r.chargesEnabled),
    claimedByUid: (r.claimedByUid as string) ?? null,
  };
}

/** Persist the connected-account id onto the artist node (idempotent upsert of the field). */
export async function setArtistStripeAccount(artistId: string, stripeAccountId: string): Promise<void> {
  await runWrite(
    `MATCH (a:Artist {id: $artistId})
     SET a.stripeAccountId = $stripeAccountId`,
    { artistId, stripeAccountId }
  );
}

/**
 * Cache the account's payout-readiness on the node so the checkout path can gate
 * without a live Stripe round-trip. Updated from the `account.updated` webhook.
 */
export async function setArtistChargesEnabled(stripeAccountId: string, enabled: boolean): Promise<void> {
  await runWrite(
    `MATCH (a:Artist {stripeAccountId: $stripeAccountId})
     SET a.stripeChargesEnabled = $enabled`,
    { stripeAccountId, enabled }
  );
}

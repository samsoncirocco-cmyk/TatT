/**
 * Neo4j persistence for takedown requests. See docs/adr/0024.
 *
 * Kept separate from `takedown.ts` (pure rules) so the domain module stays
 * importable in tests without touching a driver — the same split
 * `artists-graph.ts` uses.
 *
 * Note what is NOT here: nothing in this module removes anything, and nothing
 * writes to the `:Artist` node. A request records a `:TakedownRequest` node and
 * stops. Removal is `scripts/execute-takedown.mjs`, run by a human.
 */
import type { TakedownRequest } from '@/lib/takedown';

/** Write helper that returns rows — the shared cypher helper is read-only. */
async function runWrite(query: string, params: Record<string, unknown>) {
  const { getNeo4jDriver, NEO4J_DATABASE, NEO4J_QUERY_TIMEOUT } = await import('@/lib/neo4j');
  const neo4j = (await import('neo4j-driver')).default;
  const driver = getNeo4jDriver();
  if (!driver) throw new Error('Neo4j driver not configured.');
  const session = driver.session(NEO4J_DATABASE ? { database: NEO4J_DATABASE } : undefined);
  try {
    const result = await session.executeWrite(
      (tx: { run: (q: string, p: Record<string, unknown>) => Promise<unknown> }) => tx.run(query, params),
      { timeout: neo4j.int(NEO4J_QUERY_TIMEOUT) },
    );
    return result;
  } finally {
    await session.close();
  }
}

/**
 * Record an inbound takedown request as a `:TakedownRequest` node with status
 * 'pending'. Attached to the Artist by id where one exists, but deliberately
 * created even when it does not — a request naming an artist we cannot find is
 * still a request a human must see.
 *
 * Returns whether the record landed. The caller reports that truthfully rather
 * than assuming success: the ops email carries the full payload, so a human is
 * still reached when this fails, but we must not claim a durable record we do
 * not have.
 */
export async function recordTakedownRequest(
  request: TakedownRequest,
  requestId: string,
): Promise<boolean> {
  try {
    await runWrite(
      `MERGE (r:TakedownRequest {id: $requestId})
       ON CREATE SET
         r.artistId      = $artistId,
         r.contactEmail  = $contactEmail,
         r.relationship  = $relationship,
         r.scope         = $scope,
         r.message       = $message,
         r.status        = 'pending',
         r.createdAtEpoch = timestamp()
       WITH r
       OPTIONAL MATCH (a:Artist {id: $artistId})
       FOREACH (_ IN CASE WHEN a IS NULL THEN [] ELSE [1] END |
         MERGE (r)-[:REQUESTS_REMOVAL_OF]->(a))
       RETURN r.id AS id`,
      {
        requestId,
        artistId: request.artistId,
        contactEmail: request.contactEmail,
        relationship: request.relationship,
        scope: request.scope,
        message: request.message,
      },
    );
    return true;
  } catch (err) {
    console.error(
      `[takedown] failed to record request ${requestId} to the graph:`,
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}

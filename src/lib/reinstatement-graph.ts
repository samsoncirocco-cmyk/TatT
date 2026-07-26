/**
 * Neo4j persistence for reinstatement requests. See docs/adr/0026.
 *
 * Same split as `takedown-graph.ts`: `reinstatement.ts` holds the pure rules,
 * this holds the driver.
 *
 * Note what is NOT here, and note it carefully. Nothing in this module clears
 * `removedAt`, binds `claimedByUid`, or touches a `:TakedownTombstone`. A
 * request records a `:ReinstatementRequest` and stops. Unsuppression is
 * `scripts/execute-reinstatement.mjs`, run by a human who has checked the code
 * on the artist's Instagram — exactly the restraint takedown has, for the same
 * reason: the request path must not be the thing that can be abused.
 */
import type { ReinstatementRequest } from '@/lib/reinstatement';

/** Write helper that returns rows — the shared cypher helper is read-only. */
async function runWrite(query: string, params: Record<string, unknown>) {
  const { getNeo4jDriver, NEO4J_DATABASE, NEO4J_QUERY_TIMEOUT } = await import('@/lib/neo4j');
  const neo4j = (await import('neo4j-driver')).default;
  const driver = getNeo4jDriver();
  if (!driver) throw new Error('Neo4j driver not configured.');
  const session = driver.session(NEO4J_DATABASE ? { database: NEO4J_DATABASE } : undefined);
  try {
    return await session.executeWrite(
      (tx: { run: (q: string, p: Record<string, unknown>) => Promise<unknown> }) => tx.run(query, params),
      { timeout: neo4j.int(NEO4J_QUERY_TIMEOUT) },
    );
  } finally {
    await session.close();
  }
}

/**
 * Record an inbound reinstatement request as pending, carrying the one-time
 * code the artist must publish on the handle.
 *
 * Recorded even when no tombstone exists for the handle. That is deliberate:
 * the route answers identically either way so it cannot be used to enumerate
 * who has exercised a removal right (ADR 0026). The operator sees the truth in
 * the dry run; the caller learns nothing.
 *
 * Returns whether the record landed, so the caller can report that honestly
 * instead of assuming it.
 */
export async function recordReinstatementRequest(
  request: ReinstatementRequest,
  requestId: string,
  verificationCode: string,
): Promise<boolean> {
  try {
    await runWrite(
      `MERGE (r:ReinstatementRequest {id: $requestId})
       ON CREATE SET
         r.instagram        = $instagram,
         r.tombstoneKey     = $tombstoneKey,
         r.uid              = $uid,
         r.contactEmail     = $contactEmail,
         r.message          = $message,
         r.verificationCode = $verificationCode,
         r.status           = 'pending',
         r.issuedAtEpochMs  = timestamp()
       RETURN r.id AS id`,
      {
        requestId,
        instagram: request.instagram,
        tombstoneKey: `instagram:${request.instagram}`,
        uid: request.uid,
        contactEmail: request.contactEmail,
        message: request.message,
        verificationCode,
      },
    );
    return true;
  } catch (err) {
    console.error(
      `[reinstate] failed to record request ${requestId} to the graph:`,
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}

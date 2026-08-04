import { BOOKABLE_TIER_CLAUSE } from '@/lib/artist-bookability';
import type { ArtistIntroRequest } from '@/lib/artist-intro';
import { PUBLIC_ARTIST_CLAUSE } from '@/lib/artist-visibility';

async function runWriteReturning(query: string, params: Record<string, unknown>) {
  const { getNeo4jDriver, NEO4J_DATABASE, NEO4J_QUERY_TIMEOUT } = await import('@/lib/neo4j');
  const neo4j = (await import('neo4j-driver')).default;
  const driver = getNeo4jDriver();
  if (!driver) throw new Error('Neo4j driver not configured.');
  const session = driver.session(NEO4J_DATABASE ? { database: NEO4J_DATABASE } : undefined);
  try {
    const result = await session.executeWrite(
      (tx: { run: (q: string, p: Record<string, unknown>) => Promise<{ records: Array<{ toObject(): Record<string, unknown> }> }> }) =>
        tx.run(query, params),
      { timeout: neo4j.int(NEO4J_QUERY_TIMEOUT) },
    );
    return result.records.map((record: { toObject(): Record<string, unknown> }) => record.toObject());
  } finally {
    await session.close();
  }
}

/**
 * Persist an intro only for a public browse-only artist. The graph condition is
 * intentionally the same positive-evidence gate that prevents deposits; a
 * stale client page must never turn this route into a second booking path.
 */
export async function recordArtistIntroRequest(
  request: ArtistIntroRequest,
  requestId: string,
  brief?: Record<string, unknown>,
): Promise<{ artistName: string } | null> {
  const rows = await runWriteReturning(
    `MATCH (a:Artist {id: $artistId})
     WHERE ${PUBLIC_ARTIST_CLAUSE} AND NOT (${BOOKABLE_TIER_CLAUSE})
     MERGE (r:ArtistIntroRequest { id: $requestId })
     ON CREATE SET r += {
       id: $requestId,
       artistId: a.id,
       clientName: $clientName,
       clientEmail: $clientEmail,
       message: $message,
       designSessionId: $designSessionId,
       briefJson: $briefJson,
       status: 'pending_relay',
       createdAtEpochMs: timestamp()
     }
     ON MATCH SET
       r.clientName = CASE WHEN r.status = 'pending_relay' THEN $clientName ELSE r.clientName END,
       r.clientEmail = CASE WHEN r.status = 'pending_relay' THEN $clientEmail ELSE r.clientEmail END,
       r.message = CASE WHEN r.status = 'pending_relay' THEN $message ELSE r.message END,
       r.designSessionId = CASE WHEN r.status = 'pending_relay' AND $designSessionId IS NOT NULL THEN $designSessionId ELSE r.designSessionId END,
       r.briefJson = CASE WHEN r.status = 'pending_relay' AND $briefJson IS NOT NULL THEN $briefJson ELSE r.briefJson END
     WITH a, r
     WHERE r.artistId = a.id AND r.clientEmail = $clientEmail
     RETURN a.name AS artistName`,
    {
      requestId,
      clientRequestId: request.clientRequestId,
      artistId: request.artistId,
      clientName: request.clientName,
      clientEmail: request.clientEmail,
      message: request.message,
      designSessionId: request.designSessionId ?? null,
      briefJson: brief ? JSON.stringify(brief) : null,
    },
  );
  return rows.length ? { artistName: String(rows[0].artistName || request.artistId) } : null;
}

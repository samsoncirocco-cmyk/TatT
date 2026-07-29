import {
  CLAIM_VERIFICATION_TTL_MS,
  type PendingArtistClaim,
} from '@/lib/artist-claim';
import { NOT_REMOVED_CLAUSE } from '@/lib/takedown';

type ClaimRequestInput = {
  id: string;
  artistId: string;
  uid: string;
  contactEmail: string | null;
  verificationCode: string | null;
};

async function runWriteReturning(query: string, params: Record<string, unknown>) {
  const { getNeo4jDriver, NEO4J_DATABASE, NEO4J_QUERY_TIMEOUT } = await import('@/lib/neo4j');
  const neo4j = (await import('neo4j-driver')).default;
  const driver = getNeo4jDriver();
  if (!driver) throw new Error('Neo4j driver not configured.');
  const session = driver.session(NEO4J_DATABASE ? { database: NEO4J_DATABASE } : undefined);
  try {
    const result = await session.executeWrite(
      (tx: {
        run: (
          q: string,
          p: Record<string, unknown>,
        ) => Promise<{ records: Array<{ toObject(): Record<string, unknown> }> }>;
      }) => tx.run(query, params),
      { timeout: neo4j.int(NEO4J_QUERY_TIMEOUT) },
    );
    return result.records.map(
      (record: { toObject(): Record<string, unknown> }) => record.toObject(),
    );
  } finally {
    await session.close();
  }
}

/**
 * Record (or return) one pending request for this account/profile pair.
 * Critically, this query never writes `claimedByUid` or any Stripe field.
 */
export async function requestArtistClaim(input: ClaimRequestInput): Promise<{
  artist: {
    id: string;
    name: string | null;
    instagram: string | null;
    claimedByUid: string | null;
    claimVerificationStatus: string | null;
    stripeAccountId: string | null;
    chargesEnabled: boolean;
  } | null;
  request: PendingArtistClaim | null;
}> {
  const rows = await runWriteReturning(
    `MATCH (a:Artist {id: $artistId})
     WHERE ${NOT_REMOVED_CLAUSE}
     MERGE (r:ArtistClaimRequest {artistId: $artistId, uid: $uid})
     ON CREATE SET
       r.id = $requestId,
       r.uid = $uid,
       r.contactEmail = $contactEmail,
       r.instagram = a.instagram,
       r.verificationCode = $verificationCode,
       r.status = 'pending_verification',
       r.issuedAtEpochMs = timestamp()
     WITH a, r,
          r.status = 'pending_verification'
            AND coalesce(r.issuedAtEpochMs, 0) <= timestamp() - $verificationTtlMs AS expired
     FOREACH (_ IN CASE WHEN expired THEN [1] ELSE [] END |
       SET r.id = $requestId,
           r.contactEmail = $contactEmail,
           r.instagram = a.instagram,
           r.verificationCode = $verificationCode,
           r.issuedAtEpochMs = timestamp()
     )
     SET r.lastRequestedAtEpochMs = timestamp()
     RETURN a.id AS artistId,
            a.name AS name,
            a.instagram AS instagram,
            a.claimedByUid AS claimedByUid,
            a.claimVerificationStatus AS claimVerificationStatus,
            a.stripeAccountId AS stripeAccountId,
            coalesce(a.stripeChargesEnabled, false) AS chargesEnabled,
            r.id AS requestId,
            r.uid AS requestUid,
            r.contactEmail AS contactEmail,
            r.verificationCode AS verificationCode,
            r.status AS requestStatus,
            r.issuedAtEpochMs AS issuedAtEpochMs`,
    {
      artistId: input.artistId,
      uid: input.uid,
      requestId: input.id,
      contactEmail: input.contactEmail,
      verificationCode: input.verificationCode,
      verificationTtlMs: CLAIM_VERIFICATION_TTL_MS,
    },
  );
  if (!rows.length) return { artist: null, request: null };
  const row = rows[0];
  const artist = {
    id: String(row.artistId),
    name: (row.name as string) ?? null,
    instagram: (row.instagram as string) ?? null,
    claimedByUid: (row.claimedByUid as string) ?? null,
    claimVerificationStatus: (row.claimVerificationStatus as string) ?? null,
    stripeAccountId: (row.stripeAccountId as string) ?? null,
    chargesEnabled: Boolean(row.chargesEnabled),
  };
  const request =
    row.requestStatus === 'pending_verification'
      ? {
          id: String(row.requestId),
          artistId: String(row.artistId),
          uid: String(row.requestUid),
          contactEmail: (row.contactEmail as string) ?? null,
          instagram: (row.instagram as string) ?? null,
          verificationCode: (row.verificationCode as string) ?? null,
          status: 'pending_verification' as const,
          issuedAtEpochMs: Number(row.issuedAtEpochMs),
        }
      : null;
  return { artist, request };
}

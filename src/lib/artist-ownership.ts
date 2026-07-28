/**
 * Does this signed-in user own this artist profile?
 *
 * The binding is `claimedByUid` plus `claimVerificationStatus = 'verified'` on
 * the `:Artist` node, written only by the human-reviewed approval CLI. Every artist-facing write route must prove it before
 * touching artist state — `session-types-persistence.ts` says as much in its
 * header and leaves the check to its callers. This is that check, in one place.
 *
 * Fails CLOSED. A Neo4j outage returns `false`, not `true`: the routes behind
 * this guard publish a schedule and connect a calendar, and letting those
 * through unverified during an outage would let anyone edit any artist. The
 * cost of failing closed is an artist who cannot edit their hours for a few
 * minutes. The cost of failing open is a stranger publishing availability on
 * someone else's profile.
 */

export async function isArtistOwner(
  uid: string | null | undefined,
  artistId: string,
): Promise<boolean> {
  if (!uid || !artistId) return false;
  try {
    const { executeServerCypherQuery } = await import(
      "@/features/match-pulse/services/neo4jService"
    );
    const rows = await executeServerCypherQuery(
      `MATCH (a:Artist {id: $artistId})
       RETURN a.claimedByUid AS claimedByUid,
              a.claimVerificationStatus AS claimVerificationStatus
       LIMIT 1`,
      { artistId },
    );
    if (!rows.length) return false;
    const claimedByUid = (rows[0] as Record<string, unknown>).claimedByUid;
    const status = (rows[0] as Record<string, unknown>).claimVerificationStatus;
    return claimedByUid === uid && status === "verified";
  } catch (err) {
    console.warn(
      `[artist-ownership] ownership check failed for ${artistId} — denying:`,
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}

/** Whether anyone at all has claimed this profile. Read-only; fails closed. */
export async function isArtistClaimed(artistId: string): Promise<boolean> {
  if (!artistId) return false;
  try {
    const { executeServerCypherQuery } = await import(
      "@/features/match-pulse/services/neo4jService"
    );
    const rows = await executeServerCypherQuery(
      `MATCH (a:Artist {id: $artistId})
       RETURN a.claimedByUid AS claimedByUid,
              a.claimVerificationStatus AS claimVerificationStatus
       LIMIT 1`,
      { artistId },
    );
    if (!rows.length) return false;
    const row = rows[0] as Record<string, unknown>;
    return typeof row.claimedByUid === "string" && row.claimVerificationStatus === "verified";
  } catch {
    // Unknown ownership means no reservation mode. Same principle as above.
    return false;
  }
}

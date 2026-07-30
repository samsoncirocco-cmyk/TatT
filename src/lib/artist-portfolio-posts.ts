import type { InstagramMedia } from "./artist-instagram";

export type PortfolioPost = {
  sourceId: string;
  permalink: string;
  mediaType: string;
  displayOrder: number;
  source: "instagram_api";
  consentBasis: "artist_oauth_selection";
};

export async function getArtistPortfolioPosts(
  artistId: string,
): Promise<PortfolioPost[]> {
  const { executeServerCypherQuery } = await import(
    "@/features/match-pulse/services/neo4jService"
  );
  const rows = await executeServerCypherQuery(
    `MATCH (a:Artist {id: $artistId})-[show:SHOWCASES]->(post:PortfolioPost)
     WHERE coalesce(show.active, false) = true
       AND coalesce(post.active, false) = true
       AND post.source = 'instagram_api'
     RETURN post.sourceId AS sourceId,
            post.permalink AS permalink,
            post.mediaType AS mediaType,
            show.displayOrder AS displayOrder
     ORDER BY show.displayOrder ASC`,
    { artistId },
  );
  return rows.map((row) => ({
    sourceId: String(row.sourceId),
    permalink: String(row.permalink),
    mediaType: String(row.mediaType ?? "UNKNOWN"),
    displayOrder: Number(row.displayOrder ?? 0),
    source: "instagram_api",
    consentBasis: "artist_oauth_selection",
  }));
}

async function runWrite(
  query: string,
  params: Record<string, unknown>,
): Promise<Array<Record<string, unknown>>> {
  const { getNeo4jDriver, NEO4J_DATABASE, NEO4J_QUERY_TIMEOUT } = await import(
    "@/lib/neo4j"
  );
  const neo4j = (await import("neo4j-driver")).default;
  const driver = getNeo4jDriver();
  if (!driver) throw new Error("Neo4j driver not configured.");
  const session = driver.session(
    NEO4J_DATABASE ? { database: NEO4J_DATABASE } : undefined,
  );
  try {
    const result = await session.executeWrite(
      (tx: {
        run: (
          q: string,
          p: Record<string, unknown>,
        ) => Promise<{
          records: Array<{ toObject(): Record<string, unknown> }>;
        }>;
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

export function selectOwnedInstagramMedia(
  available: InstagramMedia[],
  requestedIds: unknown,
  max: number = 8,
):
  | { ok: true; selected: InstagramMedia[] }
  | { ok: false; error: string } {
  if (!Array.isArray(requestedIds)) {
    return { ok: false, error: "mediaIds must be an array." };
  }
  const ids = [
    ...new Set(
      requestedIds.filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];
  if (ids.length > max) {
    return { ok: false, error: `Choose no more than ${max} posts.` };
  }
  const byId = new Map(available.map((media) => [media.id, media]));
  const selected = ids.map((id) => byId.get(id)).filter(Boolean) as InstagramMedia[];
  if (selected.length !== ids.length) {
    return {
      ok: false,
      error: "One or more selected posts are not owned by the connected account.",
    };
  }
  return { ok: true, selected };
}

export async function replaceArtistPortfolioPosts(input: {
  artistId: string;
  uid: string;
  media: InstagramMedia[];
}): Promise<PortfolioPost[]> {
  const rows = input.media.map((media, displayOrder) => ({
    // The idempotency key is intentionally artist + media, not media alone:
    // duplicate/legacy profiles must never share one mutable portfolio node.
    sourceKey: `${input.artistId}:instagram:${media.id}`,
    sourceId: media.id,
    permalink: media.permalink,
    mediaType: media.mediaType,
    displayOrder,
  }));
  const saved = await runWrite(
    `MATCH (a:Artist {
       id: $artistId,
       claimedByUid: $uid,
       claimVerificationStatus: 'verified'
     })
     OPTIONAL MATCH (a)-[old:SHOWCASES]->(oldPost:PortfolioPost)
     SET old.active = false, oldPost.active = false
     WITH DISTINCT a
     FOREACH (row IN $rows |
       MERGE (post:PortfolioPost {sourceKey: row.sourceKey})
       SET post.sourceId = row.sourceId,
           post.artistId = $artistId,
           post.permalink = row.permalink,
           post.mediaType = row.mediaType,
           post.source = 'instagram_api',
           post.consentBasis = 'artist_oauth_selection',
           post.active = true,
           post.verifiedAtEpochMs = timestamp(),
           post.refreshedAtEpochMs = timestamp()
       MERGE (a)-[show:SHOWCASES]->(post)
       SET show.displayOrder = row.displayOrder,
           show.active = true,
           show.selectedAtEpochMs = timestamp()
     )
     RETURN a.id AS artistId`,
    { artistId: input.artistId, uid: input.uid, rows },
  );
  if (!saved.length) {
    throw new Error("Ownership changed before the portfolio was saved.");
  }
  return rows.map((row) => ({
    sourceId: row.sourceId,
    permalink: row.permalink,
    mediaType: row.mediaType,
    displayOrder: row.displayOrder,
    source: "instagram_api",
    consentBasis: "artist_oauth_selection",
  }));
}

export async function markInstagramOAuthVerified(input: {
  artistId: string;
  uid: string;
  instagramUserId: string;
  username: string;
}): Promise<boolean> {
  const rows = await runWrite(
    `MATCH (a:Artist {
       id: $artistId,
       claimedByUid: $uid,
       claimVerificationStatus: 'verified'
     })
     SET a.instagramOAuthUserId = $instagramUserId,
         a.instagramOAuthUsername = $username,
         a.instagramOAuthVerifiedAtEpochMs = timestamp()
     RETURN a.id AS artistId`,
    input,
  );
  return rows.length === 1;
}

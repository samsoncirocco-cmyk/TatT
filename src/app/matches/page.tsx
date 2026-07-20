import MatchesClient from "./MatchesClient";

/**
 * Server wrapper — matches come from /api/v1/match/semantic (live Neo4j
 * graph). Every matched artist now has a live profile at
 * /artists/[slug] (slug = name + graph id), so no roster crosses over.
 */
export default function MatchesPage() {
  return <MatchesClient />;
}

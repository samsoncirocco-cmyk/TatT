import MatchesClient from "./MatchesClient";
import { getAllArtists } from "@/lib/artists";

/**
 * Server wrapper — matches come from /api/v1/match/semantic (live Neo4j
 * graph). Only the static roster's slugs cross to the client so matched
 * artists can deep-link to /artists/[slug] when a profile page exists;
 * the ~MB artists.json itself must never enter a client bundle.
 */
export default function MatchesPage() {
  const rosterSlugs = getAllArtists().map((a) => a.slug);
  return <MatchesClient rosterSlugs={rosterSlugs} />;
}

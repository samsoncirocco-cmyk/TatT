import { Suspense } from "react";
import MatchesClient from "./MatchesClient";

/**
 * Server wrapper — matches come from /api/v1/match/semantic (live Neo4j
 * graph). Every matched artist now has a live profile at
 * /artists/[slug] (slug = name + graph id), so no roster crosses over.
 *
 * Suspense boundary is required because MatchesClient reads the design
 * style signal from useSearchParams (/matches?styles=…&from=design).
 * The fallback renders the same shell without the signal applied.
 */
export default function MatchesPage() {
  return (
    <Suspense fallback={null}>
      <MatchesClient />
    </Suspense>
  );
}

import { Suspense } from "react";
import SwipeClient from "./SwipeClient";

/**
 * Server wrapper — Suspense boundary is required because SwipeClient reads
 * the design-session handoff from useSearchParams (/swipe?ds=<sessionId>).
 * Same pattern as /smart-match. The fallback mirrors the
 * pre-hydration skeleton SwipeClient itself renders.
 */
export default function SwipePage() {
  return (
    <Suspense fallback={null}>
      <SwipeClient />
    </Suspense>
  );
}

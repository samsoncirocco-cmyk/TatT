import { Suspense } from "react";
import SmartMatchClient from "./SmartMatchClient";

/**
 * Server wrapper — Suspense boundary is required because SmartMatchClient
 * reads the design-session handoff from useSearchParams
 * (/smart-match?ds=<sessionId>). Same pattern as /swipe.
 */
export default function SmartMatchPage() {
  return (
    <Suspense fallback={null}>
      <SmartMatchClient />
    </Suspense>
  );
}

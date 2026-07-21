/**
 * AI Council Health Probe
 *
 * Authenticated deep health endpoint. Probes Vertex AI and
 * OpenRouter with a minimal 5-second-timeout enhancement request and reports
 * status per-provider plus an overall verdict.
 *
 * This route can incur provider costs and must not be used as a public uptime
 * endpoint. Use /api/health for public liveness checks.
 */
import { NextRequest, NextResponse } from 'next/server';
import { enhance } from '@/services/council';
import { verifyApiAuth } from '@/lib/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A real council enhancement is a multi-second LLM call; 5s produced
// false "timeout" verdicts. 15s still bounds the handler well under
// Vercel's function limit (two sequential probes).
const PROBE_TIMEOUT_MS = 15_000;

type ProviderStatus = 'up' | 'down' | 'timeout';
type ProbeResult = { status: ProviderStatus; reason?: string };

/** Strip anything token-shaped and truncate — this endpoint is public.
 *  Unwraps Error#cause so wrapper errors (all_providers_exhausted)
 *  still show the underlying provider failure. */
function sanitizeReason(err: unknown): string {
  const parts: string[] = [];
  let cur: unknown = err;
  for (let depth = 0; depth < 3 && cur; depth++) {
    parts.push(cur instanceof Error ? cur.message : String(cur));
    cur = cur instanceof Error ? cur.cause : undefined;
  }
  return parts
    .join(' <- ')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/(key|token|secret|password)=[^&\s]+/gi, '$1=[redacted]')
    .slice(0, 240);
}

async function probeProvider(
  envOverrides: Record<string, string | undefined>
): Promise<ProbeResult> {
  // Snapshot + temporarily mutate env to coerce the council module into using only
  // the provider we're probing. We restore env in the finally block.
  const snapshot: Record<string, string | undefined> = {};
  for (const key of Object.keys(envOverrides)) {
    snapshot[key] = process.env[key];
    const v = envOverrides[key];
    if (v === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = v;
    }
  }

  try {
    const result = await Promise.race<ProbeResult>([
      enhance({ userIdea: 'test', style: 'traditional', bodyPart: 'forearm' })
        .then((): ProbeResult => ({ status: 'up' }))
        .catch((err): ProbeResult => ({ status: 'down', reason: sanitizeReason(err) })),
      new Promise<ProbeResult>(resolve =>
        setTimeout(() => resolve({ status: 'timeout' }), PROBE_TIMEOUT_MS)
      )
    ]);
    return result;
  } finally {
    for (const key of Object.keys(snapshot)) {
      const orig = snapshot[key];
      if (orig === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = orig;
      }
    }
  }
}

export async function GET(req: NextRequest) {
  const authError = await verifyApiAuth(req);
  if (authError) return authError;

  // Probe Vertex only (disable OpenRouter for this probe)
  const vertex = await probeProvider({
    COUNCIL_VERTEX_AI_ENABLED: 'true',
    COUNCIL_USE_OPENROUTER: 'false',
    NEXT_PUBLIC_VERTEX_AI_ENABLED: 'true',
    NEXT_PUBLIC_USE_OPENROUTER: 'false',
    NEXT_PUBLIC_COUNCIL_DEMO_MODE: 'false',
    NEXT_PUBLIC_DEMO_MODE: 'false'
  });

  // Probe OpenRouter only (disable Vertex for this probe)
  const openrouter = await probeProvider({
    COUNCIL_VERTEX_AI_ENABLED: 'false',
    COUNCIL_USE_OPENROUTER: 'true',
    NEXT_PUBLIC_VERTEX_AI_ENABLED: 'false',
    NEXT_PUBLIC_USE_OPENROUTER: 'true',
    NEXT_PUBLIC_COUNCIL_DEMO_MODE: 'false',
    NEXT_PUBLIC_DEMO_MODE: 'false'
  });

  let overall: 'healthy' | 'degraded' | 'down';
  const vUp = vertex.status === 'up';
  const oUp = openrouter.status === 'up';
  if (vUp && oUp) overall = 'healthy';
  else if (vUp || oUp) overall = 'degraded';
  else overall = 'down';

  const body = {
    vertex: vertex.status,
    vertexReason: vertex.reason,
    openrouter: openrouter.status,
    openrouterReason: openrouter.reason,
    overall,
    checkedAt: new Date().toISOString()
  };

  return NextResponse.json(body, { status: overall === 'down' ? 503 : 200 });
}

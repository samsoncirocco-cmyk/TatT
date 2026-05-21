/**
 * AI Council Health Probe
 *
 * Unauthenticated health endpoint for uptime monitors. Probes Vertex AI and
 * OpenRouter with a minimal 5-second-timeout enhancement request and reports
 * status per-provider plus an overall verdict.
 *
 * TODO: This endpoint is intentionally unauthenticated (it's a health probe).
 * No rate-limit infrastructure exists in this repo for unauthenticated routes
 * — wire one up here if/when added (e.g. IP-based via middleware).
 */
import { NextResponse } from 'next/server';
import { enhancePrompt } from '@/services/councilService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROBE_TIMEOUT_MS = 5_000;

type ProviderStatus = 'up' | 'down' | 'timeout';

async function probeProvider(
  envOverrides: Record<string, string | undefined>
): Promise<ProviderStatus> {
  // Snapshot + temporarily mutate env to coerce councilService into using only
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
    const result = await Promise.race<ProviderStatus>([
      enhancePrompt({ userIdea: 'test', style: 'traditional', bodyPart: 'forearm' })
        .then((): ProviderStatus => 'up')
        .catch((): ProviderStatus => 'down'),
      new Promise<ProviderStatus>(resolve =>
        setTimeout(() => resolve('timeout'), PROBE_TIMEOUT_MS)
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

export async function GET() {
  // Probe Vertex only (disable OpenRouter for this probe)
  const vertex: ProviderStatus = await probeProvider({
    NEXT_PUBLIC_VERTEX_AI_ENABLED: 'true',
    NEXT_PUBLIC_USE_OPENROUTER: 'false',
    NEXT_PUBLIC_COUNCIL_DEMO_MODE: 'false',
    NEXT_PUBLIC_DEMO_MODE: 'false'
  });

  // Probe OpenRouter only (disable Vertex for this probe)
  const openrouter: ProviderStatus = await probeProvider({
    NEXT_PUBLIC_VERTEX_AI_ENABLED: 'false',
    NEXT_PUBLIC_USE_OPENROUTER: 'true',
    NEXT_PUBLIC_COUNCIL_DEMO_MODE: 'false',
    NEXT_PUBLIC_DEMO_MODE: 'false'
  });

  let overall: 'healthy' | 'degraded' | 'down';
  const vUp = vertex === 'up';
  const oUp = openrouter === 'up';
  if (vUp && oUp) overall = 'healthy';
  else if (vUp || oUp) overall = 'degraded';
  else overall = 'down';

  const body = {
    vertex,
    openrouter,
    overall,
    checkedAt: new Date().toISOString()
  };

  return NextResponse.json(body, { status: overall === 'down' ? 503 : 200 });
}

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

/**
 * Guardrail: every API route must either call a recognized auth guard, or be
 * named in EXEMPT_ROUTES with a reason. This exists because verifyApiAuth is
 * enforced per-route (src/proxy.ts is CORS-only, see docs/SECURITY_MODEL.md),
 * so a new route that forgets the auth check fails open silently.
 *
 * If this test fails on a new route: either add `verifyApiAuth(req)` (or
 * `verifyCloudTaskRequest` for Cloud Tasks endpoints) to it, or add it to
 * EXEMPT_ROUTES below with a one-line reason.
 */

const EXEMPT_ROUTES: Record<string, string> = {
  'src/app/api/health/route.ts':
    'Public liveness check. NOTE: currently returns hasReplicateToken/hasVertexConfig/' +
    'hasGcsConfig/hasNeo4jConfig booleans — that is a separate info-disclosure issue ' +
    'tracked outside this guardrail, not a reason to add auth here.',
  'src/app/api/v1/designs/share/[shareId]/route.ts':
    'Public share-link view (GET) — the whole point of a share link is unauthenticated access.',
  'src/app/api/webhooks/stripe/route.ts':
    'Verifies Stripe HMAC signature (verifyStripeSignature) instead of Bearer auth — ' +
    'Stripe cannot send a Firebase token.',
};

const AUTH_MARKERS = [
  'verifyApiAuth',
  'verifyCloudTaskRequest',
  'verifyFirebaseToken',
  'verifyStripeSignature',
];

function findRouteFiles(dir: string, root: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...findRouteFiles(fullPath, root));
    } else if (entry === 'route.ts' || entry === 'route.js') {
      results.push(relative(root, fullPath).split('\\').join('/'));
    }
  }
  return results;
}

describe('API route auth coverage', () => {
  const apiDir = join(process.cwd(), 'src/app/api');
  const routeFiles = findRouteFiles(apiDir, process.cwd()).sort();

  it('found route files to check (sanity check the glob itself works)', () => {
    expect(routeFiles.length).toBeGreaterThan(10);
  });

  it.each(routeFiles)('%s calls an auth guard or is explicitly exempt', (relPath) => {
    if (EXEMPT_ROUTES[relPath]) {
      expect(EXEMPT_ROUTES[relPath].length).toBeGreaterThan(0);
      return;
    }

    const source = readFileSync(relPath, 'utf8');
    const hasGuard = AUTH_MARKERS.some((marker) => source.includes(marker));

    expect(
      hasGuard,
      `${relPath} does not call any of [${AUTH_MARKERS.join(', ')}] and is not in ` +
        `EXEMPT_ROUTES. Add the auth check, or add this route to EXEMPT_ROUTES in ` +
        `src/lib/__tests__/api-route-auth-coverage.test.ts with a reason.`
    ).toBe(true);
  });

  it('every EXEMPT_ROUTES entry still points at a real file', () => {
    for (const relPath of Object.keys(EXEMPT_ROUTES)) {
      expect(routeFiles, `${relPath} is in EXEMPT_ROUTES but no longer exists`).toContain(relPath);
    }
  });
});

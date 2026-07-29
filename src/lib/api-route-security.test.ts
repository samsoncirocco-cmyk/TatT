import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { API_ROUTE_SECURITY } from './api-route-security';

const API_DIR = join(__dirname, '..', 'app', 'api');

function findRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...findRouteFiles(full));
    } else if (/^route\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function routeKey(file: string): string {
  return relative(API_DIR, file).split(sep).slice(0, -1).join('/');
}

const ENFORCEMENT: Record<string, RegExp | null> = {
  'firebase-auth': /verifyApiAuth\s*\(/,
  'cloud-tasks-oidc': /verifyCloudTaskRequest\s*\(/,
  'webhook-signature': /verifyStripeSignature\s*\(|constructEvent\s*\(|validateTwilioSignature\s*\(/,
  public: null,
};

const routeFiles = findRouteFiles(API_DIR);

describe('API route security classification', () => {
  it('finds a sane number of routes', () => {
    expect(routeFiles.length).toBeGreaterThan(10);
  });

  it('every API route has an explicit security classification', () => {
    const unclassified = routeFiles
      .map(routeKey)
      .filter((key) => !(key in API_ROUTE_SECURITY));
    expect(
      unclassified,
      `New API route(s) without a security classification. Add each to ` +
        `API_ROUTE_SECURITY in src/lib/api-route-security.ts and make the ` +
        `route call the enforcement function for its class.`
    ).toEqual([]);
  });

  it('has no stale classifications for deleted routes', () => {
    const onDisk = new Set(routeFiles.map(routeKey));
    const stale = Object.keys(API_ROUTE_SECURITY).filter((key) => !onDisk.has(key));
    expect(stale, 'Remove deleted routes from API_ROUTE_SECURITY.').toEqual([]);
  });

  it.each(routeFiles.map((file) => [routeKey(file), file] as const))(
    '%s enforces its declared security class',
    (key, file) => {
      const entry = API_ROUTE_SECURITY[key];
      if (!entry) return; // reported by the classification test above
      const source = readFileSync(file, 'utf8');

      if (entry.class === 'public') {
        expect(
          entry.reason && entry.reason.trim().length >= 20,
          `Public route "${key}" needs a written reason (>= 20 chars) in API_ROUTE_SECURITY.`
        ).toBe(true);
        return;
      }

      const marker = ENFORCEMENT[entry.class];
      expect(
        marker && marker.test(source),
        `Route "${key}" is classified "${entry.class}" but its route file never ` +
          `calls the required verification function (${String(marker)}).`
      ).toBe(true);
    }
  );
});

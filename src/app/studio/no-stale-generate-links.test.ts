import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * The Studio lives at /studio (TAT-54, closing the route-naming cleanup
 * ADR-0028 deferred). /generate survives only as a redirect, so any link
 * still pointing there costs a real user an extra hop and quietly drops
 * them out of the funnel's design-carrying URL shape.
 *
 * If you are here because this test failed: point the link at /studio —
 * and if it carries a design, build it with `studioUrlForDesign`.
 *
 * `/generate/stencil` is exempt: it is its own long-lived redirect into
 * /design (ADR-0028), and the Forge stays retired.
 */

const SRC = path.resolve(__dirname, "../../");

/** Files that legitimately name the old path. */
const ALLOWED = new Set([
  // The redirect itself, and the redirects it documents.
  "app/generate/page.tsx",
  "app/generate/stencil/page.tsx",
]);

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(full, acc);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name) && !/\.test\.(tsx?|jsx?)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

describe("no stale /generate links in mounted code", () => {
  it("routes every internal Studio link at /studio", () => {
    const offenders: string[] = [];

    for (const file of walk(SRC)) {
      const rel = path.relative(SRC, file).split(path.sep).join("/");
      if (ALLOWED.has(rel)) continue;
      const src = fs.readFileSync(file, "utf8");
      src.split("\n").forEach((line, i) => {
        // A quoted /generate path that is not an /api/... route and not
        // the still-live /generate/stencil redirect target.
        for (const m of line.matchAll(/["'`](\/generate(?:\/[\w-]+)*)["'`]/g)) {
          const route = m[1];
          if (route === "/generate/stencil") continue;
          offenders.push(`${rel}:${i + 1}  ${route}`);
        }
      });
    }

    expect(offenders).toEqual([]);
  });
});

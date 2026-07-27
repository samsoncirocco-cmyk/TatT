import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Type-size floor for the punk design system.
 *
 * A 2026-07-20 UX review found the tape-label text unreadable: 7-9px
 * Space Mono under `tracking-[0.2em]` is what "punk" degraded into once
 * the wide tracking was applied to tiny type. DESIGN_SYSTEM.md now sets
 * the floor at 10px. Sizes are written as Tailwind arbitrary values
 * (`text-[10px]`) scattered across ~50 call sites, so nothing but a
 * source scan can stop the floor from silently regressing.
 *
 * If you are here because this test failed: raise the label to
 * `text-[10px]`, or shorten the copy / widen its container. Do not
 * shrink the type, and do not drop the tracking to buy room.
 */

const SRC = path.resolve(__dirname, "../../");

/**
 * Pre-punk "ducks-yellow" files. They are unreachable or slated for
 * deletion (see TODO.md) and are deliberately not being restyled — porting
 * their logic, not their look, is the standing rule. Delete entries here
 * as the files themselves go.
 */
const LEGACY_OLD_THEME = new Set([
  "features/Philosophy.jsx",
  "components/JourneyContent.jsx",
  "components/GraphInsight.jsx",
  "components/VisualizeContent.jsx",
  "components/generate/VersionThumbnail.jsx",
]);

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(full, acc);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name) && !/\.test\.(tsx?|jsx?)$/.test(entry.name)) {
      // Tests aren't rendered UI, and this file quotes the pattern it hunts.
      acc.push(full);
    }
  }
  return acc;
}

describe("punk design system — type-size floor", () => {
  it("has no user-facing text below 10px", () => {
    const offenders: string[] = [];

    for (const file of walk(SRC)) {
      const rel = path.relative(SRC, file).split(path.sep).join("/");
      if (LEGACY_OLD_THEME.has(rel)) continue;

      const src = fs.readFileSync(file, "utf8");
      src.split("\n").forEach((line, i) => {
        // Tailwind arbitrary font sizes: text-[9px], text-[8.5px], ...
        for (const m of line.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)) {
          if (parseFloat(m[1]) < 10) {
            offenders.push(`${rel}:${i + 1} → ${m[0]}`);
          }
        }
      });
    }

    expect(offenders, `Type below the 10px floor (see DESIGN_SYSTEM.md):\n${offenders.join("\n")}`)
      .toEqual([]);
  });
});

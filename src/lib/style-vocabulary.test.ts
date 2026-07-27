/**
 * The dead-filter guard.
 *
 * Everything here reads the real vocabulary files — data/style-ontology.json
 * and data/graph-style-vocabulary.json — rather than a copy, so a style added
 * to either one is checked against the code that has to serve it. That is the
 * point: the bug this suite exists to prevent was three hardcoded lists that
 * each drifted from the graph until "Script", "Japanese" and "Minimalist"
 * filtered to zero artists with no test noticing.
 *
 * Re-sync the graph snapshot with:
 *   node scripts/sync-graph-style-vocabulary.mjs     (read-only)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CANONICAL_STYLES,
  ONTOLOGY_TAG_IDS,
  canonicalStyleForTag,
  resolveCanonicalStyle,
  styleMatchVariants,
} from "./style-vocabulary";
import { ROSTER_STYLES, buildRosterFilter } from "./artists-graph";

const DATA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../data");
const readJson = (name: string) => JSON.parse(readFileSync(path.join(DATA, name), "utf8"));

const ontology = readJson("style-ontology.json") as {
  version: number;
  tags: Array<{ id: string; label: string; aliases?: string[]; parent?: string }>;
};
const graph = readJson("graph-style-vocabulary.json") as {
  styles: Array<{ tag: string; graphNames: string[]; artists: number }>;
};

describe("the vocabulary files themselves", () => {
  it("only lists graph styles that resolve to a real ontology tag", () => {
    const ids = new Set(ontology.tags.map((t) => t.id));
    for (const entry of graph.styles) {
      expect(ids, `graph tag "${entry.tag}" is not an ontology id`).toContain(entry.tag);
    }
  });

  it("only snapshots styles that actually have artists behind them", () => {
    for (const entry of graph.styles) {
      expect(entry.artists, `"${entry.tag}" is in the snapshot with no artists`).toBeGreaterThan(0);
      expect(entry.graphNames.length).toBeGreaterThan(0);
    }
  });

  it("points every `parent` at a real tag, with no cycles", () => {
    const byId = new Map(ontology.tags.map((t) => [t.id, t]));
    for (const tag of ontology.tags) {
      const seen = new Set<string>([tag.id]);
      let cursor = tag.parent;
      while (cursor) {
        expect(byId.has(cursor), `"${tag.id}" has parent "${cursor}", which is not a tag`).toBe(true);
        expect(seen.has(cursor), `parent chain from "${tag.id}" cycles at "${cursor}"`).toBe(false);
        seen.add(cursor);
        cursor = byId.get(cursor)?.parent;
      }
    }
  });
});

describe("no UI-offerable style is unmatchable", () => {
  // The whole bug, stated as an assertion.
  it("backs every canonical style with at least one artist in the graph", () => {
    const artistsByLabel = new Map(
      graph.styles.map((entry) => [
        ontology.tags.find((t) => t.id === entry.tag)!.label,
        entry.artists,
      ]),
    );
    for (const style of CANONICAL_STYLES) {
      expect(
        artistsByLabel.get(style) ?? 0,
        `"${style}" is offered in the UI but no artist in the graph carries it — a dead filter`,
      ).toBeGreaterThan(0);
    }
  });

  it("gives every canonical style a spelling group that includes its graph name", () => {
    for (const entry of graph.styles) {
      const label = ontology.tags.find((t) => t.id === entry.tag)!.label;
      const variants = styleMatchVariants(label);
      for (const graphName of entry.graphNames) {
        expect(
          variants,
          `"${label}" would not match artists stored as "${graphName}"`,
        ).toContain(graphName.toLowerCase());
      }
    }
  });

  it("names the styles the live graph can currently serve", () => {
    // A snapshot of intent, not just of data: "Script" is absent because the
    // graph never had it, and Lettering/Minimalist are absent because no
    // artist carries them yet. Re-running the sync script after the artist
    // enrichment sweep is what brings them back.
    expect([...CANONICAL_STYLES].sort()).toEqual([
      "Anime",
      "Black & Grey",
      "Blackwork",
      "Chicano",
      "Fine Line",
      "Geometric",
      "Illustrative",
      "Japanese",
      "Neo-Traditional",
      "New School",
      "Ornamental",
      "Realism",
      "Traditional",
      "Tribal",
      "Watercolor",
    ]);
    expect(CANONICAL_STYLES).not.toContain("Script");
  });
});

describe("no artist the graph holds is unreachable from the UI", () => {
  it("offers a filter for every style the graph has artists under", () => {
    for (const entry of graph.styles) {
      const label = ontology.tags.find((t) => t.id === entry.tag)!.label;
      expect(
        CANONICAL_STYLES,
        `${entry.artists} artists carry "${entry.graphNames.join('/')}" with no way to filter for them`,
      ).toContain(label);
    }
  });

  it("resolves the graph's own spelling back to the offered label", () => {
    for (const entry of graph.styles) {
      const label = ontology.tags.find((t) => t.id === entry.tag)!.label;
      for (const graphName of entry.graphNames) {
        expect(resolveCanonicalStyle(graphName)).toBe(label);
      }
    }
  });
});

describe("every code surface speaks the one vocabulary", () => {
  it("shares one list between /smart-match and the /artists roster", () => {
    // ROSTER_STYLES was a copy-paste of CANONICAL_STYLES and drifted.
    expect(ROSTER_STYLES).toBe(CANONICAL_STYLES);
  });

  it("keeps the council prompt's style enum inside the ontology", () => {
    const route = readFileSync(
      path.join(DATA, "..", "src/app/api/v1/council/generate/route.ts"),
      "utf8",
    );
    // The enum is interpolated from ONTOLOGY_TAG_IDS rather than typed out,
    // which is the only way it cannot drift.
    expect(route).toContain("${ONTOLOGY_TAG_IDS.join(', ')}");
    expect(ONTOLOGY_TAG_IDS).toEqual(ontology.tags.map((t) => t.id));
  });

  it("offers the settings style picker from the same list", () => {
    const settings = readFileSync(path.join(DATA, "..", "src/app/settings/page.tsx"), "utf8");
    expect(settings).toContain("const STYLES = CANONICAL_STYLES");
    // Its old default must still be something the user can actually pick.
    const [, fallback] = settings.match(/useState<string\[\]>\(\[(.*?)\]\)/) ?? [];
    for (const raw of (fallback ?? "").split(",")) {
      const style = raw.trim().replace(/^"|"$/g, "");
      if (style) expect(CANONICAL_STYLES).toContain(style);
    }
  });
});

describe("resolveCanonicalStyle / canonicalStyleForTag", () => {
  it("accepts ids, labels, aliases and graph names in any casing", () => {
    expect(resolveCanonicalStyle("fine-line")).toBe("Fine Line");
    expect(resolveCanonicalStyle("FINELINE")).toBe("Fine Line");
    expect(resolveCanonicalStyle("Japanese (Irezumi)")).toBe("Japanese");
    expect(resolveCanonicalStyle("japanese-irezumi")).toBe("Japanese");
    expect(resolveCanonicalStyle("old school")).toBe("Traditional");
    expect(resolveCanonicalStyle("neo-trad")).toBe("Neo-Traditional");
  });

  it("rolls sub-styles up to the parent the graph carries", () => {
    expect(canonicalStyleForTag("irezumi")).toBe("Japanese");
    expect(canonicalStyleForTag("manga")).toBe("Anime");
    expect(canonicalStyleForTag("dotwork")).toBe("Blackwork");
    expect(canonicalStyleForTag("portrait")).toBe("Realism");
    expect(canonicalStyleForTag("americana")).toBe("Traditional");
  });

  it("returns null rather than guessing for vocabulary the graph cannot serve", () => {
    for (const id of ["abstract", "color", "lettering", "minimalist", "surrealism"]) {
      expect(canonicalStyleForTag(id), `"${id}" should not be guessed at`).toBeNull();
    }
    expect(resolveCanonicalStyle("Script")).toBeNull();
    expect(resolveCanonicalStyle("Vaporwave")).toBeNull();
    expect(resolveCanonicalStyle("")).toBeNull();
    expect(resolveCanonicalStyle(null)).toBeNull();
  });

  it("expands a style to nothing when it is outside the vocabulary", () => {
    expect(styleMatchVariants("Vaporwave")).toEqual([]);
  });
});

describe("buildRosterFilter", () => {
  it("matches the graph's spelling for a canonical style", () => {
    const { where, params } = buildRosterFilter({ style: "Japanese" });
    expect(params.styleVariants).toContain("japanese (irezumi)");
    expect(where).toContain("any(s IN styles WHERE toLower(s) IN $styleVariants)");
  });

  it("matches nothing — never everything — for an unknown style", () => {
    const { where, params } = buildRosterFilter({ style: "Script" });
    expect(params.styleVariants).toEqual([]);
    // size($styleVariants) > 0 is the guard that keeps this from widening.
    expect(where).toContain("size($styleVariants) > 0");
  });

  it("skips the style clause entirely when no style is requested", () => {
    const { where, params } = buildRosterFilter({});
    expect(params.styleVariants).toEqual([]);
    expect(where).not.toContain("size($styleVariants) > 0");
  });
});

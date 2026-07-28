import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CANONICAL_STYLES,
  stylesFromDescriptors,
  parseStylesParam,
  artistsUrlForDesign,
  smartMatchUrlForDesign,
  canonicalStylesFromOntologyTags,
} from "./design-style-signal";
import { canonicalStyleForTag } from "./style-vocabulary";

describe("stylesFromDescriptors", () => {
  it("maps the forge suggestion chips to canonical styles", () => {
    expect(stylesFromDescriptors(["Pop-punk flash"])).toEqual(["Traditional"]);
    expect(stylesFromDescriptors(["Heavy black linework"])).toEqual(["Blackwork"]);
    // Layout/color chips carry no style signal on their own.
    expect(stylesFromDescriptors(["Hot pink accents"])).toEqual([]);
    expect(stylesFromDescriptors(["Sticker-sheet layout"])).toEqual([]);
  });

  it("extracts multiple styles from a full prompt", () => {
    const styles = stylesFromDescriptors([
      "Roxas keyblade, blackwork stencil, fine line shading, outer forearm",
    ]);
    expect(styles).toEqual(["Blackwork", "Fine Line"]);
  });

  it("does not misread neo-traditional as traditional", () => {
    expect(stylesFromDescriptors(["neo-traditional rose"])).toEqual(["Neo-Traditional"]);
    expect(stylesFromDescriptors(["neo traditional rose"])).toEqual(["Neo-Traditional"]);
    expect(stylesFromDescriptors(["traditional rose"])).toEqual(["Traditional"]);
  });

  it("matches at the start of the text", () => {
    expect(stylesFromDescriptors(["traditional eagle"])).toEqual(["Traditional"]);
    expect(stylesFromDescriptors(["flash sheet"])).toEqual(["Traditional"]);
  });

  it("handles black & grey spellings", () => {
    expect(stylesFromDescriptors(["black and grey portrait"])).toEqual([
      "Black & Grey",
      "Realism",
    ]);
    expect(stylesFromDescriptors(["black & gray skull"])).toEqual(["Black & Grey"]);
  });

  it("caps the signal at three styles", () => {
    const styles = stylesFromDescriptors([
      "traditional blackwork fine line realism japanese",
    ]);
    expect(styles).toHaveLength(3);
  });

  it("returns empty for empty or unmappable input", () => {
    expect(stylesFromDescriptors([])).toEqual([]);
    expect(stylesFromDescriptors([""])).toEqual([]);
    expect(stylesFromDescriptors(["a cool dragon on my arm"])).toEqual([]);
  });

  it("only ever returns canonical graph style names", () => {
    const styles = stylesFromDescriptors([
      "anime manga chicano tribal watercolor geometric script minimal",
    ]);
    for (const s of styles) {
      expect(CANONICAL_STYLES).toContain(s);
    }
  });
});

describe("parseStylesParam", () => {
  it("parses a comma-separated list of canonical styles", () => {
    expect(parseStylesParam("Blackwork,Traditional")).toEqual([
      "Blackwork",
      "Traditional",
    ]);
  });

  it("is case-insensitive and canonicalizes casing", () => {
    expect(parseStylesParam("blackwork,fine line")).toEqual(["Blackwork", "Fine Line"]);
  });

  it("drops unknown styles instead of passing garbage to the API", () => {
    expect(parseStylesParam("Blackwork,DROP TABLE,Vaporwave")).toEqual(["Blackwork"]);
    expect(parseStylesParam("nonsense")).toEqual([]);
  });

  it("dedupes and trims", () => {
    expect(parseStylesParam(" Blackwork , blackwork ,Traditional")).toEqual([
      "Blackwork",
      "Traditional",
    ]);
  });

  it("caps at three styles", () => {
    expect(
      parseStylesParam("Traditional,Blackwork,Fine Line,Realism,Japanese"),
    ).toHaveLength(3);
  });

  it("handles null/undefined/empty safely", () => {
    expect(parseStylesParam(null)).toEqual([]);
    expect(parseStylesParam(undefined)).toEqual([]);
    expect(parseStylesParam("")).toEqual([]);
    expect(parseStylesParam(",,,")).toEqual([]);
  });
});

describe("ontology → canonical style bridge", () => {
  // Read the real ontology so growth of data/style-ontology.json flags any
  // new tag that is neither mapped nor explicitly listed as unmapped.
  const ontologyPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../data/style-ontology.json",
  );
  const ontology = JSON.parse(readFileSync(ontologyPath, "utf8")) as {
    tags: Array<{ id: string; label: string; parent?: string }>;
  };
  const ontologyTags = ontology.tags;
  const ontologyIds = ontology.tags.map((t) => t.id);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accounts for every current ontology id — resolved or explicitly dropped", () => {
    // There is no hand-written mapping left to fall out of step (the old
    // ONTOLOGY_TO_CANONICAL_STYLE / UNMAPPED_ONTOLOGY_TAGS pair is gone).
    // What still has to hold is that every tag gets a decision, and that a
    // resolved one lands on a style the UI actually offers.
    for (const id of ontologyIds) {
      const style = canonicalStyleForTag(id);
      if (style !== null) {
        expect(CANONICAL_STYLES, `ontology tag "${id}" resolved to "${style}"`).toContain(style);
      }
    }
  });

  it("resolves a tag only to itself or an ancestor, never a sideways guess", () => {
    const byId = new Map(ontologyTags.map((t) => [t.id, t]));
    for (const id of ontologyIds) {
      const style = canonicalStyleForTag(id);
      if (style === null) continue;
      // Walk the parent chain and check the resolved style is on it.
      const chain: string[] = [];
      let cursor: string | undefined = id;
      while (cursor) {
        chain.push(byId.get(cursor)!.label);
        cursor = byId.get(cursor)?.parent;
      }
      expect(chain, `"${id}" resolved to "${style}", which is not on its parent chain`).toContain(
        style,
      );
    }
  });

  it("maps a brief's ontology tags to canonical styles in order", () => {
    expect(canonicalStylesFromOntologyTags(["fine-line", "blackwork"])).toEqual([
      "Fine Line",
      "Blackwork",
    ]);
  });

  it("dedupes tags that collapse into the same canonical style", () => {
    expect(canonicalStylesFromOntologyTags(["japanese", "irezumi"])).toEqual(["Japanese"]);
    expect(canonicalStylesFromOntologyTags(["anime", "manga"])).toEqual(["Anime"]);
  });

  it("drops unmapped tags with a logged note instead of guessing", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    expect(canonicalStylesFromOntologyTags(["surrealism", "fine-line", "color"])).toEqual([
      "Fine Line",
    ]);
    expect(info).toHaveBeenCalledTimes(1);
    expect(info.mock.calls[0][0]).toContain("surrealism");
    expect(info.mock.calls[0][0]).toContain("color");
  });

  it("logs nothing when every tag maps", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    canonicalStylesFromOntologyTags(["blackwork"]);
    expect(info).not.toHaveBeenCalled();
  });

  it("caps the signal at three styles and handles empty input", () => {
    expect(
      canonicalStylesFromOntologyTags(["traditional", "blackwork", "fine-line", "realism"]),
    ).toEqual(["Traditional", "Blackwork", "Fine Line"]);
    expect(canonicalStylesFromOntologyTags([])).toEqual([]);
  });
});

describe("artistsUrlForDesign", () => {
  it("filters the directory by the strongest extracted style", () => {
    const url = artistsUrlForDesign("skull, heavy black linework, traditional flash");
    const params = new URLSearchParams(url.split("?")[1]);
    expect(url.startsWith("/artists?")).toBe(true);
    expect(params.get("style")).toBe("Traditional");
  });

  it("falls back to Blackwork (the forge's actual output style) when the prompt names none", () => {
    const url = artistsUrlForDesign("a cool dragon on my arm");
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("style")).toBe("Blackwork");
  });

  it("emits a style the directory's filter vocabulary accepts", () => {
    const url = artistsUrlForDesign("neo-traditional rose, fine line");
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("style")).toBe("Neo-Traditional");
    expect(CANONICAL_STYLES).toContain(params.get("style"));
  });
});

describe("smartMatchUrlForDesign", () => {
  it("prefers the design-session id — the brief outranks any prompt signal", () => {
    expect(smartMatchUrlForDesign("neo-traditional rose", "sess-42")).toBe(
      "/smart-match?ds=sess-42",
    );
  });

  it("URL-encodes session ids safely", () => {
    expect(smartMatchUrlForDesign("", "sess/odd id")).toBe(
      `/smart-match?ds=${encodeURIComponent("sess/odd id")}`,
    );
  });

  it("carries extracted styles as ?styles= when no session exists", () => {
    const url = smartMatchUrlForDesign("skull, heavy black linework, traditional flash");
    const params = new URLSearchParams(url.split("?")[1]);
    expect(url.startsWith("/smart-match?")).toBe(true);
    expect(params.get("styles")).toBe("Traditional,Blackwork");
  });

  it("round-trips through parseStylesParam", () => {
    const url = smartMatchUrlForDesign("neo-traditional rose, fine line");
    const params = new URLSearchParams(url.split("?")[1]);
    expect(parseStylesParam(params.get("styles"))).toEqual(["Neo-Traditional", "Fine Line"]);
  });

  it("hands off clean when the prompt names no style and no session exists", () => {
    expect(smartMatchUrlForDesign("a cool dragon on my arm")).toBe("/smart-match");
    expect(smartMatchUrlForDesign("")).toBe("/smart-match");
  });
});

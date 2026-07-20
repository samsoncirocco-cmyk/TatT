import { describe, it, expect } from "vitest";
import {
  CANONICAL_STYLES,
  stylesFromDescriptors,
  parseStylesParam,
  matchesUrlForDesign,
} from "./design-style-signal";

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

describe("matchesUrlForDesign", () => {
  it("carries extracted styles plus from=design", () => {
    const url = matchesUrlForDesign("skull, heavy black linework, traditional flash");
    const params = new URLSearchParams(url.split("?")[1]);
    expect(url.startsWith("/matches?")).toBe(true);
    expect(params.get("from")).toBe("design");
    expect(parseStylesParam(params.get("styles"))).toEqual([
      "Traditional",
      "Blackwork",
    ]);
  });

  it("falls back to Blackwork (the forge's actual output style) when the prompt names none", () => {
    const url = matchesUrlForDesign("a cool dragon on my arm");
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("styles")).toBe("Blackwork");
    expect(params.get("from")).toBe("design");
  });

  it("round-trips through parseStylesParam", () => {
    const url = matchesUrlForDesign("neo-traditional rose, fine line");
    const params = new URLSearchParams(url.split("?")[1]);
    expect(parseStylesParam(params.get("styles"))).toEqual([
      "Neo-Traditional",
      "Fine Line",
    ]);
  });
});

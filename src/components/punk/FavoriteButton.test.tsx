// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import FavoriteButton, { hitBoxSize } from "./FavoriteButton";

/**
 * Phone-first tap targets: the visible heart can stay small, but the
 * button's hit box must never drop below the 44px mobile minimum —
 * the roster passes size=20 (a 32px box before this floor existed).
 */
describe("FavoriteButton hit box", () => {
  it("floors the hit box at 44px for small icon sizes", () => {
    expect(hitBoxSize(20)).toBe(44);
    expect(hitBoxSize(28)).toBe(44);
    // Above the floor, icon + padding wins.
    expect(hitBoxSize(40)).toBe(52);
  });

  it("renders the floored hit box as inline width/height", () => {
    const { getByRole } = render(
      <FavoriteButton slug="sam-ink-artist_1" label="Sam Ink" size={20} />,
    );
    const button = getByRole("button");
    expect(button.style.width).toBe("44px");
    expect(button.style.height).toBe("44px");
  });
});

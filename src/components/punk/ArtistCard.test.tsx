// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import ArtistCard from "./ArtistCard";

/**
 * The /artists roster card must degrade honestly when an artist has no
 * displayable portfolio image — which is exactly what every unclaimed
 * artist's card becomes when the SHOW_UNCLAIMED_PORTFOLIOS kill switch is
 * off (TAT-31). No photo: a color block with a monogram and the handle
 * sticker, never a broken <img> or fake imagery.
 */
describe("ArtistCard empty-image state", () => {
  const base = {
    slug: "sam-ink-artist_1",
    name: "Sam Ink",
    city: "Austin, TX",
    color: "bg-pink",
    style: "Blackwork",
  };

  it("renders the portfolio image when one is provided", () => {
    const { container } = render(
      <ArtistCard
        {...base}
        image="https://storage.googleapis.com/tatt-pro-assets/artists/artist_1/0.jpg"
        handle="@sam.ink"
      />,
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toContain("artists/artist_1/0.jpg");
  });

  it("falls back to monogram + handle sticker with no image — no <img> at all", () => {
    const { container, getByText } = render(
      <ArtistCard {...base} image={undefined} handle="@sam.ink" />,
    );
    expect(container.querySelector("img")).toBeNull();
    // Monogram from the name, so the tile reads deliberate, not broken.
    expect(getByText("SI")).toBeTruthy();
    expect(getByText("@sam.ink")).toBeTruthy();
    // Name and meta still render.
    expect(getByText("Sam Ink")).toBeTruthy();
    expect(getByText("Austin, TX")).toBeTruthy();
  });

  it("stays sane with neither image nor handle (bare color block)", () => {
    const { container, getByText } = render(<ArtistCard {...base} />);
    expect(container.querySelector("img")).toBeNull();
    expect(getByText("Sam Ink")).toBeTruthy();
  });
});

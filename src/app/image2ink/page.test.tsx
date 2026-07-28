// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Image2InkLanding, { metadata } from "./page";

afterEach(cleanup);

/**
 * The two-door brand guide (docs/brand/two-door-brand-guide.md) is binding:
 * one product, one signup. The Image2Ink door has no pages of its own —
 * every path off it must land on the TattTester flow.
 */
describe("Image2Ink landing (TAT-46)", () => {
  it("sends every CTA to the TattTester flow — no local routes, no second signup", () => {
    const { container } = render(<Image2InkLanding />);
    const anchors = Array.from(container.querySelectorAll("a"));
    expect(anchors.length).toBeGreaterThan(0);
    for (const a of anchors) {
      const href = a.getAttribute("href") ?? "";
      // In-page anchors (See how it works ↓) are the only non-TattTester links.
      if (href.startsWith("#")) continue;
      expect(href).toMatch(/^https:\/\/tatttester\.com\//);
    }
  });

  it("resolves the primary CTAs to /signup and the generator link to /design", () => {
    render(<Image2InkLanding />);

    const earlyAccess = screen
      .getAllByRole("link", { name: /get early access/i })
      .map((a) => a.getAttribute("href"));
    expect(earlyAccess.length).toBeGreaterThanOrEqual(2);
    for (const href of earlyAccess) {
      expect(href).toBe("https://tatttester.com/signup");
    }

    expect(
      screen
        .getByRole("link", { name: /try the generator/i })
        .getAttribute("href")
    ).toBe("https://tatttester.com/design");
  });

  it("carries the TattTester attribution lockup in the footer", () => {
    render(<Image2InkLanding />);
    expect(
      screen.getByText(/Image2Ink is the design engine inside TattTester/i)
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /get early access to TattTester/i })
        .getAttribute("href")
    ).toBe("https://tatttester.com/signup");
  });

  it("lands the artist-match twist — the designs lead to a real artist", () => {
    render(<Image2InkLanding />);
    expect(
      screen.getByText(
        /The designs are the fun part\. The artist is the real part/i
      )
    ).toBeTruthy();
    expect(screen.getByText(/Meet your artist/i)).toBeTruthy();
  });

  it("keeps CTAs waitlist-honest — no 'sign up free' / 'start now' promises", () => {
    const { container } = render(<Image2InkLanding />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/sign up free/i);
    expect(text).not.toMatch(/start designing now/i);
  });

  it("declares image2ink.com's single page as its own canonical", () => {
    expect(metadata.alternates?.canonical).toBe("https://image2ink.com/");
  });
});

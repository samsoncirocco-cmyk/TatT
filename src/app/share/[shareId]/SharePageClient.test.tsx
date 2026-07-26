// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SharePageClient } from "./SharePageClient";

afterEach(cleanup);

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const base = {
  shareId: "abc1234567",
  imageUrl: "https://cdn.example.com/one.png",
  prompt: "a tiger, blackwork",
  sharedAt: "2026-07-25T00:00:00.000Z",
  views: 3,
};

function imagesOnScreen(): string[] {
  return Array.from(document.querySelectorAll("img")).map((i) => i.getAttribute("src") ?? "");
}

describe("SharePageClient — what a stranger actually sees", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  // Links minted before multi-cut sharing carry only imageUrl. They are out
  // in the world already and must keep resolving exactly as they did.
  it("renders a single-cut share with no gallery chrome", () => {
    render(<SharePageClient design={base} />);

    expect(imagesOnScreen()).toEqual(["https://cdn.example.com/one.png"]);
    expect(screen.queryByText(/all \d+ cuts/i)).toBeNull();
    expect(screen.getByText(base.prompt)).toBeTruthy();
  });

  it("renders every cut of a multi-cut share, cover first", () => {
    const imageUrls = [
      "https://cdn.example.com/one.png",
      "https://cdn.example.com/two.png",
      "https://cdn.example.com/three.png",
    ];
    render(<SharePageClient design={{ ...base, imageUrls }} />);

    expect(screen.getByText(/all 3 cuts/i)).toBeTruthy();
    // Cover in the canvas plus one thumbnail per cut.
    expect(imagesOnScreen()).toEqual([imageUrls[0], ...imageUrls]);
    expect(screen.getByLabelText("View cut 1 of 3").getAttribute("aria-pressed")).toBe(
      "true"
    );
  });

  it("swaps the cover when a stranger taps another cut", () => {
    const imageUrls = ["https://cdn.example.com/one.png", "https://cdn.example.com/two.png"];
    render(<SharePageClient design={{ ...base, imageUrls }} />);

    fireEvent.click(screen.getByLabelText("View cut 2 of 2"));

    expect(imagesOnScreen()[0]).toBe(imageUrls[1]);
    expect(screen.getByLabelText("View cut 2 of 2").getAttribute("aria-pressed")).toBe(
      "true"
    );
  });

  it("admits it when the clipboard is blocked instead of faking a copy", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    render(<SharePageClient design={base} />);

    fireEvent.click(screen.getByText("Copy"));

    expect(await screen.findByText(/copy blocked by the browser/i)).toBeTruthy();
    expect(screen.queryByText("Copied ✓")).toBeNull();
  });

  // The page is the first thing a stranger sees, so it has to be on-system:
  // no purple, no grey scale, no radii, no emoji wordmark.
  it("carries no off-system styling", () => {
    render(<SharePageClient design={base} />);
    const markup = document.body.innerHTML;

    expect(markup).not.toMatch(/purple-/);
    expect(markup).not.toMatch(/text-gray-|bg-gray-|border-gray-/);
    expect(markup).not.toMatch(/rounded-(sm|md|lg|xl|2xl|3xl)/);
    expect(markup).not.toMatch(/1DA1F2/);
    expect(markup).not.toContain("🎨");
  });
});

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, waitFor } from "@testing-library/react";

/**
 * The Instagram embed tier (TAT-40) renders unclaimed artists' work through
 * Meta's official blockquote + embed.js pattern — permalink in, Instagram-
 * served media out, nothing cached on TatT infrastructure. These tests pin
 * the three behaviors that matter:
 *   - the blockquote carries the permalink (that IS the embed contract),
 *   - nothing but a canonical permalink ever reaches a blockquote,
 *   - when embed.js can't process, the caller's fallback renders — never a
 *     dead box.
 *
 * The module keeps one shared script-load promise per page, so each test
 * imports a fresh copy via resetModules.
 */

const PERMALINK = "https://www.instagram.com/p/Abc123xyz/";

async function freshComponent() {
  vi.resetModules();
  const mod = await import("./InstagramEmbed");
  return mod.default;
}

function embedScriptEl(): HTMLScriptElement | null {
  return document.querySelector('script[src="https://www.instagram.com/embed.js"]');
}

beforeEach(() => {
  // jsdom has no IntersectionObserver by default — the component then loads
  // immediately, which also keeps these tests independent of observer wiring.
  // The lazy-load test below stubs one in explicitly.
  delete (window as any).instgrm;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  embedScriptEl()?.remove();
});

describe("InstagramEmbed", () => {
  it("renders the official blockquote carrying the permalink, with an honest pre-JS link", async () => {
    const InstagramEmbed = await freshComponent();
    const { container } = render(<InstagramEmbed permalink={PERMALINK} />);
    const bq = container.querySelector("blockquote.instagram-media");
    expect(bq).not.toBeNull();
    expect(bq?.getAttribute("data-instgrm-permalink")).toBe(PERMALINK);
    const link = bq?.querySelector("a");
    expect(link?.getAttribute("href")).toBe(PERMALINK);
    // No hosted media anywhere — permalink only until Instagram takes over.
    expect(container.querySelector("img")).toBeNull();
  });

  it("loads embed.js once for the whole page, not per instance", async () => {
    const InstagramEmbed = await freshComponent();
    render(
      <>
        <InstagramEmbed permalink={PERMALINK} />
        <InstagramEmbed permalink="https://www.instagram.com/reel/Def456/" />
      </>,
    );
    await waitFor(() => expect(embedScriptEl()).not.toBeNull());
    expect(
      document.querySelectorAll('script[src="https://www.instagram.com/embed.js"]'),
    ).toHaveLength(1);
  });

  it("refuses non-canonical permalinks outright and renders the fallback", async () => {
    const InstagramEmbed = await freshComponent();
    const cases = [
      "https://evil.example.com/p/Abc123/",
      "https://www.instagram.com/some.artist/",
      "javascript:alert(1)",
      "",
    ];
    for (const bad of cases) {
      const { container, unmount } = render(
        <InstagramEmbed permalink={bad} fallback={<div data-testid="stub" />} />,
      );
      expect(container.querySelector("blockquote")).toBeNull();
      expect(container.querySelector('[data-testid="stub"]')).not.toBeNull();
      unmount();
    }
    // And no script fetch was ever kicked off for invalid input.
    expect(embedScriptEl()).toBeNull();
  });

  it("falls back when embed.js fails to load — never a dead blockquote", async () => {
    const InstagramEmbed = await freshComponent();
    const { container } = render(
      <InstagramEmbed permalink={PERMALINK} fallback={<div data-testid="stub" />} />,
    );
    await waitFor(() => expect(embedScriptEl()).not.toBeNull());
    embedScriptEl()!.dispatchEvent(new Event("error"));
    await waitFor(() => {
      expect(container.querySelector('[data-testid="stub"]')).not.toBeNull();
    });
    expect(container.querySelector("blockquote")).toBeNull();
  });

  it("keeps the embed once embed.js processes the blockquote", async () => {
    const InstagramEmbed = await freshComponent();
    const { container } = render(
      <InstagramEmbed permalink={PERMALINK} fallback={<div data-testid="stub" />} />,
    );
    await waitFor(() => expect(embedScriptEl()).not.toBeNull());
    // What the real embed.js does: marks the blockquote rendered and mounts
    // Instagram's iframe next to it.
    (window as any).instgrm = {
      Embeds: {
        process: () => {
          const bq = container.querySelector("blockquote.instagram-media")!;
          bq.classList.add("instagram-media-rendered");
          bq.parentElement!.appendChild(document.createElement("iframe"));
        },
      },
    };
    embedScriptEl()!.dispatchEvent(new Event("load"));
    await waitFor(() => {
      expect(container.querySelector("iframe")).not.toBeNull();
    });
    // Settled as embedded: fallback never appears.
    expect(container.querySelector('[data-testid="stub"]')).toBeNull();
  });

  it("defers embed.js until the embed nears the viewport (IntersectionObserver)", async () => {
    const InstagramEmbed = await freshComponent();
    let intersect: (() => void) | undefined;
    class FakeObserver {
      constructor(private cb: (entries: any[]) => void) {}
      observe() {
        intersect = () => this.cb([{ isIntersecting: true }]);
      }
      disconnect() {}
    }
    vi.stubGlobal("IntersectionObserver", FakeObserver as any);

    const { container } = render(<InstagramEmbed permalink={PERMALINK} />);
    // Off-screen: blockquote is in the DOM but embed.js has NOT been fetched.
    expect(container.querySelector("blockquote.instagram-media")).not.toBeNull();
    expect(embedScriptEl()).toBeNull();

    act(() => intersect!());
    await waitFor(() => expect(embedScriptEl()).not.toBeNull());
  });
});

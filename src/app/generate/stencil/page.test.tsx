// The Forge page retired as a destination (ADR-0028) — the route is now a
// server redirect into the one door, forwarding ?prompt= deep links so old
// "Iterate" URLs land in the design session with their prompt intact.
import { describe, it, expect, vi, beforeEach } from "vitest";
import StencilPage from "./page";

const redirect = vi.fn((url: string) => {
  // Mirror next/navigation: redirect() never returns.
  throw new Error(`NEXT_REDIRECT:${url}`);
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
}));

async function renderPage(searchParams: { prompt?: string | string[] }) {
  await expect(
    StencilPage({ searchParams: Promise.resolve(searchParams) })
  ).rejects.toThrow(/NEXT_REDIRECT/);
}

describe("/generate/stencil (retired Forge)", () => {
  beforeEach(() => {
    redirect.mockClear();
  });

  it("redirects to /design", async () => {
    await renderPage({});
    expect(redirect).toHaveBeenCalledWith("/design");
  });

  it("forwards a ?prompt= deep link into the design session", async () => {
    await renderPage({ prompt: "snake & dagger, inner forearm" });
    expect(redirect).toHaveBeenCalledWith(
      `/design?prompt=${encodeURIComponent("snake & dagger, inner forearm")}`
    );
  });

  it("takes the first value of a repeated prompt param", async () => {
    await renderPage({ prompt: ["first", "second"] });
    expect(redirect).toHaveBeenCalledWith("/design?prompt=first");
  });
});

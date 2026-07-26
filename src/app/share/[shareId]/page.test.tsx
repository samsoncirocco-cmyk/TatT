// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import SharePage, { generateMetadata } from "./page";

// notFound() throws in Next; make that observable.
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const share = {
  shareId: "abc1234567",
  imageUrl: "https://cdn.example.com/cut.png",
  prompt: "a tiger, blackwork",
  style: "blackwork",
  sharedAt: "2026-07-25T00:00:00.000Z",
  shareUrl: "https://tatt.app/share/abc1234567",
  views: 1,
};

describe("SharePage — the link a user just minted must resolve", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_BASE_URL = "https://tatt.app";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // params is a Promise in the app router. Reading `.shareId` off it without
  // awaiting fetched /share/undefined and 404'd every real share link.
  it("awaits params and fetches the share by its actual id", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => share }));
    vi.stubGlobal("fetch", fetchMock);

    await SharePage({ params: Promise.resolve({ shareId: "abc1234567" }) });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://tatt.app/api/v1/designs/share/abc1234567"
    );
  });

  it("builds share metadata from the fetched design, not from undefined", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => share })));

    const meta = await generateMetadata({
      params: Promise.resolve({ shareId: "abc1234567" }),
    });

    expect(meta.title).toContain("blackwork");
    expect(meta.openGraph?.images?.[0].url).toBe(share.imageUrl);
  });

  it("404s only when the share genuinely is not there", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => ({}) })));

    await expect(
      SharePage({ params: Promise.resolve({ shareId: "missing" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

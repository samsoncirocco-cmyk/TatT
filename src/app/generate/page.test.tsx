// The Studio moved to /studio (TAT-54, closing ADR-0028's deferred route
// naming cleanup). /generate is now a server redirect that forwards every
// query param, so carried design ids and old deep links survive the hop.
import { describe, it, expect, vi, beforeEach } from "vitest";
import GeneratePage from "./page";

const redirect = vi.fn((url: string) => {
  // Mirror next/navigation: redirect() never returns.
  throw new Error(`NEXT_REDIRECT:${url}`);
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
}));

async function renderPage(
  searchParams: Record<string, string | string[] | undefined>,
) {
  await expect(
    GeneratePage({ searchParams: Promise.resolve(searchParams) }),
  ).rejects.toThrow(/NEXT_REDIRECT/);
}

describe("/generate (the Studio's old path)", () => {
  beforeEach(() => {
    redirect.mockClear();
  });

  it("redirects to /studio", async () => {
    await renderPage({});
    expect(redirect).toHaveBeenCalledWith("/studio");
  });

  it("forwards a carried design id", async () => {
    await renderPage({ design: "design-7" });
    expect(redirect).toHaveBeenCalledWith("/studio?design=design-7");
  });

  it("forwards every param, encoded so it survives the round trip", async () => {
    await renderPage({ design: "design-7", ds: "sess/odd id" });
    const [target] = redirect.mock.calls[0];
    const params = new URLSearchParams(target.split("?")[1]);
    expect(params.get("design")).toBe("design-7");
    expect(params.get("ds")).toBe("sess/odd id");
  });

  it("keeps repeated params rather than dropping them", async () => {
    await renderPage({ tag: ["one", "two"] });
    expect(redirect).toHaveBeenCalledWith("/studio?tag=one&tag=two");
  });

  it("skips undefined values", async () => {
    await renderPage({ design: "design-7", missing: undefined });
    expect(redirect).toHaveBeenCalledWith("/studio?design=design-7");
  });
});

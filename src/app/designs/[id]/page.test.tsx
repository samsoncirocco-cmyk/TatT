// @vitest-environment jsdom
import { Suspense } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import DesignDetailPage from "./page";
import { addDesignToStorage } from "@/lib/tattStorage";

afterEach(cleanup);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/studio/StudioShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Signed in, so the share action renders as a button rather than a sign-in link.
vi.mock("@/lib/client-api-auth", () => ({
  getApiAuthHeaders: vi.fn(async () => ({ Authorization: "Bearer token" })),
}));

/** `use(params)` suspends once, so the render has to be flushed inside act. */
async function renderDetail(id: string) {
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <DesignDetailPage params={Promise.resolve({ id })} />
      </Suspense>
    );
  });
}

describe("DesignDetailPage — share action", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("offers a share action for a saved cut", async () => {
    const { id } = addDesignToStorage("a tiger", {
      image: "https://cdn.example.com/cut.png",
    });

    await renderDetail(id);

    // Signed out (no Firebase user in jsdom) the action must route to sign-in
    // rather than presenting a button that would fail on press.
    expect(await screen.findByText("▸ Sign in to share")).toBeTruthy();
  });
});

describe("DesignDetailPage — funnel CTAs", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("routes to the AR mirror with this design preselected", async () => {
    const { id } = addDesignToStorage("a tiger", {
      image: "https://cdn.example.com/cut.png",
    });

    await renderDetail(id);

    expect(
      screen.getByRole("link", { name: /see it on your skin/i }).getAttribute("href")
    ).toBe(`/visualize?${new URLSearchParams({ design: id }).toString()}`);
  });

  it("threads the design-session id into both forward CTAs when the cut has one", async () => {
    const { id } = addDesignToStorage("a tiger", {
      image: "https://cdn.example.com/cut.png",
      sessionId: "sess-7",
    });

    await renderDetail(id);

    expect(
      screen.getByRole("link", { name: /see it on your skin/i }).getAttribute("href")
    ).toBe(`/visualize?${new URLSearchParams({ design: id, ds: "sess-7" }).toString()}`);
    expect(
      screen.getByRole("link", { name: /find your artist/i }).getAttribute("href")
    ).toBe("/smart-match?ds=sess-7");
  });

  it("opens the Studio carrying this design (ADR-0038: entry from a picked design)", async () => {
    const { id } = addDesignToStorage("a tiger", {
      image: "https://cdn.example.com/cut.png",
    });

    await renderDetail(id);

    expect(
      screen.getByRole("link", { name: /fix it in the studio/i }).getAttribute("href")
    ).toBe(`/studio?design=${id}`);
  });

  it("offers no Studio door for an idea with no cut yet", async () => {
    const { id } = addDesignToStorage("a tiger");

    await renderDetail(id);

    expect(screen.queryByRole("link", { name: /fix it in the studio/i })).toBeNull();
  });

  it("falls back to the prompt's style signal for sessionless cuts", async () => {
    const { id } = addDesignToStorage("heavy black linework skull", {
      image: "https://cdn.example.com/cut.png",
    });

    await renderDetail(id);

    expect(
      screen.getByRole("link", { name: /find your artist/i }).getAttribute("href")
    ).toBe(`/smart-match?${new URLSearchParams({ styles: "Blackwork" }).toString()}`);
  });

  it("makes the customer's current stage and next move explicit", async () => {
    const { id } = addDesignToStorage("a tiger", {
      image: "https://cdn.example.com/cut.png",
    });

    await renderDetail(id);

    expect(screen.getByText("Recommended next move")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: /ready for placement/i }),
    ).toBeTruthy();
    expect(screen.getByRole("list", { name: "Suggested tattoo path" })).toBeTruthy();
  });
});

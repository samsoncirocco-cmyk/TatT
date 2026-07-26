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

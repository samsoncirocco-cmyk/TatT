// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import SmartMatchClient from "./SmartMatchClient";

const push = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams,
}));

vi.mock("@/components/studio/StudioShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="shell">{children}</div>
  ),
}));

vi.mock("@/components/punk/SlashHeadline", () => ({
  default: ({ before, slashed }: { before: string; slashed: string }) => (
    <h1>
      {before} {slashed}
    </h1>
  ),
}));

vi.mock("@/lib/client-api-auth", () => ({
  getApiAuthHeaders: vi.fn(async () => ({ Authorization: "Bearer test-token" })),
}));

const setMatches = vi.fn();
vi.mock("@/store/useMatchStore", () => ({
  useMatchStore: (selector: (s: { setMatches: typeof setMatches }) => unknown) =>
    selector({ setMatches }),
}));

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response;
}

const completeSessionEnvelope = {
  success: true,
  session: {
    id: "sess-1",
    phase: "complete",
    brief: {
      placement: "inner forearm",
      // fine-line + blackwork map to canonical pills; surrealism is
      // explicitly unmapped and must be dropped, not guessed at.
      styleTags: ["fine-line", "blackwork", "surrealism"],
      meaning: "strength after a rough year",
      references: [],
      axisSelection: { mode: "compositional", axes: [], rationale: "resolved" },
      placementNotes: [],
    },
  },
};

const liveMatchResponse = {
  success: true,
  query_info: { graphSource: "live" },
  matches: [
    { id: "a1", name: "Ink Nova", score: 88, styles: ["Fine Line"], location: "LA" },
  ],
};

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  push.mockClear();
  setMatches.mockClear();
  searchParams = new URLSearchParams();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("SmartMatchClient design-session prefill", () => {
  it("loads the brief, pre-selects mapped pills, enriches the query, auto-runs, and threads ds to /swipe", async () => {
    searchParams = new URLSearchParams("ds=sess-1");
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).startsWith("/api/v1/design-session/")) {
        return jsonResponse(completeSessionEnvelope);
      }
      if (String(url) === "/api/v1/match/semantic") {
        return jsonResponse(liveMatchResponse);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<SmartMatchClient />);

    await waitFor(() => expect(push).toHaveBeenCalledWith("/swipe?ds=sess-1"));

    // Session fetched with auth, per the frozen contract path.
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/design-session/sess-1",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
      })
    );

    // Auto-run search body: mapped canonical styles + brief-enriched query.
    const matchCall = fetchMock.mock.calls.find(
      ([url]) => String(url) === "/api/v1/match/semantic"
    );
    expect(matchCall).toBeTruthy();
    const body = JSON.parse((matchCall![1] as RequestInit).body as string);
    expect(body.style_preferences).toEqual(["Fine Line", "Blackwork"]);
    expect(body.query).toContain("inner forearm");
    expect(body.query).toContain("strength after a rough year");
    expect(body.query).toContain("Fine Line");

    // Pills pre-selected (and the unmapped tag dropped, not guessed).
    expect(
      screen.getByRole("button", { name: "Fine Line" }).getAttribute("aria-pressed")
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "Blackwork" }).getAttribute("aria-pressed")
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "Realism" }).getAttribute("aria-pressed")
    ).toBe("false");

    // Results landed in the store for /swipe.
    expect(setMatches).toHaveBeenCalledWith([
      expect.objectContaining({ artistId: "a1", artistName: "Ink Nova" }),
    ]);
  });

  it("keeps the brief context when the user edits and re-runs", async () => {
    searchParams = new URLSearchParams("ds=sess-1");
    // Auto-run finds nothing (error state re-enables the form — in the happy
    // path the page navigates away); the user's edited re-run then succeeds.
    let matchCallCount = 0;
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).startsWith("/api/v1/design-session/")) {
        return jsonResponse(completeSessionEnvelope);
      }
      matchCallCount += 1;
      return matchCallCount === 1
        ? jsonResponse({ success: true, query_info: { graphSource: "live" }, matches: [] })
        : jsonResponse(liveMatchResponse);
    });

    render(<SmartMatchClient />);
    await screen.findByText(/no artists match that combination yet/i);

    // User adds a style and re-runs manually.
    fireEvent.click(screen.getByRole("button", { name: "Realism" }));
    fireEvent.click(screen.getByRole("button", { name: /find artists/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/swipe?ds=sess-1"));
    const matchCalls = fetchMock.mock.calls.filter(
      ([url]) => String(url) === "/api/v1/match/semantic"
    );
    expect(matchCalls).toHaveLength(2);
    const body = JSON.parse((matchCalls[1][1] as RequestInit).body as string);
    expect(body.style_preferences).toEqual(["Fine Line", "Blackwork", "Realism"]);
    expect(body.query).toContain("inner forearm");
    expect(body.query).toContain("strength after a rough year");
  });

  it("falls back silently to the blank form when the session is missing", async () => {
    searchParams = new URLSearchParams("ds=sess-gone");
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).startsWith("/api/v1/design-session/")) {
        return jsonResponse({ error: "Session not found" }, false, 404);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<SmartMatchClient />);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/design-session/sess-gone",
        expect.anything()
      )
    );

    // No auto-search, no navigation, no error surfaced — just the blank form.
    expect(
      fetchMock.mock.calls.filter(([url]) => String(url) === "/api/v1/match/semantic")
    ).toHaveLength(0);
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /find artists/i })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Fine Line" }).getAttribute("aria-pressed")
    ).toBe("false");
    expect(screen.queryByText(/unreachable|failed|not found/i)).toBeNull();
  });

  it("falls back silently when the session fetch throws", async () => {
    searchParams = new URLSearchParams("ds=sess-err");
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).startsWith("/api/v1/design-session/")) {
        throw new Error("network down");
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<SmartMatchClient />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /find artists/i })).toBeTruthy();
  });

  it("does not touch the design-session API without a ds param", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(liveMatchResponse));

    render(<SmartMatchClient />);

    // Manual search still works and routes to plain /swipe.
    fireEvent.click(screen.getByRole("button", { name: "Blackwork" }));
    fireEvent.click(screen.getByRole("button", { name: /find artists/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/swipe"));

    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).startsWith("/api/v1/design-session/")
      )
    ).toHaveLength(0);
  });
});

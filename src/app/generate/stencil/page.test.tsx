// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import StencilPage from "./page";

afterEach(cleanup);

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/studio/StudioShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="shell">{children}</div>
  ),
}));

vi.mock("@/components/punk/SlashHeadline", () => ({
  default: ({ before, slashed }: { before: React.ReactNode; slashed: string }) => (
    <h1>
      {before} {slashed}
    </h1>
  ),
}));

vi.mock("@/lib/tattStorage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/tattStorage")>(
    "@/lib/tattStorage",
  );
  return {
    ...actual,
    // Real useDesigns so auto-save actually writes to localStorage.
    useUser: () => ({
      user: { id: "u1", email: "a@b.com" },
      hydrated: true,
      error: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      updateUser: vi.fn(),
      signOut: vi.fn(),
    }),
  };
});

vi.mock("@/lib/cloudSync", () => ({
  FREE_TIER_DAILY_CUTS: 10,
  getDailyUsage: vi.fn().mockResolvedValue(0),
  recordGeneration: vi.fn(),
}));

vi.mock("@/features/generate/services/replicateService", () => ({
  generateTattooDesign: vi.fn().mockResolvedValue({
    images: [
      "data:image/png;base64,one",
      "data:image/png;base64,two",
      "data:image/png;base64,three",
      "data:image/png;base64,four",
    ],
  }),
}));

// Sharing from the Forge goes through the same auth-gated client as
// /designs/[id]; stub the token so the request itself is what we assert on.
const getApiAuthHeaders = vi.fn(async () => ({ Authorization: "Bearer token" }));
vi.mock("@/lib/client-api-auth", () => ({
  getApiAuthHeaders: (...args: unknown[]) => getApiAuthHeaders(...(args as [])),
}));

function shareResponse(shareId: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      shareId,
      shareUrl: `https://tatt.app/share/${shareId}`,
    }),
  } as unknown as Response;
}

const mockImages = [
  "data:image/png;base64,one",
  "data:image/png;base64,two",
  "data:image/png;base64,three",
  "data:image/png;base64,four",
];

describe("Stencil Forge — auto-save on generate", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("auto-saves every generated cut to the library with no manual save step", async () => {
    render(<StencilPage />);

    const textarea = screen.getByLabelText(/Your description/i);
    fireEvent.change(textarea, { target: { value: "a phoenix, blackwork" } });

    fireEvent.click(screen.getByText("GENERATE"));

    await waitFor(() => {
      expect(screen.getAllByText(/★ Saved/i)).toHaveLength(4);
    });

    const stored = JSON.parse(localStorage.getItem("tatt:designs") || "[]");
    expect(stored).toHaveLength(4);
    expect(stored.map((d: { image?: string }) => d.image).sort()).toEqual(
      [...mockImages].sort(),
    );
    expect(stored.every((d: { prompt: string }) => d.prompt === "a phoenix, blackwork")).toBe(
      true,
    );

    // No separate "Save" action is offered — saving already happened.
    expect(screen.queryByText("Save")).toBeNull();
  });
});

/**
 * The owner's call: "allow customer to select an individual pic they want to
 * share or select all vs having 4 share buttons". So the Forge has exactly
 * one share control, and tapping a cut is what decides its contents.
 */
describe("Stencil Forge — select cuts, then share", () => {
  beforeEach(() => {
    localStorage.clear();
    getApiAuthHeaders.mockClear();
    getApiAuthHeaders.mockResolvedValue({ Authorization: "Bearer token" });
  });

  async function generate() {
    render(<StencilPage />);
    fireEvent.change(screen.getByLabelText(/Your description/i), {
      target: { value: "a phoenix, blackwork" },
    });
    fireEvent.click(screen.getByText("GENERATE"));
    await waitFor(() => expect(screen.getAllByText(/★ Saved/i)).toHaveLength(4));
  }

  function shareButton() {
    return screen
      .getAllByRole("button")
      .find((b) => /share|minting/i.test(b.textContent ?? "")) as HTMLButtonElement;
  }

  it("offers ONE share control for four cuts, not one per cut", async () => {
    await generate();

    const shareControls = screen
      .getAllByRole("button")
      .filter((b) => /share/i.test(b.textContent ?? ""));
    expect(shareControls).toHaveLength(1);
  });

  it("starts with nothing selected and refuses to share until the user picks", async () => {
    await generate();

    expect(screen.getByText(/0\s*of\s*4\s*selected/i)).toBeTruthy();
    expect(shareButton().disabled).toBe(true);
    expect(screen.getByText(/everything you select goes in one link/i)).toBeTruthy();
  });

  it("shares just the one cut the user selected", async () => {
    const fetchMock = vi.fn(async () => shareResponse("one1234567"));
    vi.stubGlobal("fetch", fetchMock);
    await generate();

    fireEvent.click(screen.getByLabelText("Select cut 2"));
    expect(screen.getByText(/1\s*of\s*4\s*selected/i)).toBeTruthy();

    fireEvent.click(shareButton());
    await screen.findByLabelText("Share link");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string).imageUrls).toEqual([mockImages[1]]);
    vi.unstubAllGlobals();
  });

  it("shares several selected cuts under a single link", async () => {
    const fetchMock = vi.fn(async () => shareResponse("many123456"));
    vi.stubGlobal("fetch", fetchMock);
    await generate();

    fireEvent.click(screen.getByLabelText("Select cut 1"));
    fireEvent.click(screen.getByLabelText("Select cut 3"));
    expect(screen.getByText(/2\s*of\s*4\s*selected/i)).toBeTruthy();

    fireEvent.click(shareButton());
    await screen.findByLabelText("Share link");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getAllByLabelText("Share link")).toHaveLength(1);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    // Grid order, not click order.
    expect(JSON.parse(init.body as string).imageUrls).toEqual([
      mockImages[0],
      mockImages[2],
    ]);
    vi.unstubAllGlobals();
  });

  it("selects all four in one tap, and clears them the same way", async () => {
    const fetchMock = vi.fn(async () => shareResponse("all1234567"));
    vi.stubGlobal("fetch", fetchMock);
    await generate();

    fireEvent.click(screen.getByText("Select all"));
    expect(screen.getByText(/4\s*of\s*4\s*selected/i)).toBeTruthy();

    fireEvent.click(shareButton());
    await screen.findByLabelText("Share link");
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string).imageUrls).toEqual(mockImages);

    // The same control now clears — and the link for the old selection goes
    // with it rather than sitting there describing a set nobody has.
    fireEvent.click(screen.getByText("Clear"));
    await waitFor(() => expect(screen.queryByLabelText("Share link")).toBeNull());
    expect(screen.getByText(/0\s*of\s*4\s*selected/i)).toBeTruthy();
    vi.unstubAllGlobals();
  });

  it("tapping a selected cut again deselects it", async () => {
    await generate();

    fireEvent.click(screen.getByLabelText("Select cut 2"));
    expect(screen.getByText(/1\s*of\s*4\s*selected/i)).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Select cut 2"));
    expect(screen.getByText(/0\s*of\s*4\s*selected/i)).toBeTruthy();
  });

  it("never shows a copyable link when the store is unavailable (503)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 503,
        json: async () => ({
          success: false,
          error: "Sharing is temporarily unavailable.",
          code: "SHARE_STORE_UNAVAILABLE",
        }),
      })),
    );
    await generate();

    fireEvent.click(screen.getByText("Select all"));
    fireEvent.click(shareButton());

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("No link was created");
    expect(screen.queryByLabelText("Share link")).toBeNull();
    expect(screen.queryByText("Copy")).toBeNull();
    expect(document.body.textContent).not.toContain("/share/");
    vi.unstubAllGlobals();
  });
});

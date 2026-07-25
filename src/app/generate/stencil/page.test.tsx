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

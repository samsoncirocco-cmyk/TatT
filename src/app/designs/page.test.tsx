// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import DesignsPage from "./page";
import { addDesignToStorage } from "@/lib/tattStorage";

afterEach(cleanup);

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

vi.mock("@/components/billing/BillingButtons", () => ({
  ManageBillingButton: ({ children }: { children: React.ReactNode }) => (
    <button>{children}</button>
  ),
}));

describe("DesignsPage — easy delete", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("quick single delete removes the design from storage", async () => {
    addDesignToStorage("a tiger");
    render(<DesignsPage />);

    const deleteBtn = await screen.findByLabelText(/Delete a tiger/i);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(deleteBtn);

    expect(screen.queryByText("a tiger")).toBeNull();
  });

  it("multi-select delete removes only the checked designs, honestly (storage reflects real state)", async () => {
    addDesignToStorage("first design");
    addDesignToStorage("second design");
    addDesignToStorage("third design");
    render(<DesignsPage />);

    expect((await screen.findAllByText("first design")).length).toBeGreaterThan(0);

    // Enter select mode.
    fireEvent.click(screen.getByText("Select"));

    // Select two of the three tiles.
    fireEvent.click(screen.getByLabelText(/Select first design/i));
    fireEvent.click(screen.getByLabelText(/Select third design/i));

    expect(screen.getByText("Delete selected (2)")).toBeTruthy();

    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByText("Delete selected (2)"));

    expect(screen.queryAllByText("first design")).toHaveLength(0);
    expect(screen.queryAllByText("third design")).toHaveLength(0);
    expect(screen.getAllByText("second design").length).toBeGreaterThan(0);

    const stored = JSON.parse(localStorage.getItem("tatt:designs") || "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].prompt).toBe("second design");
  });

  it("canceling select mode discards selection without deleting anything", async () => {
    addDesignToStorage("keep me");
    render(<DesignsPage />);

    fireEvent.click(await screen.findByText("Select"));
    fireEvent.click(screen.getByLabelText(/Select keep me/i));
    fireEvent.click(screen.getByText("Cancel"));

    expect(screen.getAllByText("keep me").length).toBeGreaterThan(0);
    const stored = JSON.parse(localStorage.getItem("tatt:designs") || "[]");
    expect(stored).toHaveLength(1);
  });
});

describe("DesignsPage — taste card (your ink identity so far)", () => {
  const CARD_LABEL = "Your ink identity so far";

  beforeEach(() => {
    localStorage.clear();
  });

  it("is absent on an empty library (no cold-start fakery)", async () => {
    render(<DesignsPage />);
    expect(await screen.findByText(/No cuts yet/)).toBeTruthy();
    expect(screen.queryByLabelText(CARD_LABEL)).toBeNull();
  });

  it("is absent below two data points even when the one save has a style", async () => {
    addDesignToStorage("blackwork raven");
    render(<DesignsPage />);
    expect((await screen.findAllByText("blackwork raven")).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText(CARD_LABEL)).toBeNull();
  });

  it("shows the read, the small-n honesty note, and the smart-match handoff", async () => {
    // addDesignToStorage prepends, so seed in reverse of display order —
    // order doesn't matter to the derivation anyway.
    addDesignToStorage("fine line fern");
    addDesignToStorage("blackwork moth");
    addDesignToStorage("blackwork raven");
    render(<DesignsPage />);

    const card = await screen.findByLabelText(CARD_LABEL);
    expect(card.textContent).toContain(
      "you keep coming back to blackwork — 2 of 3 saves",
    );
    // Honest about small n.
    expect(card.textContent).toContain("early read — 3 saves in");

    const cta = screen.getByRole("link", {
      name: /Find artists who match your taste/,
    });
    const href = cta.getAttribute("href")!;
    expect(href.startsWith("/smart-match?")).toBe(true);
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.get("styles")!.split(",")).toEqual(["Blackwork", "Fine Line"]);
  });
});

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

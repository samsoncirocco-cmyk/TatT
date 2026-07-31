// @vitest-environment jsdom
// The refinery's shell (TAT-54, ADR-0038): entered from a picked design,
// never from cold, and its exits are the funnel's forward doors.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import StudioPage from "./page";
import { addDesignToStorage } from "@/lib/tattStorage";

let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
  usePathname: () => "/studio",
}));

// The canvas itself belongs to the refinery experience build; this suite is
// only about the shell around it.
vi.mock("../../features/Generate.jsx", () => ({
  default: () => <div data-testid="studio-canvas" />,
}));

afterEach(cleanup);

describe("Studio entry", () => {
  beforeEach(() => {
    localStorage.clear();
    searchParams = new URLSearchParams();
  });

  it("does not open an empty canvas on a cold visit — it points at /design in voice", async () => {
    render(<StudioPage />);
    await waitFor(() => expect(screen.getByText(/nothing to refine yet/i)).toBeTruthy());
    expect(screen.queryByTestId("studio-canvas")).toBeNull();
    expect(
      screen.getByRole("link", { name: /start a design/i }).getAttribute("href"),
    ).toBe("/design");
  });

  it("offers the most recent saved cut when a cold visitor already has one", async () => {
    addDesignToStorage("an old idea", {});
    const recent = addDesignToStorage("a snake and dagger", {
      image: "https://cdn.example.com/cut.png",
    });

    render(<StudioPage />);
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: /refine a snake and/i }).getAttribute("href"),
      ).toBe(`/studio?design=${recent.id}`),
    );
    expect(screen.queryByTestId("studio-canvas")).toBeNull();
  });

  it("opens the canvas for a design carried in on ?design=", async () => {
    const { id } = addDesignToStorage("a snake and dagger", {
      image: "https://cdn.example.com/cut.png",
    });
    searchParams = new URLSearchParams(`design=${id}`);

    render(<StudioPage />);
    await waitFor(() => expect(screen.getByTestId("studio-canvas")).toBeTruthy());
    expect(screen.getByText(/the refinery/i)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /back to the design/i }).getAttribute("href"),
    ).toBe(`/designs/${id}`);
  });

  it("falls back to the picker when ?design= names a design that is gone", async () => {
    searchParams = new URLSearchParams("design=not-a-real-id");
    render(<StudioPage />);
    await waitFor(() => expect(screen.getByText(/nothing to refine yet/i)).toBeTruthy());
    expect(screen.queryByTestId("studio-canvas")).toBeNull();
  });
});

describe("Studio exits", () => {
  beforeEach(() => {
    localStorage.clear();
    searchParams = new URLSearchParams();
  });

  it("sends the design forward to the mirror and to matching", async () => {
    const { id } = addDesignToStorage("heavy black linework snake", {
      image: "https://cdn.example.com/cut.png",
      sessionId: "sess-9",
    });
    searchParams = new URLSearchParams(`design=${id}`);

    render(<StudioPage />);
    await waitFor(() => expect(screen.getByTestId("studio-canvas")).toBeTruthy());

    expect(
      screen.getByRole("link", { name: /see it on your skin/i }).getAttribute("href"),
    ).toBe(`/visualize?design=${id}&ds=sess-9`);
    expect(
      screen.getByRole("link", { name: /find your artist/i }).getAttribute("href"),
    ).toBe("/smart-match?ds=sess-9");
  });

  it("falls back to the prompt's style signal when there is no design session", async () => {
    const { id } = addDesignToStorage("heavy black linework snake", {
      image: "https://cdn.example.com/cut.png",
    });
    searchParams = new URLSearchParams(`design=${id}`);

    render(<StudioPage />);
    await waitFor(() => expect(screen.getByTestId("studio-canvas")).toBeTruthy());

    expect(
      screen.getByRole("link", { name: /see it on your skin/i }).getAttribute("href"),
    ).toBe(`/visualize?design=${id}`);
    expect(
      screen.getByRole("link", { name: /find your artist/i }).getAttribute("href"),
    ).toBe("/smart-match?styles=Blackwork");
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RosterControls, { SEARCH_DEBOUNCE_MS } from "./RosterControls";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("RosterControls search box", () => {
  beforeEach(() => {
    push.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces typed input instead of firing a query per keystroke", () => {
    render(
      <RosterControls styles={["Blackwork"]} q="" style="" hasPortfolio={false} />,
    );
    const input = screen.getByLabelText("▸ Search") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "a" } });
    fireEvent.change(input, { target: { value: "au" } });
    fireEvent.change(input, { target: { value: "aus" } });

    // No navigation yet — still inside the debounce window.
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
    expect(push).not.toHaveBeenCalled();

    // Debounce window elapses after the last keystroke.
    vi.advanceTimersByTime(1);
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/artists?q=aus");
  });

  it("preserves typing while a submitted query updates the URL", () => {
    const { rerender } = render(
      <RosterControls styles={["Blackwork"]} q="" style="" hasPortfolio={false} />,
    );
    const input = screen.getByLabelText("▸ Search") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "aus" } });
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    fireEvent.change(input, { target: { value: "austin" } });

    rerender(
      <RosterControls styles={["Blackwork"]} q="aus" style="" hasPortfolio={false} />,
    );

    expect(input.value).toBe("austin");
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    expect(push).toHaveBeenLastCalledWith("/artists?q=austin");
  });

  it("composes the query with an active style pill", () => {
    render(
      <RosterControls
        styles={["Blackwork"]}
        q=""
        style="Blackwork"
        hasPortfolio={false}
      />,
    );
    const input = screen.getByLabelText("▸ Search") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "austin" } });
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);

    expect(push).toHaveBeenCalledTimes(1);
    const url = new URL(push.mock.calls[0][0], "http://localhost");
    expect(url.searchParams.get("q")).toBe("austin");
    expect(url.searchParams.get("style")).toBe("Blackwork");
  });

  it("submits immediately on Enter, skipping the debounce wait", () => {
    render(
      <RosterControls styles={["Blackwork"]} q="" style="" hasPortfolio={false} />,
    );
    const input = screen.getByLabelText("▸ Search") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "austin" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/artists?q=austin");

    // The debounce timer that was scheduled on change must not double-fire.
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    expect(push).toHaveBeenCalledTimes(1);
  });

  it("does not navigate when the debounced value matches the current q", () => {
    render(
      <RosterControls styles={["Blackwork"]} q="austin" style="" hasPortfolio={false} />,
    );
    const input = screen.getByLabelText("▸ Search") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "austin" } });
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);

    expect(push).not.toHaveBeenCalled();
  });

  it("resets the pending debounce when Clear is pressed", () => {
    render(
      <RosterControls styles={["Blackwork"]} q="austin" style="" hasPortfolio={false} />,
    );
    const input = screen.getByLabelText("▸ Search") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "austin, tx" } });
    fireEvent.click(screen.getByText("Clear", { exact: false }));

    expect(push).toHaveBeenCalledWith("/artists");

    push.mockClear();
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    expect(push).not.toHaveBeenCalled();
  });
});

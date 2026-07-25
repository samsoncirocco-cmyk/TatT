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

  it("keeps a cleared search in sync while an earlier query navigation lands", () => {
    const { rerender } = render(
      <RosterControls styles={["Blackwork"]} q="" style="" hasPortfolio={false} />,
    );
    const input = screen.getByLabelText("▸ Search") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "aus" } });
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    fireEvent.change(input, { target: { value: "" } });
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);

    expect(push).toHaveBeenLastCalledWith("/artists");

    rerender(
      <RosterControls styles={["Blackwork"]} q="aus" style="" hasPortfolio={false} />,
    );
    expect(input.value).toBe("");

    rerender(
      <RosterControls styles={["Blackwork"]} q="" style="" hasPortfolio={false} />,
    );
    expect(input.value).toBe("");
  });

  // Regression: the URL→input sync used to be suppressed by a single "last
  // submitted value" latch that only released on an exact match. Any URL that
  // never matched left it armed forever, and the box stopped tracking the URL
  // for the rest of the session. Both routes below arm it and then check that
  // the box still follows subsequent navigations.

  it("keeps tracking the URL after Clear supersedes an in-flight search", () => {
    const { rerender } = render(
      <RosterControls styles={["Blackwork"]} q="austin" style="" hasPortfolio={false} />,
    );
    const input = screen.getByLabelText("▸ Search") as HTMLInputElement;

    // A debounced search goes out...
    fireEvent.change(input, { target: { value: "austin, tx" } });
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    expect(push).toHaveBeenLastCalledWith("/artists?q=austin%2C+tx");

    // ...then Clear supersedes it, so ?q=austin,+tx never lands: the URL goes
    // straight from ?q=austin to no query at all.
    fireEvent.click(screen.getByText("Clear", { exact: false }));
    rerender(
      <RosterControls styles={["Blackwork"]} q="" style="" hasPortfolio={false} />,
    );
    expect(input.value).toBe("");

    // Later, genuine external navigation (back button, a link, a shared URL).
    rerender(
      <RosterControls styles={["Blackwork"]} q="paris" style="" hasPortfolio={false} />,
    );
    expect(input.value).toBe("paris");
  });

  it("keeps tracking the URL when navigation lands somewhere other than the submitted query", () => {
    const { rerender } = render(
      <RosterControls styles={["Blackwork"]} q="paris" style="" hasPortfolio={false} />,
    );
    const input = screen.getByLabelText("▸ Search") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "austin" } });
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    expect(push).toHaveBeenLastCalledWith("/artists?q=austin");

    // The user navigates away before ?q=austin lands — the URL settles on a
    // query this component never submitted.
    rerender(
      <RosterControls styles={["Blackwork"]} q="london" style="" hasPortfolio={false} />,
    );
    expect(input.value).toBe("london");

    // ...and the box keeps following the URL from then on.
    rerender(
      <RosterControls styles={["Blackwork"]} q="tokyo" style="" hasPortfolio={false} />,
    );
    expect(input.value).toBe("tokyo");
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

// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Lightbox from "./Lightbox";
import OutputCard from "./OutputCard";

afterEach(cleanup);

describe("Lightbox", () => {
  it("renders the image large with caption and closes on ✕, Escape, and backdrop", () => {
    const onClose = vi.fn();
    render(
      <Lightbox src="data:image/png;base64,x" alt="Cut 1 large" caption="Cut 01 · 1024²" onClose={onClose} />
    );

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByAltText("Cut 1 large")).toBeTruthy();
    expect(screen.getByText("Cut 01 · 1024²")).toBeTruthy();

    fireEvent.click(screen.getByLabelText("Close large view"));
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("dialog")); // backdrop
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("pages with on-screen arrows and arrow keys when prev/next are provided", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <Lightbox src="x" alt="Cut 2" onClose={() => {}} onPrev={onPrev} onNext={onNext} />
    );

    fireEvent.click(screen.getByLabelText("Previous cut"));
    fireEvent.click(screen.getByLabelText("Next cut"));
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(onPrev).toHaveBeenCalledTimes(2);
    expect(onNext).toHaveBeenCalledTimes(2);
  });

  it("clicking the image itself does not close (only backdrop does)", () => {
    const onClose = vi.fn();
    render(<Lightbox src="x" alt="Cut 3" onClose={onClose} />);
    fireEvent.click(screen.getByAltText("Cut 3"));
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("OutputCard expand affordance", () => {
  it("renders a View control that fires onExpand, separate from select", () => {
    const onSelect = vi.fn();
    const onExpand = vi.fn();
    render(<OutputCard src="x" index={2} onSelect={onSelect} onExpand={onExpand} />);

    fireEvent.click(screen.getByLabelText("View cut 2 large"));
    expect(onExpand).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText("Select cut 2"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("renders no View control without onExpand (old callers unchanged)", () => {
    render(<OutputCard src="x" index={1} />);
    expect(screen.queryByLabelText(/View cut/)).toBeNull();
  });
});

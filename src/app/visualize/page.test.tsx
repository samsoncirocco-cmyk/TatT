// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import VisualizePage from "./page";
import { addDesignToStorage } from "@/lib/tattStorage";
import type { ARMirrorProps } from "@/features/ar";

let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

// The mirror itself is exercised in its own suite; here we only care about
// which context the page threads into it.
const mirrorProps: ARMirrorProps[] = [];
vi.mock("@/features/ar", () => ({
  ARMirror: (props: ARMirrorProps) => {
    mirrorProps.push(props);
    return <div data-testid="ar-mirror" />;
  },
}));

vi.mock("@/services/ar/arService", () => ({
  checkArSupport: () => ({ supported: true, message: "" }),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.ComponentProps<"div">) => (
      <div {...rest}>{children}</div>
    ),
  },
}));

afterEach(cleanup);

describe("VisualizePage funnel seams", () => {
  beforeEach(() => {
    localStorage.clear();
    mirrorProps.length = 0;
    searchParams = new URLSearchParams();
  });

  it("offers Find your artist forward — plain /smart-match with no context", () => {
    render(<VisualizePage />);
    expect(
      screen.getByRole("link", { name: /find your artist/i }).getAttribute("href")
    ).toBe("/smart-match");
  });

  it("threads ?ds= into the forward CTA and the mirror", async () => {
    const { id } = addDesignToStorage("a cool dragon", {
      image: "https://cdn.example.com/cut.png",
      sessionId: "sess-1",
    });
    searchParams = new URLSearchParams(`design=${id}&ds=sess-1`);

    render(<VisualizePage />);

    expect(
      screen.getByRole("link", { name: /find your artist/i }).getAttribute("href")
    ).toBe("/smart-match?ds=sess-1");

    // Opening the mirror carries the same design + forward context.
    fireEvent.click(await screen.findByRole("button", { name: /open ar mirror/i }));
    expect(mirrorProps.at(-1)).toMatchObject({
      initialSelectedId: id,
      findArtistHref: "/smart-match?ds=sess-1",
    });
  });

  it("falls back to the carried design's style signal when no session id exists", () => {
    const { id } = addDesignToStorage("heavy black linework skull", {
      image: "https://cdn.example.com/cut.png",
    });
    searchParams = new URLSearchParams(`design=${id}`);

    render(<VisualizePage />);

    expect(
      screen.getByRole("link", { name: /find your artist/i }).getAttribute("href")
    ).toBe(`/smart-match?${new URLSearchParams({ styles: "Blackwork" }).toString()}`);
  });

  it("uses the carried design's own sessionId when the ds param is absent", () => {
    const { id } = addDesignToStorage("a cool dragon", {
      image: "https://cdn.example.com/cut.png",
      sessionId: "sess-9",
    });
    searchParams = new URLSearchParams(`design=${id}`);

    render(<VisualizePage />);

    expect(
      screen.getByRole("link", { name: /find your artist/i }).getAttribute("href")
    ).toBe("/smart-match?ds=sess-9");
  });
});

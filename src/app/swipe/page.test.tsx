// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SwipePage from "./page";
import type { ArtistMatch } from "@/store/useMatchStore";

const push = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams,
}));

vi.mock("next/dynamic", () => ({
  // Render children so card content is visible without react-tinder-card.
  default: () => {
    const Stub = ({
      children,
      className,
    }: {
      children?: React.ReactNode;
      className?: string;
    }) => <div className={className}>{children}</div>;
    return Stub;
  },
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

vi.mock("@/utils/matching", () => ({
  trackSwipe: vi.fn(),
}));

type MatchStoreSlice = {
  matches: ArtistMatch[];
  hasHydrated: boolean;
};

let storeState: MatchStoreSlice = {
  matches: [],
  hasHydrated: false,
};

vi.mock("@/store/useMatchStore", () => ({
  useMatchStore: (selector: (s: MatchStoreSlice) => unknown) =>
    selector(storeState),
}));

const sampleMatch: ArtistMatch = {
  artistId: "a1",
  artistName: "Ink Nova",
  matchScore: 88,
  tags: ["blackwork"],
  styles: ["blackwork"],
  location: "LA",
};

describe("SwipePage persist hydration", () => {
  beforeEach(() => {
    push.mockClear();
    searchParams = new URLSearchParams();
    storeState = { matches: [], hasHydrated: false };
  });

  it("does not flash empty-deck copy before the match store has hydrated", () => {
    render(<SwipePage />);
    expect(screen.queryByText(/No deck/i)).toBeNull();
    expect(screen.getByLabelText("Loading swipe deck")).toBeTruthy();
  });

  it("shows empty-deck copy only after hydration when there is no deck", () => {
    storeState = { matches: [], hasHydrated: true };
    render(<SwipePage />);
    expect(screen.getByText(/No deck/i)).toBeTruthy();
    expect(screen.queryByLabelText("Loading swipe deck")).toBeNull();
  });

  it("renders the deck after hydration when matches exist", () => {
    storeState = { matches: [sampleMatch], hasHydrated: true };
    render(<SwipePage />);
    expect(screen.queryByText(/No deck/i)).toBeNull();
    expect(screen.queryByLabelText("Loading swipe deck")).toBeNull();
    expect(screen.getByText("Ink Nova")).toBeTruthy();
  });
});

describe("SwipePage design-session threading", () => {
  beforeEach(() => {
    push.mockClear();
    searchParams = new URLSearchParams();
    storeState = { matches: [sampleMatch], hasHydrated: true };
  });

  it("threads ds from the URL into the pinned artist's Book CTA", () => {
    searchParams = new URLSearchParams("ds=sess-1");
    render(<SwipePage />);

    fireEvent.click(screen.getByRole("button", { name: /pin/i }));

    const bookLink = screen.getByRole("link", { name: /book/i });
    expect(bookLink.getAttribute("href")).toBe("/book?artistId=a1&ds=sess-1");
  });

  it("omits ds from the Book CTA when there is no design session", () => {
    render(<SwipePage />);

    fireEvent.click(screen.getByRole("button", { name: /pin/i }));

    const bookLink = screen.getByRole("link", { name: /book/i });
    expect(bookLink.getAttribute("href")).toBe("/book?artistId=a1");
  });
});

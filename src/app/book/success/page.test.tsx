// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import BookingSuccessPage from "./page";

let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

vi.mock("@/components/studio/StudioShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Signed out — the page keeps its param-based display and never fetches.
vi.mock("@/lib/client-api-auth", () => ({
  getApiAuthHeaders: vi.fn(async () => {
    throw new Error("signed out");
  }),
}));

afterEach(cleanup);

describe("BookingSuccessPage — no dead ends", () => {
  beforeEach(() => {
    searchParams = new URLSearchParams("artist=Nadia&deposit=100");
  });

  it("offers the bookings door", () => {
    render(<BookingSuccessPage />);
    expect(
      screen.getByRole("link", { name: /your bookings/i }).getAttribute("href")
    ).toBe("/bookings");
  });

  it("offers a way back into the funnel — start another design", () => {
    render(<BookingSuccessPage />);
    expect(
      screen.getByRole("link", { name: /start another design/i }).getAttribute("href")
    ).toBe("/design");
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import BookingSuccessPage from "./page";

let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

vi.mock("@/components/studio/StudioShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const { getApiAuthHeadersMock } = vi.hoisted(() => ({
  getApiAuthHeadersMock: vi.fn(),
}));
vi.mock("@/lib/client-api-auth", () => ({
  getApiAuthHeaders: getApiAuthHeadersMock,
}));

const fetchMock = vi.fn();

/**
 * Wire the page's two owner-scoped fetches. `booking` null ⇒ 404 from
 * /api/v1/bookings/[id]; `calendar` false ⇒ 404 from calendar.ics (the
 * request model), true ⇒ a served .ics (the reservation model).
 */
function stubServer({
  booking,
  calendar,
}: {
  booking: Record<string, unknown> | null;
  calendar: boolean;
}) {
  getApiAuthHeadersMock.mockResolvedValue({ Authorization: "Bearer t" });
  fetchMock.mockImplementation(async (url: string) => {
    if (String(url).endsWith("/calendar.ics")) {
      return calendar
        ? {
            ok: true,
            blob: async () => new Blob(["BEGIN:VCALENDAR"], { type: "text/calendar" }),
          }
        : { ok: false, status: 404, json: async () => ({ success: false }) };
    }
    return booking
      ? { ok: true, json: async () => ({ success: true, booking }) }
      : { ok: false, status: 404, json: async () => ({ success: false }) };
  });
}

beforeEach(() => {
  searchParams = new URLSearchParams("artist=Nadia&deposit=100&bookingId=BK-TEST1234");
  // Default: signed out — param-based display, no server truth, no calendar.
  getApiAuthHeadersMock.mockReset();
  getApiAuthHeadersMock.mockRejectedValue(new Error("signed out"));
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("BookingSuccessPage — no dead ends", () => {
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

describe("BookingSuccessPage — what-happens-next timeline", () => {
  it("signed out: fails closed to the request-model timeline, no calendar button", () => {
    render(<BookingSuccessPage />);
    expect(screen.getByText("What happens next")).toBeTruthy();
    expect(screen.getByText("Request sent")).toBeTruthy();
    expect(screen.getByText("Artist review")).toBeTruthy();
    expect(screen.queryByText("Time reserved")).toBeNull();
    expect(screen.queryByRole("button", { name: /add to calendar/i })).toBeNull();
  });

  it("request model, deposit paid: the artist-review step is current", async () => {
    stubServer({
      booking: { status: "deposit_paid", artistName: "Nadia", depositAmount: 100 },
      calendar: false,
    });
    render(<BookingSuccessPage />);
    await waitFor(() => {
      const current = document.querySelector('[aria-current="step"]');
      expect(current?.textContent).toContain("Artist review");
    });
    // Honest framing: no invented response window.
    expect(screen.getByText(/there's no set window/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /add to calendar/i })).toBeNull();
  });

  it("reservation model: renders the reservation timeline and the calendar button", async () => {
    stubServer({
      booking: { status: "deposit_paid", artistName: "Nadia", depositAmount: 100 },
      calendar: true,
    });
    render(<BookingSuccessPage />);
    await waitFor(() => {
      expect(screen.getByText("Time reserved")).toBeTruthy();
    });
    // Deposit-confirms-slot (ADR 0027): no artist-review step on this path.
    expect(screen.queryByText("Artist review")).toBeNull();
    expect(screen.getByText(/your time is booked/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /add to calendar/i })).toBeTruthy();
    // Paid ⇒ the session step is what's ahead.
    const current = document.querySelector('[aria-current="step"]');
    expect(current?.textContent).toContain("Your session");
  });

  it("request model, pending deposit: the deposit step is current", async () => {
    searchParams = new URLSearchParams("artist=Nadia&bookingId=BK-TEST1234");
    stubServer({
      booking: { status: "pending", artistName: "Nadia" },
      calendar: false,
    });
    render(<BookingSuccessPage />);
    await waitFor(() => {
      const current = document.querySelector('[aria-current="step"]');
      expect(current?.textContent).toContain("Deposit");
    });
  });

  it("hides the timeline for an ended booking — there is no next", async () => {
    stubServer({
      booking: { status: "declined", artistName: "Nadia" },
      calendar: false,
    });
    render(<BookingSuccessPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/declined/i).length).toBeGreaterThan(0);
    });
    expect(screen.queryByText("What happens next")).toBeNull();
  });
});

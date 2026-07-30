// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import BookingsPage from "./page";

const mocks = vi.hoisted(() => ({
  bookings: [] as Array<Record<string, unknown>>,
  designs: [] as Array<Record<string, unknown>>,
  removeBooking: vi.fn(),
  getApiAuthHeaders: vi.fn(),
}));

vi.mock("@/components/studio/StudioShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/quiet/QuietHeadline", () => ({
  default: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
}));

vi.mock("@/lib/tattStorage", () => ({
  useBookings: () => ({
    bookings: mocks.bookings,
    hydrated: true,
    removeBooking: mocks.removeBooking,
  }),
  useDesigns: () => ({
    designs: mocks.designs,
    hydrated: true,
  }),
}));

vi.mock("@/lib/client-api-auth", () => ({
  getApiAuthHeaders: mocks.getApiAuthHeaders,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("BookingsPage customer status center", () => {
  beforeEach(() => {
    mocks.bookings = [];
    mocks.designs = [];
    mocks.removeBooking.mockReset();
    mocks.getApiAuthHeaders.mockReset();
  });

  it("keeps a local pre-payment request explicitly unconfirmed", async () => {
    mocks.bookings = [
      {
        id: "local-1",
        artistName: "Nadia",
        designId: "design-1",
        date: "2026-08-12",
        createdAt: Date.now(),
        depositPaid: false,
      },
    ];
    mocks.designs = [
      {
        id: "design-1",
        prompt: "fine line desert moth",
        createdAt: Date.now(),
        color: "bg-black",
      },
    ];
    mocks.getApiAuthHeaders.mockRejectedValue(new Error("signed out"));

    render(<BookingsPage />);

    expect(await screen.findByText("Request saved on this device")).toBeTruthy();
    expect(screen.getByText("Deposit not recorded")).toBeTruthy();
    expect(screen.getByText(/requested date is not booked/i)).toBeTruthy();
    expect(screen.queryByText(/^Confirmed$/)).toBeNull();
    expect(screen.queryByText("Studio hold")).toBeNull();
    expect(
      screen.getByRole("link", { name: "fine line desert moth" }).getAttribute("href"),
    ).toBe("/designs/design-1");
  });

  it("explains that hiding a device copy does not cancel the real request", async () => {
    mocks.bookings = [
      {
        id: "local-1",
        date: "2026-08-12",
        createdAt: Date.now(),
        depositPaid: false,
      },
    ];
    mocks.getApiAuthHeaders.mockRejectedValue(new Error("signed out"));
    const confirm = vi.fn(() => true);
    vi.stubGlobal("confirm", confirm);

    render(<BookingsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Hide from this device" }));

    expect(confirm).toHaveBeenCalledWith(
      "Hide this device copy? This does not cancel the request with the artist.",
    );
    expect(mocks.removeBooking).toHaveBeenCalledWith("local-1");
  });

  it("renders server pending as a request with an actionable next step", async () => {
    mocks.getApiAuthHeaders.mockResolvedValue({ Authorization: "Bearer token" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          success: true,
          bookings: [
            {
              id: "BK-ONE",
              bookingId: "BK-ONE",
              artistName: "Nadia",
              status: "pending",
              requestedSlots: [{ date: "2026-08-21" }],
            },
          ],
        }),
      })),
    );

    render(<BookingsPage />);

    expect(await screen.findByText("Request received")).toBeTruthy();
    expect(screen.getByText("Date not confirmed")).toBeTruthy();
    expect(screen.getByText(/no resumable checkout link/i)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Start a fresh request" }).getAttribute("href"),
    ).toBe("/book");
  });

  it("never substitutes the record creation date for a requested appointment date", async () => {
    mocks.getApiAuthHeaders.mockResolvedValue({ Authorization: "Bearer token" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          success: true,
          bookings: [
            {
              id: "BK-TWO",
              status: "confirmed",
              createdAt: "2026-07-29T20:00:00.000Z",
              requestedSlots: [],
            },
          ],
        }),
      })),
    );

    render(<BookingsPage />);

    expect(await screen.findByText("Booking confirmed")).toBeTruthy();
    expect(screen.getByText("No date requested")).toBeTruthy();
    expect(screen.queryByText("Jul 29, 2026")).toBeNull();
    expect(screen.getByText(/check the artist's message/i)).toBeTruthy();
  });

  it("links a server booking back to its locally saved design", async () => {
    mocks.designs = [
      {
        id: "design-7",
        title: "Desert moth",
        prompt: "fine line moth",
        createdAt: Date.now(),
        color: "bg-black",
      },
    ];
    mocks.getApiAuthHeaders.mockResolvedValue({ Authorization: "Bearer token" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          success: true,
          bookings: [
            {
              id: "BK-THREE",
              status: "deposit_paid",
              designId: "design-7",
            },
          ],
        }),
      })),
    );

    render(<BookingsPage />);

    await waitFor(() =>
      expect(screen.getByText("Deposit paid")).toBeTruthy(),
    );
    expect(
      screen.getByRole("link", { name: "Desert moth" }).getAttribute("href"),
    ).toBe("/designs/design-7");
    expect(
      screen.getByRole("link", { name: "View saved design" }).getAttribute("href"),
    ).toBe("/designs/design-7");
  });
});

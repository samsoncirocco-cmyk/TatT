// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { searchValues, fetchMock, authHeadersMock } = vi.hoisted(() => ({
  searchValues: new Map<string, string>(),
  fetchMock: vi.fn(),
  authHeadersMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => searchValues.get(key) ?? null,
  }),
}));

vi.mock("@/lib/client-api-auth", () => ({
  getApiAuthHeaders: authHeadersMock,
}));

vi.mock("@/components/studio/StudioShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/punk/SlashHeadline", () => ({
  default: ({ before, slashed }: { before: string; slashed: string }) => (
    <h1>{before} {slashed}</h1>
  ),
}));

vi.mock("@/components/punk/TapeCTA", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import BookingSuccessPage from "./page";

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("BookingSuccessPage reconciliation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    searchValues.clear();
    fetchMock.mockReset();
    authHeadersMock.mockReset();
    authHeadersMock.mockResolvedValue({ Authorization: "Bearer token" });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does not show a paid state when the identified booking lookup fails", async () => {
    searchValues.set("bookingId", "booking-1");
    searchValues.set("deposit", "75");
    fetchMock.mockResolvedValue({ ok: false });

    render(<BookingSuccessPage />);
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/bookings/booking-1",
      { headers: { Authorization: "Bearer token" } },
    );
    expect(screen.queryByText("Deposit paid")).toBeNull();
    expect(screen.getByText("Deposit due")).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not fetch an unrelated recent booking without a bookingId", async () => {
    searchValues.set("deposit", "75");

    render(<BookingSuccessPage />);
    await flushPromises();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getAllByText("Deposit paid").length).toBeGreaterThan(0);
  });

  it("shows a demo checkout as paid while its booking remains pending", async () => {
    searchValues.set("demo", "true");
    searchValues.set("bookingId", "booking-1");
    searchValues.set("deposit", "75");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, booking: { status: "pending" } }),
    });

    render(<BookingSuccessPage />);
    await flushPromises();

    expect(screen.getAllByText("Deposit paid").length).toBeGreaterThan(0);
    expect(screen.queryByText("Deposit due")).toBeNull();
  });

  it("polls a pending booking until Stripe reconciliation marks it paid", async () => {
    searchValues.set("bookingId", "booking-1");
    searchValues.set("deposit", "75");
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, booking: { status: "pending" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          booking: { status: "deposit_paid", depositAmount: 75 },
        }),
      });

    render(<BookingSuccessPage />);
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText("Awaiting deposit").length).toBeGreaterThan(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getAllByText("Deposit paid").length).toBeGreaterThan(0);
  });

  it("stops polling after bounded retries for a persistent server failure", async () => {
    searchValues.set("bookingId", "booking-1");
    fetchMock.mockResolvedValue({ ok: false, status: 503 });

    render(<BookingSuccessPage />);
    await flushPromises();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(10);
  });
});

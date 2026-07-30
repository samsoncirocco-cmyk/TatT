import { describe, expect, it } from "vitest";
import type { BookingStatus } from "@/lib/booking";
import { bookingStatusCopy } from "./bookingStatus";

const STATUSES: BookingStatus[] = [
  "pending",
  "held",
  "deposit_paid",
  "confirmed",
  "declined",
  "completed",
  "cancelled",
  "refunded",
  "expired",
];

describe("bookingStatusCopy", () => {
  it.each(STATUSES)("%s gives the customer a concrete next step and exit", (status) => {
    const copy = bookingStatusCopy(status);

    expect(copy.label).toBeTruthy();
    expect(copy.nextStep).toMatch(/^Next:/);
    expect(copy.actionLabel).toBeTruthy();
    expect(copy.actionHref).toMatch(/^\//);
  });

  it("does not upgrade pending or held requests into confirmed bookings", () => {
    expect(bookingStatusCopy("pending")).toMatchObject({
      label: "Request received",
      qualifier: "Date not confirmed",
    });
    expect(bookingStatusCopy("held")).toMatchObject({
      label: "Time held for payment",
      qualifier: "Not booked yet",
    });
  });

  it("treats a missing server status as unknown, not pending or confirmed", () => {
    expect(bookingStatusCopy()).toMatchObject({
      label: "Status unavailable",
      qualifier: "Do not make plans yet",
    });
  });
});

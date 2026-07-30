import type { BookingStatus } from "@/lib/booking";

export type BookingStatusCopy = {
  label: string;
  qualifier: string;
  nextStep: string;
  actionLabel: string;
  actionHref: string;
  preferDesignAction?: boolean;
};

const STATUS_COPY: Record<BookingStatus, BookingStatusCopy> = {
  pending: {
    label: "Request received",
    qualifier: "Date not confirmed",
    nextStep:
      "Next: complete the deposit from your booking checkout. The artist still needs to confirm a date.",
    actionLabel: "Restart booking if needed",
    actionHref: "/book",
  },
  held: {
    label: "Time held for payment",
    qualifier: "Not booked yet",
    nextStep:
      "Next: finish checkout before the hold ends. Payment and artist confirmation are still required.",
    actionLabel: "Choose another time if needed",
    actionHref: "/book",
  },
  deposit_paid: {
    label: "Deposit paid",
    qualifier: "Artist confirmation pending",
    nextStep:
      "Next: wait for the artist to confirm a date. Keep your booking reference handy.",
    actionLabel: "See saved designs",
    actionHref: "/designs",
    preferDesignAction: true,
  },
  confirmed: {
    label: "Booking confirmed",
    qualifier: "Check exact details",
    nextStep:
      "Next: check the artist's message for the confirmed date, time, studio location, and any preparation details.",
    actionLabel: "See saved designs",
    actionHref: "/designs",
    preferDesignAction: true,
  },
  declined: {
    label: "Request declined",
    qualifier: "Not booked",
    nextStep:
      "Next: choose another artist or submit different dates. No appointment is active for this request.",
    actionLabel: "Find another artist",
    actionHref: "/smart-match",
  },
  completed: {
    label: "Session marked complete",
    qualifier: "Booking closed",
    nextStep:
      "Next: keep your booking reference and saved design together for your records.",
    actionLabel: "See saved designs",
    actionHref: "/designs",
    preferDesignAction: true,
  },
  cancelled: {
    label: "Booking cancelled",
    qualifier: "No active appointment",
    nextStep:
      "Next: start a new request if you still want to book this or another artist.",
    actionLabel: "Start a new booking",
    actionHref: "/book",
  },
  refunded: {
    label: "Refund recorded",
    qualifier: "Booking closed",
    nextStep:
      "Next: check the original payment method for the credit. The payment provider controls when it appears.",
    actionLabel: "Start a new booking",
    actionHref: "/book",
  },
  expired: {
    label: "Request expired",
    qualifier: "No active appointment",
    nextStep:
      "Next: submit a new request with dates that still work for you.",
    actionLabel: "Start a new booking",
    actionHref: "/book",
  },
};

const UNKNOWN_STATUS_COPY: BookingStatusCopy = {
  label: "Status unavailable",
  qualifier: "Do not make plans yet",
  nextStep:
    "Next: keep this booking reference and check again before paying or making appointment plans.",
  actionLabel: "Review booking options",
  actionHref: "/book",
};

export function bookingStatusCopy(
  status?: BookingStatus,
): BookingStatusCopy {
  return status ? STATUS_COPY[status] : UNKNOWN_STATUS_COPY;
}

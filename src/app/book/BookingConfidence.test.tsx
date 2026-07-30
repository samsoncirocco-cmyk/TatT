// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  BookingPathExplainer,
  CheckoutEstimate,
  TattooPrepPlan,
  bookingReviewLabels,
  checkoutEstimate,
} from "./BookingConfidence";

vi.mock("@/components/quiet/QuietCTA", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe("booking confidence", () => {
  it("does not call a selected time reserved before the server hold exists", () => {
    expect(bookingReviewLabels("reservation")).toEqual({
      heading: "Review the selected time",
      timing: "Time to hold at checkout",
    });
  });

  it("itemizes the additive booking fee from the real percentage", () => {
    expect(checkoutEstimate(150, 10)).toEqual({
      deposit: 150,
      bookingFee: 15,
      totalBeforeTax: 165,
    });

    render(<CheckoutEstimate deposit={150} feePercent={10} artistClaimed />);
    expect(screen.getByText("Deposit to artist")).toBeTruthy();
    expect(screen.getByText("TattTester booking fee (10%)")).toBeTruthy();
    expect(screen.getByText("$165")).toBeTruthy();
  });

  it("explains custody instead of promising an unclaimed artist already receives funds", () => {
    render(<CheckoutEstimate deposit={150} feePercent={10} artistClaimed={false} />);
    expect(screen.getByText("Artist deposit held by TattTester")).toBeTruthy();
  });

  it("makes a date request explicitly different from a booking", () => {
    render(<BookingPathExplainer mode="request" artistName="Nadia" />);
    expect(screen.getByText("A request the artist confirms")).toBeTruthy();
    expect(screen.getByText(/preferences, not bookings/i)).toBeTruthy();
    expect(screen.getByText(/confirms one of your dates or offers another/i)).toBeTruthy();
  });

  it("explains the exclusive hold on a live reservation", () => {
    render(<BookingPathExplainer mode="reservation" artistName="Nadia" />);
    expect(screen.getByText("A real time you can reserve")).toBeTruthy();
    expect(screen.getByText(/exclusive, short hold/i)).toBeTruthy();
  });

  it("provides a practical, non-medical prep timeline", () => {
    render(<TattooPrepPlan artistName="Nadia" stage="appointment" />);
    expect(screen.getByRole("heading", { name: "Your appointment game plan" })).toBeTruthy();
    expect(screen.getByText(/shop address, remaining quote/i)).toBeTruthy();
    expect(screen.getByText(/bring required ID and payment/i)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /open your bookings/i }).getAttribute("href"),
    ).toBe("/bookings");
  });

  it("does not turn a request into an appointment plan", () => {
    render(<TattooPrepPlan artistName="Nadia" />);
    expect(screen.getByRole("heading", { name: "Your booking-request plan" })).toBeTruthy();
    expect(screen.getByText(/do not make appointment plans yet/i)).toBeTruthy();
  });
});

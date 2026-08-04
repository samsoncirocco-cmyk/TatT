import { describe, expect, it } from "vitest";
import {
  artistDepositNotificationMoneyCopy,
  bookingMoneyCopy,
  bookingReviewMoneyCopy,
  bookingSuccessMoneyCopy,
  checkoutFeeMoneyCopy,
} from "./money-copy";

describe("booking money copy", () => {
  it("keeps every static surface on the same fee/deposit policy", () => {
    for (const sentence of Object.values(bookingMoneyCopy)) {
      expect(sentence).toMatch(/fee/i);
      expect(sentence).toMatch(/deposit/i);
      expect(sentence).toMatch(/artist|yours|your/i);
      expect(sentence).not.toMatch(/\bTatT\b/);
    }
  });

  it("gives the claimed-artist variants the full-strength sentence (ADR-0036 amendment)", () => {
    // Both clauses are load-bearing: 100% of the deposit to the artist, and
    // the booking fee as the only thing TattTester keeps.
    expect(checkoutFeeMoneyCopy(true)).toMatch(/keeps 100% of the deposit/i);
    expect(checkoutFeeMoneyCopy(true)).toMatch(/only part we keep/i);
    expect(bookingSuccessMoneyCopy(true)).toMatch(/whole deposit goes to your artist/i);
    expect(bookingSuccessMoneyCopy(true)).toMatch(/only part we keep/i);
    // Claimed is the default, matching bookingReviewMoneyCopy.
    expect(checkoutFeeMoneyCopy()).toBe(checkoutFeeMoneyCopy(true));
    expect(bookingSuccessMoneyCopy()).toBe(bookingSuccessMoneyCopy(true));
  });

  it("keeps the held-deposit truth on the unclaimed variants (ADR-0006/0008)", () => {
    for (const sentence of [checkoutFeeMoneyCopy(false)]) {
      expect(sentence).toMatch(/held during verification/i);
      expect(sentence).toMatch(/in full/i);
      expect(sentence).toMatch(/refunded/i);
      expect(sentence).toMatch(/claim window closes/i);
    }
    expect(bookingSuccessMoneyCopy(false)).toMatch(/has not joined TatT yet/i);
    expect(bookingSuccessMoneyCopy(false)).toMatch(/relay/i);
    expect(bookingSuccessMoneyCopy(false)).toMatch(/within 7 days/i);
    expect(bookingSuccessMoneyCopy(false)).toMatch(/automatically refunds/i);
  });

  it("states both the rule and the unclaimed exception on the bookings list", () => {
    expect(bookingMoneyCopy.bookingsList).toMatch(/deposit goes to your artist in full/i);
    expect(bookingMoneyCopy.bookingsList).toMatch(/only part we keep/i);
    expect(bookingMoneyCopy.bookingsList).toMatch(/unclaimed profile/i);
    expect(bookingMoneyCopy.bookingsList).toMatch(/held during verification/i);
    expect(bookingMoneyCopy.bookingsList).toMatch(/refunded in full/i);
  });

  it("renders the live artist and fee percentage on booking review", () => {
    expect(bookingReviewMoneyCopy("Nadia", 10)).toBe(
      "Your deposit goes to Nadia. All of it. Our 10% booking fee is added on top — you’ll see both numbers at checkout.",
    );
  });

  it("describes custody and refund truth for an unclaimed profile", () => {
    expect(bookingReviewMoneyCopy("Nadia", 10, false)).toMatch(
      /holds the artist deposit while Nadia claims and verifies/i,
    );
    expect(bookingReviewMoneyCopy("Nadia", 10, false)).toMatch(/refunded/i);
    expect(bookingReviewMoneyCopy("Nadia", 10, false)).toMatch(/10% booking fee/i);
  });

  it("tells the notified artist who paid and what they keep", () => {
    expect(artistDepositNotificationMoneyCopy("$150.00")).toBe(
      "The client paid your $150.00 deposit plus TattTester’s booking fee. You keep the full $150.00 deposit; the fee is the only part TattTester keeps.",
    );
  });
});

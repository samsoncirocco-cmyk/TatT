import { describe, expect, it } from "vitest";
import {
  artistDepositNotificationMoneyCopy,
  bookingMoneyCopy,
  bookingReviewMoneyCopy,
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

  it("renders the live artist and fee percentage on booking review", () => {
    expect(bookingReviewMoneyCopy("Nadia", 10)).toBe(
      "Your deposit goes to Nadia. All of it. Our 10% booking fee is added on top — you’ll see both numbers at checkout.",
    );
  });

  it("tells the notified artist who paid and what they keep", () => {
    expect(artistDepositNotificationMoneyCopy("$150.00")).toBe(
      "The client paid your $150.00 deposit plus TattTester’s booking fee. You keep the full $150.00 deposit; the fee is the only part TattTester keeps.",
    );
  });
});

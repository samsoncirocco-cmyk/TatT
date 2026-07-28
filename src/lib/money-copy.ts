/**
 * Reader-facing expressions of ADR-0007's single money invariant:
 * the client pays the deposit plus a separate booking fee, and the artist
 * keeps 100% of the deposit.
 *
 * Keep the surface-specific sentences together. Counsel or policy wording
 * changes should be one edit, even though the sentences appear in several
 * different parts of the booking and artist flows.
 */

export const bookingMoneyCopy = {
  checkoutFee:
    "You pay this fee on top of the deposit — the artist keeps 100% of the deposit; this fee is all TattTester takes.",
  bookingSuccess:
    "Your whole deposit goes to your artist — the booking fee you paid is the only part we keep.",
  bookingsList:
    "Every deposit goes to your artist in full — the booking fee you pay at checkout is the only part we keep.",
  artistConsole:
    "Clients pay your deposit plus TattTester’s booking fee — you keep 100% of every deposit; the fee is the only part we take.",
  claimHeldDeposit:
    "Clients paid this deposit plus our booking fee — the full deposit is yours; the fee is the only part TattTester keeps.",
} as const;

export function bookingReviewMoneyCopy(artistName: string, feePercent: number): string {
  return `Your deposit goes to ${artistName}. All of it. Our ${feePercent}% booking fee is added on top — you’ll see both numbers at checkout.`;
}

export function artistDepositNotificationMoneyCopy(amount: string): string {
  return `The client paid your ${amount} deposit plus TattTester’s booking fee. You keep the full ${amount} deposit; the fee is the only part TattTester keeps.`;
}

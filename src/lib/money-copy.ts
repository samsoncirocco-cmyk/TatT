/**
 * Reader-facing expressions of ADR-0007's single money invariant:
 * the client pays the deposit plus a separate booking fee, and the artist
 * keeps 100% of the deposit.
 *
 * Per ADR-0036 (2026-07-30 amendment) the money sentence is two-variant:
 * a claimed artist gets the full-strength sentence (artist keeps 100% of
 * the deposit; the booking fee is the only part we keep), an unclaimed
 * artist gets the held-deposit sentence (ADR-0006/0008: held during
 * verification, released in full on claim, refunded in full if the claim
 * window closes). Surfaces that span both kinds of bookings state both
 * truths in one breath.
 *
 * Keep the surface-specific sentences together. Counsel or policy wording
 * changes should be one edit, even though the sentences appear in several
 * different parts of the booking and artist flows.
 */

export const bookingMoneyCopy = {
  bookingsList:
    "Every deposit goes to your artist in full — the booking fee you pay at checkout is the only part we keep. A deposit for an unclaimed profile is held during verification and refunded in full if the claim window closes.",
  artistConsole:
    "Clients pay your deposit plus TattTester’s booking fee — you keep 100% of every deposit; the fee is the only part we take.",
  claimHeldDeposit:
    "Clients paid this deposit plus our booking fee — the full deposit is yours; the fee is the only part TattTester keeps.",
} as const;

export function checkoutFeeMoneyCopy(artistClaimed = true): string {
  return artistClaimed
    ? "You pay this fee on top of the deposit. Your artist keeps 100% of the deposit — the booking fee is the only part we keep."
    : "You pay this fee on top of the artist deposit. The deposit is held during verification and released to the artist in full, or refunded if the claim window closes. The booking fee is the only part we keep.";
}

export function bookingSuccessMoneyCopy(artistClaimed = true): string {
  return artistClaimed
    ? "Your whole deposit goes to your artist — the booking fee you paid is the only part we keep."
    : "Your artist deposit and TattTester booking fee are separate. This profile has not joined TatT yet, so we relay the request while the deposit is held. If they do not claim and complete setup within 7 days, TatT automatically refunds your deposit in full. The fee is the only part we keep.";
}

export function bookingReviewMoneyCopy(
  artistName: string,
  feePercent: number,
  artistClaimed = true,
): string {
  return artistClaimed
    ? `Your deposit goes to ${artistName}. All of it. Our ${feePercent}% booking fee is added on top — you’ll see both numbers at checkout.`
    : `TattTester holds the artist deposit while ${artistName} claims and verifies this profile. It is released in full after verification or refunded if the claim window closes. Our ${feePercent}% booking fee is shown separately at checkout.`;
}

export function artistDepositNotificationMoneyCopy(amount: string): string {
  return `The client paid your ${amount} deposit plus TattTester’s booking fee. You keep the full ${amount} deposit; the fee is the only part TattTester keeps.`;
}

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
    "You pay this fee on top of the artist deposit. Verified artists receive the deposit in full; deposits for unclaimed profiles are held during verification or refunded if the claim window closes.",
  bookingSuccess:
    "Your artist deposit and TattTester booking fee are separate. A verified artist receives the deposit in full; for an unclaimed profile, it is held during verification or refunded if the claim window closes.",
  bookingsList:
    "Artist deposits and TattTester booking fees stay separate. Verified artists receive deposits in full; unclaimed-profile deposits are held during verification or refunded if the claim window closes.",
  artistConsole:
    "Clients pay your deposit plus TattTester’s booking fee — you keep 100% of every deposit; the fee is the only part we take.",
  claimHeldDeposit:
    "Clients paid this deposit plus our booking fee — the full deposit is yours; the fee is the only part TattTester keeps.",
} as const;

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

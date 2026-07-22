import { describe, it, expect } from 'vitest';
import { netTransferCents, isExpired } from './booking-relay';

describe('netTransferCents', () => {
  it('pays the artist 100% of the recorded deposit (fee was client-paid on top)', () => {
    // $150 deposit recorded → artist receives the full $150; TatT's booking fee
    // was already charged to the client at checkout, not deducted here.
    expect(netTransferCents(15000)).toBe(15000);
    expect(netTransferCents(7500)).toBe(7500);
  });

  it('never goes negative', () => {
    expect(netTransferCents(0)).toBe(0);
    expect(netTransferCents(-5)).toBe(0);
  });
});

describe('isExpired', () => {
  const now = 1_700_000_000;

  it('is true once now has passed the hold window', () => {
    expect(isExpired({ expiresAtEpoch: now - 1 }, now)).toBe(true);
  });

  it('is false while the window is still open', () => {
    expect(isExpired({ expiresAtEpoch: now + 1 }, now)).toBe(false);
  });

  it('is not yet expired exactly at the boundary (strict less-than, matches the cypher filter)', () => {
    expect(isExpired({ expiresAtEpoch: now }, now)).toBe(false);
  });

  it('filters a batch to only the elapsed holds', () => {
    const relays = [
      { expiresAtEpoch: now - 100 },
      { expiresAtEpoch: now - 1 },
      { expiresAtEpoch: now + 100 },
    ];
    expect(relays.filter((r) => isExpired(r, now))).toHaveLength(2);
  });
});

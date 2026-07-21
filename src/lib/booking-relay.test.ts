import { describe, it, expect } from 'vitest';
import { netTransferCents, isExpired } from './booking-relay';
import { platformFeeCents } from './stripe';

describe('netTransferCents', () => {
  it('is gross minus the platform fee', () => {
    // $150 deposit, 10% fee → $15 kept, $135 to the artist.
    expect(netTransferCents(15000)).toBe(15000 - platformFeeCents(15000));
    expect(netTransferCents(15000)).toBe(13500);
  });

  it('composes with platformFeeCents so the two always sum to the gross', () => {
    for (const gross of [0, 1, 999, 7500, 15000, 30001]) {
      expect(netTransferCents(gross) + platformFeeCents(gross)).toBe(gross);
    }
  });

  it('never goes negative', () => {
    expect(netTransferCents(0)).toBe(0);
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

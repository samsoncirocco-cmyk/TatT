/*
 * Pins the liveness threshold.
 *
 * `isLiveStatus` had no test, and an automated reviewer read it as counting
 * 403 as live — the opposite of what it does and of what its comment says.
 * The claim was wrong, but the absence of a test is why it was arguable at
 * all, and acting on it would have meant "fixing" correct code and re-probing
 * the graph for damage that never happened.
 *
 * 403 is the case that matters: Cloudflare and storefront hosts return it for
 * a parked page as readily as a live one, so the gate excludes it on purpose.
 * 399/400 pin the boundary itself.
 */
import { describe, expect, it } from 'vitest';
import { isLiveStatus } from './classify-artist-bookability.mjs';

describe('isLiveStatus — the reachability threshold', () => {
  it.each([200, 201, 204, 301, 302, 308, 399])('counts %i as live', (status) => {
    expect(isLiveStatus(status)).toBe(true);
  });

  it.each([400, 401, 403, 404, 410, 429, 500, 503])(
    'does not count %i as live',
    (status) => {
      expect(isLiveStatus(status)).toBe(false);
    }
  );

  it('excludes 403 specifically, because a blocked page is not evidence', () => {
    // Called out on its own: this is the status a reviewer flagged as wrongly
    // live, and money depends on it — a deposit only goes where the relay can
    // reach someone.
    expect(isLiveStatus(403)).toBe(false);
  });
});

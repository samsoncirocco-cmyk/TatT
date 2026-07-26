// notifyArtistOfBooking's whole job is to reach the artist. BookingRelay
// carries no artistEmail field, so a cast that read one off it was always
// undefined — the "real transactional email" the docblock promises silently
// degraded to either the ops inbox (if configured) or nothing at all, even
// when the artist's own email sits right there on their Artist node.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BookingRelay } from '@/lib/booking-relay';

const { getArtistStripeMock, sendTransactionalEmailMock } = vi.hoisted(() => ({
  getArtistStripeMock: vi.fn(),
  sendTransactionalEmailMock: vi.fn(),
}));

vi.mock('@/lib/artist-stripe', () => ({ getArtistStripe: getArtistStripeMock }));
vi.mock('@/services/emailQueueService', () => ({ sendTransactionalEmail: sendTransactionalEmailMock }));

import { notifyArtistOfBooking } from './notify';

function relay(over: Partial<BookingRelay> = {}): BookingRelay {
  return {
    id: 'pi_held_1',
    artistId: 'artist_1',
    customerEmail: 'client@example.com',
    amountCents: 15_000,
    chargeId: 'ch_held_1',
    paymentIntentId: 'pi_held_1',
    status: 'pending',
    expiresAtEpoch: 1_700_600_000,
    createdAtEpoch: 1_700_000_000,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  sendTransactionalEmailMock.mockResolvedValue({ sent: true, id: 'email_1' });
  delete process.env.OPS_NOTIFY_EMAIL;
});

describe('notifyArtistOfBooking — email address resolution', () => {
  it("emails the artist's own address from the graph, not an ops fallback", async () => {
    getArtistStripeMock.mockResolvedValue({
      id: 'artist_1',
      name: 'Nadia Ink',
      email: 'nadia@example.com',
      stripeAccountId: null,
      chargesEnabled: false,
      claimedByUid: null,
    });

    await notifyArtistOfBooking(relay());

    expect(getArtistStripeMock).toHaveBeenCalledWith('artist_1');
    expect(sendTransactionalEmailMock).toHaveBeenCalledTimes(1);
    expect(sendTransactionalEmailMock.mock.calls[0][0]).toMatchObject({ to: 'nadia@example.com' });
  });

  it('falls back to the ops inbox when the artist has no email on file', async () => {
    process.env.OPS_NOTIFY_EMAIL = 'ops@tatttester.com';
    getArtistStripeMock.mockResolvedValue({
      id: 'artist_1',
      name: 'Nadia Ink',
      email: null,
      stripeAccountId: null,
      chargesEnabled: false,
      claimedByUid: null,
    });

    await notifyArtistOfBooking(relay());

    expect(sendTransactionalEmailMock).toHaveBeenCalledTimes(1);
    expect(sendTransactionalEmailMock.mock.calls[0][0]).toMatchObject({ to: 'ops@tatttester.com' });
  });

  it('sends nothing (but never throws) when neither the artist nor ops has an address', async () => {
    getArtistStripeMock.mockResolvedValue(null);

    await expect(notifyArtistOfBooking(relay())).resolves.toBeUndefined();

    expect(sendTransactionalEmailMock).not.toHaveBeenCalled();
  });
});

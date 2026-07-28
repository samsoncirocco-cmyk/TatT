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

import { notifyArtistOfBooking, notifyOpsOfTakedownRequest } from './notify';
import type { TakedownRequest } from '@/lib/takedown';

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
    const sent = sendTransactionalEmailMock.mock.calls[0][0];
    expect(sent).toMatchObject({ to: 'nadia@example.com' });
    expect(sent.subject).toContain('TattTester');
    expect(sent.text).toContain(
      'You keep the full $150.00 deposit; the fee is the only part TattTester keeps.',
    );
    expect(sent.html).toContain(
      'You keep the full $150.00 deposit; the fee is the only part TattTester keeps.',
    );
    expect(sent.subject).not.toMatch(/\bTatT\b/);
    expect(sent.text).not.toMatch(/\bTatT\b/);
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

// A takedown notification is NOT best-effort. notifyArtistOfBooking swallows
// failures because a Stripe webhook must not die over an email — but if nobody
// is told an artist asked for their work to be removed, the request is lost and
// the person who sent it believes it was received. So this one reports.
describe('notifyOpsOfTakedownRequest', () => {
  function request(over: Partial<TakedownRequest> = {}): TakedownRequest {
    return {
      artistId: 'artist_tattoosbyging',
      contactEmail: 'ging@example.com',
      relationship: 'artist',
      scope: 'all',
      message: 'These are my photos.',
      ...over,
    };
  }

  it('emails the ops inbox with the artist id, contact, scope and message', async () => {
    process.env.OPS_NOTIFY_EMAIL = 'ops@tatttester.com';

    const result = await notifyOpsOfTakedownRequest(request(), 'TD-ABC123');

    expect(result.delivered).toBe(true);
    expect(sendTransactionalEmailMock).toHaveBeenCalledTimes(1);
    const sent = sendTransactionalEmailMock.mock.calls[0][0];
    expect(sent.to).toBe('ops@tatttester.com');
    expect(sent.subject).toMatch(/takedown/i);
    expect(sent.text).toContain('artist_tattoosbyging');
    expect(sent.text).toContain('ging@example.com');
    expect(sent.text).toContain('TD-ABC123');
    expect(sent.text).toContain('These are my photos.');
  });

  it('includes the exact executor command the reviewer should run', async () => {
    process.env.OPS_NOTIFY_EMAIL = 'ops@tatttester.com';

    await notifyOpsOfTakedownRequest(request(), 'TD-ABC123');

    const sent = sendTransactionalEmailMock.mock.calls[0][0];
    expect(sent.text).toContain('scripts/execute-takedown.mjs');
    expect(sent.text).toContain('--artist-id artist_tattoosbyging');
  });

  it('reports FAILURE when no ops inbox is configured — nobody would be told', async () => {
    delete process.env.OPS_NOTIFY_EMAIL;

    const result = await notifyOpsOfTakedownRequest(request(), 'TD-ABC123');

    expect(result.delivered).toBe(false);
    expect(result.reason).toMatch(/OPS_NOTIFY_EMAIL/);
    expect(sendTransactionalEmailMock).not.toHaveBeenCalled();
  });

  it('reports FAILURE when the email provider rejects the send', async () => {
    process.env.OPS_NOTIFY_EMAIL = 'ops@tatttester.com';
    sendTransactionalEmailMock.mockResolvedValue({ sent: false, reason: 'resend responded 500: boom' });

    const result = await notifyOpsOfTakedownRequest(request(), 'TD-ABC123');

    expect(result.delivered).toBe(false);
    expect(result.reason).toMatch(/resend responded 500/);
  });

  it('reports FAILURE (rather than throwing) when the provider call throws', async () => {
    process.env.OPS_NOTIFY_EMAIL = 'ops@tatttester.com';
    sendTransactionalEmailMock.mockRejectedValue(new Error('socket hang up'));

    const result = await notifyOpsOfTakedownRequest(request(), 'TD-ABC123');

    expect(result.delivered).toBe(false);
    expect(result.reason).toMatch(/socket hang up/);
  });

  it('copies the requester so they have written proof the request was received', async () => {
    process.env.OPS_NOTIFY_EMAIL = 'ops@tatttester.com';

    await notifyOpsOfTakedownRequest(request(), 'TD-ABC123');

    const sent = sendTransactionalEmailMock.mock.calls[0][0];
    expect(sent.replyTo).toBe('ging@example.com');
  });
});

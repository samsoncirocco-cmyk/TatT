import { describe, expect, it, vi } from 'vitest';

const { getRosterArtistMock, redirectMock } = vi.hoisted(() => ({
  getRosterArtistMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock('@/lib/artists-graph', () => ({ getRosterArtistById: getRosterArtistMock }));
vi.mock('@/lib/availability', () => ({ getArtistAvailability: vi.fn() }));
vi.mock('@/lib/booking-offer', () => ({ getBookingOffer: vi.fn() }));
vi.mock('@/lib/stripe', () => ({ PLATFORM_FEE_BPS: 1000 }));
vi.mock('next/navigation', () => ({
  redirect: redirectMock,
  unstable_rethrow: (error: unknown) => { throw error; },
}));
vi.mock('./BookClient', () => ({ default: () => null }));

import BookPage from './page';

describe('BookPage browse-only redirect', () => {
  it('redirects browse-only artists to intro outside the graph-error boundary and preserves ds', async () => {
    getRosterArtistMock.mockResolvedValue({ id: 'artist_1', bookingTier: 'browse-only' });
    await expect(BookPage({ searchParams: Promise.resolve({ artistId: 'artist_1', ds: 'sess_123' }) }))
      .rejects.toThrow('REDIRECT:/intro?artistId=artist_1&ds=sess_123');
    expect(redirectMock).toHaveBeenCalledWith('/intro?artistId=artist_1&ds=sess_123');
  });
});

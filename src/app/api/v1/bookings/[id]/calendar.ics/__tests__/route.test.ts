// Seam tests for GET /api/v1/bookings/[id]/calendar.ics — auth (401/403→404),
// owner scoping, hold selection (converted > live active; released/expired
// never render), and the .ics payload itself. Firestore, auth, and the roster
// lookup are mocked at the module boundary; the ICS builder runs for real.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const {
  verifyApiAuthMock,
  verifyFirebaseTokenMock,
  ensureAdminAppMock,
  bookingGetMock,
  holdsGetMock,
  getRosterArtistByIdMock,
} = vi.hoisted(() => ({
  verifyApiAuthMock: vi.fn(),
  verifyFirebaseTokenMock: vi.fn(),
  ensureAdminAppMock: vi.fn(),
  bookingGetMock: vi.fn(),
  holdsGetMock: vi.fn(),
  getRosterArtistByIdMock: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({ verifyApiAuth: verifyApiAuthMock }));
vi.mock('@/lib/auth-dal', () => ({ verifyFirebaseToken: verifyFirebaseTokenMock }));
vi.mock('@/lib/firebase-admin', () => ({ ensureAdminApp: ensureAdminAppMock }));
vi.mock('@/lib/artists-graph', () => ({ getRosterArtistById: getRosterArtistByIdMock }));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: (name: string) =>
      name === 'booking_requests'
        ? { doc: () => ({ get: bookingGetMock }) }
        : { where: () => ({ get: holdsGetMock }) },
  }),
}));

import { GET } from '../route';

const BOOKING_ID = 'BK-CAL12345';
const OWNER_UID = 'uid-owner';

function makeRequest() {
  return new NextRequest(`http://localhost/api/v1/bookings/${BOOKING_ID}/calendar.ics`);
}

function call() {
  return GET(makeRequest(), { params: Promise.resolve({ id: BOOKING_ID }) });
}

function bookingDoc(overrides: Record<string, unknown> = {}) {
  return {
    exists: true,
    data: () => ({
      bookingId: BOOKING_ID,
      uid: OWNER_UID,
      artistId: 'artist-1',
      artistName: 'Nadia Vex',
      status: 'deposit_paid',
      ...overrides,
    }),
  };
}

function hold(overrides: Record<string, unknown> = {}) {
  return {
    holdId: 'hold_1',
    artistId: 'artist-1',
    bookingId: BOOKING_ID,
    date: '2026-08-14',
    startTime: '13:00',
    endTime: '15:00',
    timezone: 'America/New_York',
    createdAt: '2026-07-29T10:00:00.000Z',
    expiresAt: '2026-07-29T10:35:00.000Z',
    status: 'converted',
    ...overrides,
  };
}

function holdsSnap(holds: Record<string, unknown>[]) {
  return { docs: holds.map((h) => ({ data: () => h })) };
}

beforeEach(() => {
  vi.restoreAllMocks();
  verifyApiAuthMock.mockResolvedValue(null);
  verifyFirebaseTokenMock.mockResolvedValue({ uid: OWNER_UID });
  ensureAdminAppMock.mockReturnValue('service-account');
  bookingGetMock.mockResolvedValue(bookingDoc());
  holdsGetMock.mockResolvedValue(holdsSnap([hold()]));
  getRosterArtistByIdMock.mockResolvedValue({ location: 'Brooklyn, NY' });
});

describe('GET /api/v1/bookings/[id]/calendar.ics — auth', () => {
  it('returns the verifyApiAuth error untouched when API auth fails', async () => {
    const denied = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    verifyApiAuthMock.mockResolvedValue(denied);
    const res = await call();
    expect(res.status).toBe(401);
    expect(bookingGetMock).not.toHaveBeenCalled();
  });

  it('401s when there is no verified Firebase user', async () => {
    verifyFirebaseTokenMock.mockResolvedValue(null);
    const res = await call();
    expect(res.status).toBe(401);
    expect(bookingGetMock).not.toHaveBeenCalled();
  });

  it("404s a non-owner — same shape as a missing doc, never revealing existence", async () => {
    verifyFirebaseTokenMock.mockResolvedValue({ uid: 'uid-somebody-else' });
    const res = await call();
    expect(res.status).toBe(404);
    const missing = await (async () => {
      bookingGetMock.mockResolvedValue({ exists: false, data: () => undefined });
      return call();
    })();
    expect(missing.status).toBe(404);
    expect(await res.json()).toEqual(await missing.json());
  });

  it('404s when the backend is unconfigured (fail closed)', async () => {
    ensureAdminAppMock.mockReturnValue(null);
    const res = await call();
    expect(res.status).toBe(404);
  });
});

describe('GET /api/v1/bookings/[id]/calendar.ics — slot selection', () => {
  it('404s a request-model booking (no holds — preferences are not times)', async () => {
    holdsGetMock.mockResolvedValue(holdsSnap([]));
    const res = await call();
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/no scheduled time/i);
  });

  it('ignores released and expired holds', async () => {
    holdsGetMock.mockResolvedValue(
      holdsSnap([
        hold({ status: 'released' }),
        // Active but long past its expiry — a dead slot.
        hold({ holdId: 'hold_2', status: 'active', expiresAt: '2020-01-01T00:00:00.000Z' }),
      ])
    );
    const res = await call();
    expect(res.status).toBe(404);
  });

  it('prefers the newest converted hold over an active one', async () => {
    const future = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    holdsGetMock.mockResolvedValue(
      holdsSnap([
        hold({ holdId: 'hold_live', status: 'active', startTime: '09:00', endTime: '10:00', expiresAt: future }),
        hold({ holdId: 'hold_paid', status: 'converted', createdAt: '2026-07-29T11:00:00.000Z' }),
      ])
    );
    const res = await call();
    expect(res.status).toBe(200);
    // 13:00 EDT = 17:00Z — the converted hold's time, not the active one's.
    expect(await res.text()).toContain('DTSTART:20260814T170000Z');
  });

  it('falls back to a still-live active hold (checkout-to-webhook window)', async () => {
    const future = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    holdsGetMock.mockResolvedValue(holdsSnap([hold({ status: 'active', expiresAt: future })]));
    const res = await call();
    expect(res.status).toBe(200);
  });
});

describe('GET /api/v1/bookings/[id]/calendar.ics — payload', () => {
  it('serves a well-formed .ics with the right headers and content', async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/calendar; charset=utf-8');
    expect(res.headers.get('Content-Disposition')).toBe(
      `attachment; filename="tatttester-booking-${BOOKING_ID}.ics"`
    );
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');

    const unfolded = (await res.text()).replace(/\r\n /g, '');
    expect(unfolded).toContain('BEGIN:VCALENDAR');
    expect(unfolded).toContain(`UID:${BOOKING_ID}@tatttester.com`);
    expect(unfolded).toContain('DTSTART:20260814T170000Z');
    expect(unfolded).toContain('DTEND:20260814T190000Z');
    expect(unfolded).toContain('SUMMARY:Tattoo session — Nadia Vex');
    expect(unfolded).toContain('LOCATION:Brooklyn\\, NY');
    expect(unfolded).toContain('https://tatttester.com/bookings');
  });

  it('omits LOCATION when the roster lookup fails (fail-open)', async () => {
    getRosterArtistByIdMock.mockRejectedValue(new Error('graph down'));
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.text()).not.toContain('LOCATION:');
  });

  it('404s rather than rendering a slot that cannot be placed in time', async () => {
    // 02:30 on 2026-03-08 does not exist in America/New_York (DST gap).
    holdsGetMock.mockResolvedValue(
      holdsSnap([hold({ date: '2026-03-08', startTime: '02:30', endTime: '04:00' })])
    );
    const res = await call();
    expect(res.status).toBe(404);
  });
});

/**
 * Route tests for the share link path (issue #64). The store seam is mocked
 * at the module boundary; the assertions pin the contract that matters:
 * a share link is only ever issued when it was actually persisted, and a
 * visitor never receives the owner's uid.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  verifyApiAuthMock,
  verifyFirebaseTokenMock,
  resolveStoreMock,
  saveMock,
  getAndCountViewMock,
  getMock,
} = vi.hoisted(() => ({
  verifyApiAuthMock: vi.fn(),
  verifyFirebaseTokenMock: vi.fn(),
  resolveStoreMock: vi.fn(),
  saveMock: vi.fn(),
  getAndCountViewMock: vi.fn(),
  getMock: vi.fn(),
}));

vi.mock('@/lib/api-auth', () => ({ verifyApiAuth: verifyApiAuthMock }));
vi.mock('@/lib/auth-dal', () => ({ verifyFirebaseToken: verifyFirebaseTokenMock }));
vi.mock('@/lib/shared-design-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/shared-design-store')>();
  return { ...actual, resolveSharedDesignStore: resolveStoreMock };
});

import { POST } from '../route';
import { GET } from '../[shareId]/route';

const store = {
  save: saveMock,
  getAndCountView: getAndCountViewMock,
  get: getMock,
  recordVote: vi.fn(),
};

const VALID_BODY = { imageUrl: 'https://img/design.png', prompt: 'fine line fern' };

function postRequest(body: Record<string, unknown> = VALID_BODY) {
  return new NextRequest('http://localhost/api/v1/designs/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function getRequest(shareId: string, query = '') {
  return {
    request: new NextRequest(`http://localhost/api/v1/designs/share/${shareId}${query}`),
    params: Promise.resolve({ shareId }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  verifyApiAuthMock.mockResolvedValue(null);
  verifyFirebaseTokenMock.mockResolvedValue({ uid: 'user-1' });
  resolveStoreMock.mockReturnValue(store);
  saveMock.mockResolvedValue(undefined);
});

describe('POST /api/v1/designs/share', () => {
  it('persists the share and returns its id and url', async () => {
    const res = await POST(postRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.shareId).toHaveLength(10);
    expect(json.shareUrl).toContain(`/share/${json.shareId}`);

    const saved = saveMock.mock.calls[0][0];
    expect(saved.shareId).toBe(json.shareId);
    expect(saved.prompt).toBe('fine line fern');
    expect(saved.uid).toBe('user-1');
    expect(saved.views).toBe(0);
  });

  it('rejects a body missing imageUrl or prompt', async () => {
    const res = await POST(postRequest({ prompt: 'no image' }));
    expect(res.status).toBe(400);
    expect(saveMock).not.toHaveBeenCalled();
  });

  // A Forge selection of several cuts is ONE share. Minting a link per cut
  // would put the user back where the four-share-buttons problem started.
  it('stores a whole selection of cuts under a single share id', async () => {
    const imageUrls = ['https://img/a.png', 'https://img/b.png', 'https://img/c.png'];
    const res = await POST(postRequest({ imageUrls, prompt: 'fine line fern' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(saveMock).toHaveBeenCalledTimes(1);
    const saved = saveMock.mock.calls[0][0];
    expect(saved.imageUrls).toEqual(imageUrls);
    // The cover is the first cut — Open Graph takes exactly one image.
    expect(saved.imageUrl).toBe('https://img/a.png');
    expect(json.shareUrl).toContain(`/share/${json.shareId}`);
  });

  it('still accepts a lone imageUrl, and normalises it into the list', async () => {
    await POST(postRequest({ imageUrl: 'https://img/solo.png', prompt: 'fern' }));

    const saved = saveMock.mock.calls[0][0];
    expect(saved.imageUrl).toBe('https://img/solo.png');
    expect(saved.imageUrls).toEqual(['https://img/solo.png']);
  });

  it('rejects an empty selection rather than minting a link to nothing', async () => {
    const res = await POST(postRequest({ imageUrls: [], prompt: 'fern' }));
    expect(res.status).toBe(400);
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('rejects a selection larger than the cap', async () => {
    const imageUrls = Array.from({ length: 13 }, (_, i) => `https://img/${i}.png`);
    const res = await POST(postRequest({ imageUrls, prompt: 'fern' }));

    expect(res.status).toBe(400);
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('returns 503 and no shareId when no durable store is configured', async () => {
    // The degradation path: credentials missing. Handing back a link that
    // only lives in one instance's memory is the bug, not the fallback.
    resolveStoreMock.mockReturnValue(null);

    const res = await POST(postRequest());
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.code).toBe('SHARE_STORE_UNAVAILABLE');
    expect(json.shareId).toBeUndefined();
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('returns 503 and no shareId when the persist write fails', async () => {
    saveMock.mockRejectedValue(new Error('firestore down'));

    const res = await POST(postRequest());
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.shareId).toBeUndefined();
  });
});

describe('GET /api/v1/designs/share/[shareId]', () => {
  it('returns the share without the owner uid', async () => {
    getAndCountViewMock.mockResolvedValue({
      shareId: 'abc1234567',
      imageUrl: 'https://img/design.png',
      prompt: 'fine line fern',
      uid: 'user-1',
      sharedAt: '2026-07-25T00:00:00.000Z',
      shareUrl: 'https://tatt-app.vercel.app/share/abc1234567',
      views: 3,
    });

    const { request, params } = getRequest('abc1234567');
    const res = await GET(request, { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.shareId).toBe('abc1234567');
    expect(json.views).toBe(3);
    expect(json.uid).toBeUndefined();
    // A share minted before multi-cut sharing still reads as a one-cut set.
    expect(json.imageUrls).toEqual(['https://img/design.png']);
  });

  it('returns every cut of a multi-cut share', async () => {
    const imageUrls = ['https://img/a.png', 'https://img/b.png'];
    getAndCountViewMock.mockResolvedValue({
      shareId: 'set1234567',
      imageUrl: 'https://img/a.png',
      imageUrls,
      prompt: 'fine line fern',
      uid: 'user-1',
      sharedAt: '2026-07-25T00:00:00.000Z',
      shareUrl: 'https://tatt-app.vercel.app/share/set1234567',
      views: 1,
    });

    const { request, params } = getRequest('set1234567');
    const json = await (await GET(request, { params })).json();

    expect(json.imageUrls).toEqual(imageUrls);
    expect(json.uid).toBeUndefined();
  });

  // GET is also the tally read (TAT-52) — there is no separate endpoint.
  it('carries the vote tally, normalised to all three options', async () => {
    getAndCountViewMock.mockResolvedValue({
      shareId: 'abc1234567',
      imageUrl: 'https://img/design.png',
      prompt: 'fine line fern',
      sharedAt: '2026-07-25T00:00:00.000Z',
      shareUrl: 'https://tatt-app.vercel.app/share/abc1234567',
      views: 3,
      votes: { get_it: 7 }, // Firestore only grows keys that were voted
    });

    const { request, params } = getRequest('abc1234567');
    const json = await (await GET(request, { params })).json();

    expect(json.votes).toEqual({ get_it: 7, sleep_on_it: 0, absolutely_not: 0 });
  });

  it('reads a share minted before voting existed as an all-zero tally', async () => {
    getAndCountViewMock.mockResolvedValue({
      shareId: 'old1234567',
      imageUrl: 'https://img/design.png',
      prompt: 'fine line fern',
      sharedAt: '2026-07-25T00:00:00.000Z',
      shareUrl: 'https://tatt-app.vercel.app/share/old1234567',
      views: 3,
    });

    const { request, params } = getRequest('old1234567');
    const json = await (await GET(request, { params })).json();

    expect(json.votes).toEqual({ get_it: 0, sleep_on_it: 0, absolutely_not: 0 });
  });

  it('?peek=1 reads without counting a view — the owner is not a visitor', async () => {
    getMock.mockResolvedValue({
      shareId: 'abc1234567',
      imageUrl: 'https://img/design.png',
      prompt: 'fine line fern',
      sharedAt: '2026-07-25T00:00:00.000Z',
      shareUrl: 'https://tatt-app.vercel.app/share/abc1234567',
      views: 3,
      votes: { get_it: 2, absolutely_not: 1 },
    });

    const { request, params } = getRequest('abc1234567', '?peek=1');
    const res = await GET(request, { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.votes).toEqual({ get_it: 2, sleep_on_it: 0, absolutely_not: 1 });
    expect(getMock).toHaveBeenCalledWith('abc1234567');
    expect(getAndCountViewMock).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown shareId', async () => {
    getAndCountViewMock.mockResolvedValue(null);

    const { request, params } = getRequest('missing');
    const res = await GET(request, { params });

    expect(res.status).toBe(404);
  });

  it('returns 503 — not 404 — when no durable store is configured', async () => {
    // "We cannot look" must never be reported to a visitor as "it's gone".
    resolveStoreMock.mockReturnValue(null);

    const { request, params } = getRequest('abc1234567');
    const res = await GET(request, { params });
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.code).toBe('SHARE_STORE_UNAVAILABLE');
  });

  it('returns 503 when the lookup itself throws', async () => {
    getAndCountViewMock.mockRejectedValue(new Error('firestore down'));

    const { request, params } = getRequest('abc1234567');
    const res = await GET(request, { params });

    expect(res.status).toBe(503);
  });
});

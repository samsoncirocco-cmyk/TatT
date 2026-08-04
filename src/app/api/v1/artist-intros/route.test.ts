import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { recordMock, notifyMock, getSessionMock } = vi.hoisted(() => ({
  recordMock: vi.fn(),
  notifyMock: vi.fn(),
  getSessionMock: vi.fn(),
}));
vi.mock('@/lib/artist-intro-graph', () => ({ recordArtistIntroRequest: recordMock }));
vi.mock('@/lib/notify', () => ({ notifyOpsOfArtistIntroRequest: notifyMock }));
vi.mock('@/services/designSession', () => ({ getSession: getSessionMock }));

import { POST } from './route';

function request(body: unknown) {
  return new NextRequest('http://localhost/api/v1/artist-intros', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `intro-${Math.random()}` }, body: JSON.stringify(body),
  });
}

const body = { artistId: 'artist_nadia.ink', clientName: 'Maya', clientEmail: 'maya@example.com', message: 'Fine-line botanical piece' };

beforeEach(() => {
  vi.clearAllMocks();
  recordMock.mockResolvedValue({ artistName: 'Nadia Ink' });
  notifyMock.mockResolvedValue({ delivered: true });
  getSessionMock.mockResolvedValue(null);
});

describe('POST /api/v1/artist-intros', () => {
  it('records and relays a browse-only introduction without a deposit', async () => {
    const response = await POST(request(body));
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ received: true, artistName: 'Nadia Ink' });
    expect(recordMock).toHaveBeenCalledWith(body, expect.stringMatching(/^IN-/), undefined);
    expect(notifyMock).toHaveBeenCalledWith(body, expect.stringMatching(/^IN-/), 'Nadia Ink', undefined);
  });

  it('returns 202 when stored even if the ops relay fails, so clients do not retry', async () => {
    notifyMock.mockResolvedValue({ delivered: false, reason: 'no inbox' });
    const response = await POST(request(body));
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({
      received: true,
      delivered: false,
      fallbackEmail: 'support@tatttester.com',
    });
    expect(recordMock).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed input before graph writes', async () => {
    const response = await POST(request({ ...body, clientEmail: 'bad' }));
    expect(response.status).toBe(400);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it('persists the design-session Brief when ds is complete', async () => {
    const brief = { placement: 'forearm', styleTags: ['fine-line'], meaning: 'growth', references: [], axisSelection: {}, placementNotes: [] };
    getSessionMock.mockResolvedValue({ phase: 'complete', brief });
    const withSession = { ...body, designSessionId: 'sess-1' };
    const response = await POST(request(withSession));
    expect(response.status).toBe(202);
    expect(recordMock).toHaveBeenCalledWith(withSession, expect.stringMatching(/^IN-/), brief);
    expect(notifyMock).toHaveBeenCalledWith(withSession, expect.stringMatching(/^IN-/), 'Nadia Ink', brief);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { recordMock, notifyMock } = vi.hoisted(() => ({ recordMock: vi.fn(), notifyMock: vi.fn() }));
vi.mock('@/lib/artist-intro-graph', () => ({ recordArtistIntroRequest: recordMock }));
vi.mock('@/lib/notify', () => ({ notifyOpsOfArtistIntroRequest: notifyMock }));

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
});

describe('POST /api/v1/artist-intros', () => {
  it('records and relays a browse-only introduction without a deposit', async () => {
    const response = await POST(request(body));
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ received: true, artistName: 'Nadia Ink' });
    expect(recordMock).toHaveBeenCalledWith(body, expect.stringMatching(/^IN-/));
    expect(notifyMock).toHaveBeenCalledWith(body, expect.stringMatching(/^IN-/), 'Nadia Ink');
  });

  it('does not claim delivery when the ops relay fails', async () => {
    notifyMock.mockResolvedValue({ delivered: false, reason: 'no inbox' });
    const response = await POST(request(body));
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ received: false, fallbackEmail: 'support@tatttester.com' });
  });

  it('rejects malformed input before graph writes', async () => {
    const response = await POST(request({ ...body, clientEmail: 'bad' }));
    expect(response.status).toBe(400);
    expect(recordMock).not.toHaveBeenCalled();
  });
});

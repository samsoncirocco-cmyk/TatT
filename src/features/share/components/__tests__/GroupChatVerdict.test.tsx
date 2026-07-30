// @vitest-environment jsdom
/**
 * GroupChatVerdict (TAT-52): the owner's compact tally on /designs/[id].
 * The module must add itself only when this browser actually minted a share
 * for the selection, read the tally with peek=1 (the owner is not a view),
 * and say "unavailable" rather than fake a zero when the read fails.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import GroupChatVerdict from '../GroupChatVerdict';
import { rememberShare } from '../../services/shareLinkMemory';

const fetchMock = vi.fn();

const IMAGES = ['https://img/design.png'];

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function shareResponse(votes: Record<string, number>) {
  return { ok: true, status: 200, json: async () => ({ shareId: 'abc1234567', votes }) };
}

describe('GroupChatVerdict', () => {
  it('renders nothing when this browser never shared the design', () => {
    const { container } = render(<GroupChatVerdict imageUrls={IMAGES} />);

    expect(container.innerHTML).toBe('');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reads the remembered share with peek=1 and shows the verdict', async () => {
    rememberShare(IMAGES, {
      shareId: 'abc1234567',
      shareUrl: 'https://tatt-app.vercel.app/share/abc1234567',
    });
    fetchMock.mockResolvedValue(shareResponse({ get_it: 7, sleep_on_it: 2, absolutely_not: 1 }));

    render(<GroupChatVerdict imageUrls={IMAGES} />);

    expect(
      await screen.findByText('The group chat has spoken: 7 say get it.')
    ).toBeTruthy();
    // The owner peeking must not count as a visitor viewing.
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/designs/share/abc1234567?peek=1');
    expect(screen.getByText('GET IT')).toBeTruthy();
    expect(screen.getByText('07')).toBeTruthy();
  });

  it('nudges the owner when the link is out but nobody voted', async () => {
    rememberShare(IMAGES, {
      shareId: 'abc1234567',
      shareUrl: 'https://tatt-app.vercel.app/share/abc1234567',
    });
    fetchMock.mockResolvedValue(shareResponse({}));

    render(<GroupChatVerdict imageUrls={IMAGES} />);

    expect(await screen.findByText(/no votes yet/i)).toBeTruthy();
  });

  it('admits the tally is unreadable instead of showing zeros', async () => {
    rememberShare(IMAGES, {
      shareId: 'abc1234567',
      shareUrl: 'https://tatt-app.vercel.app/share/abc1234567',
    });
    fetchMock.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });

    render(<GroupChatVerdict imageUrls={IMAGES} />);

    expect(await screen.findByText(/tally unavailable/i)).toBeTruthy();
    await waitFor(() => expect(screen.queryByText(/no votes yet/i)).toBeNull());
  });
});

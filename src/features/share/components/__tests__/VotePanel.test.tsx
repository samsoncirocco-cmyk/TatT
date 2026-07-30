// @vitest-environment jsdom
/**
 * VotePanel (TAT-52): the group chat's ballot box on /share/[shareId].
 * Pins the three contracts that matter: a vote renders as counted only when
 * the server counted it, one browser gets one vote (localStorage), and a
 * missing backend degrades to an honest "voting unavailable" — never a
 * tally we cannot keep.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import VotePanel, { verdictLine } from '../VotePanel';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function voteResponse(votes: Record<string, number>, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => (status === 200 ? { success: true, votes } : votes),
  };
}

describe('VotePanel', () => {
  it('offers all three answers, no signup asked', () => {
    render(<VotePanel shareId="abc1234567" />);

    expect(screen.getByRole('button', { name: /get it/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /sleep on it/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /absolutely not/i })).toBeTruthy();
    expect(screen.getByText(/no signup/i)).toBeTruthy();
  });

  it('casts a vote, remembers it, and speaks the verdict in voice', async () => {
    fetchMock.mockResolvedValue(voteResponse({ get_it: 7, sleep_on_it: 2, absolutely_not: 1 }));
    render(<VotePanel shareId="abc1234567" />);

    fireEvent.click(screen.getByRole('button', { name: /get it/i }));

    expect(
      await screen.findByText('The group chat has spoken: 7 say get it.')
    ).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/designs/share/abc1234567/vote',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ vote: 'get_it' }),
      })
    );
    // The dedupe record — this browser has answered.
    expect(window.localStorage.getItem('tatt:share-vote:abc1234567')).toBe('get_it');
    // The ballot box is closed for this browser.
    expect(screen.queryByRole('button', { name: /sleep on it/i })).toBeNull();
    expect(screen.getByText(/get it — your call/i)).toBeTruthy();
  });

  it('shows the tally instead of buttons when this browser already voted', async () => {
    window.localStorage.setItem('tatt:share-vote:abc1234567', 'sleep_on_it');

    render(
      <VotePanel
        shareId="abc1234567"
        initialVotes={{ get_it: 1, sleep_on_it: 3, absolutely_not: 0 }}
      />
    );

    expect(
      await screen.findByText('The group chat says sleep on it — 3 want you to wait.')
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /get it/i })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does NOT record a vote the server never counted', async () => {
    fetchMock.mockResolvedValue(voteResponse({ error: 'nope' }, 500));
    render(<VotePanel shareId="abc1234567" />);

    fireEvent.click(screen.getByRole('button', { name: /get it/i }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(window.localStorage.getItem('tatt:share-vote:abc1234567')).toBeNull();
    // The buttons come back — the friend can try again.
    expect(screen.getByRole('button', { name: /get it/i })).toBeTruthy();
  });

  it('degrades honestly when the backend has no vote store', async () => {
    fetchMock.mockResolvedValue(
      voteResponse({ error: 'Voting is temporarily unavailable.', code: 'SHARE_VOTES_UNAVAILABLE' }, 503)
    );
    render(<VotePanel shareId="abc1234567" />);

    fireEvent.click(screen.getByRole('button', { name: /absolutely not/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/voting unavailable/i);
    // No buttons, no fake tally.
    expect(screen.queryByRole('button', { name: /get it/i })).toBeNull();
    expect(window.localStorage.getItem('tatt:share-vote:abc1234567')).toBeNull();
  });

  it('survives a browser with localStorage sealed shut', async () => {
    const getItem = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('denied');
      });
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('denied');
      });
    fetchMock.mockResolvedValue(voteResponse({ get_it: 1, sleep_on_it: 0, absolutely_not: 0 }));

    render(<VotePanel shareId="abc1234567" />);
    fireEvent.click(screen.getByRole('button', { name: /get it/i }));

    // The vote still counts server-side and the tally still shows.
    expect(
      await screen.findByText('The group chat has spoken: 1 says get it.')
    ).toBeTruthy();

    getItem.mockRestore();
    setItem.mockRestore();
  });
});

describe('verdictLine', () => {
  it.each([
    [{ get_it: 7, sleep_on_it: 2, absolutely_not: 1 }, 'The group chat has spoken: 7 say get it.'],
    [{ get_it: 1, sleep_on_it: 0, absolutely_not: 0 }, 'The group chat has spoken: 1 says get it.'],
    [{ get_it: 0, sleep_on_it: 4, absolutely_not: 1 }, 'The group chat says sleep on it — 4 want you to wait.'],
    [{ get_it: 0, sleep_on_it: 0, absolutely_not: 2 }, 'The group chat has spoken: 2 say absolutely not.'],
    [{ get_it: 3, sleep_on_it: 3, absolutely_not: 0 }, 'The group chat is split. Forward it to a tiebreaker.'],
    [{ get_it: 0, sleep_on_it: 0, absolutely_not: 0 }, 'No votes yet. The group chat is asleep on the job.'],
  ])('frames %j as "%s"', (tally, expected) => {
    expect(verdictLine(tally)).toBe(expected);
  });
});

'use client';

import { useEffect, useState } from 'react';
import {
  normalizeVoteTally,
  totalVotes,
  type ShareVote,
  type ShareVoteTally,
} from '@/lib/share-votes';
import { submitVote, ShareRequestError } from '../services/shareApi';
import { recordedVote, rememberVote } from '../services/shareVoteMemory';

/**
 * The vote panel on /share/[shareId] — where the group chat answers
 * "should I get this?" (TAT-52, the Social Feedback Loop).
 *
 * Three buttons, no signup, no identity. One vote per browser, remembered in
 * shareVoteMemory; the ballot only flips to "counted" when the server said
 * so — an optimistic tick for a vote that never landed would be the same
 * class of lie as a share link that was never minted.
 *
 * Degrades honestly: when the backend has no durable store the route answers
 * 503 SHARE_VOTES_UNAVAILABLE and this panel says voting is unavailable —
 * it never fakes a tally it cannot keep.
 *
 * Punk system: display-font button for the loud option, hairline ghosts for
 * the other two, pink accent, no radii, no toasts.
 */

export const VOTE_LABELS: Record<ShareVote, string> = {
  get_it: 'GET IT',
  sleep_on_it: 'Sleep on it',
  absolutely_not: 'Absolutely not',
};

/**
 * The in-voice verdict line. Exported for the owner's module on
 * /designs/[id], which frames the same tally the same way.
 */
export function verdictLine(tally: ShareVoteTally): string {
  const total = totalVotes(tally);
  if (total === 0) return 'No votes yet. The group chat is asleep on the job.';

  const { get_it, sleep_on_it, absolutely_not } = tally;
  const top = Math.max(get_it, sleep_on_it, absolutely_not);
  const leaders = [get_it, sleep_on_it, absolutely_not].filter((n) => n === top).length;

  if (leaders > 1) return 'The group chat is split. Forward it to a tiebreaker.';
  if (get_it === top)
    return `The group chat has spoken: ${get_it} say${get_it === 1 ? 's' : ''} get it.`;
  if (sleep_on_it === top)
    return `The group chat says sleep on it — ${sleep_on_it} want${sleep_on_it === 1 ? 's' : ''} you to wait.`;
  return `The group chat has spoken: ${absolutely_not} say${absolutely_not === 1 ? 's' : ''} absolutely not.`;
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'sending'; vote: ShareVote }
  | { kind: 'failed'; message: string }
  | { kind: 'unavailable' };

export default function VotePanel({
  shareId,
  initialVotes,
}: {
  shareId: string;
  /** Tally as of the page render — may be a few seconds stale; that's fine. */
  initialVotes?: Partial<ShareVoteTally>;
}) {
  const [tally, setTally] = useState<ShareVoteTally>(() => normalizeVoteTally(initialVotes));
  const [myVote, setMyVote] = useState<ShareVote | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });

  // localStorage is read after mount, never during render — the server
  // renders this page too, and hydration must not disagree with it.
  useEffect(() => {
    setMyVote(recordedVote(shareId));
  }, [shareId]);

  const cast = async (vote: ShareVote) => {
    if (phase.kind === 'sending' || myVote) return;
    setPhase({ kind: 'sending', vote });
    try {
      const votes = await submitVote(shareId, vote);
      rememberVote(shareId, vote);
      setTally(votes);
      setMyVote(vote);
      setPhase({ kind: 'idle' });
    } catch (e) {
      if (e instanceof ShareRequestError && e.code === 'SHARE_VOTES_UNAVAILABLE') {
        setPhase({ kind: 'unavailable' });
      } else {
        setPhase({ kind: 'failed', message: "That didn't count. Try again." });
      }
    }
  };

  return (
    <div className="mt-8">
      <div className="text-[10px] uppercase tracking-[0.28em] text-pink mb-3 font-body">
        ▸ Should they get it?
      </div>

      {phase.kind === 'unavailable' ? (
        <p
          className="border-2 hairline p-4 text-[10px] uppercase tracking-[0.22em] leading-[1.7] text-white/60 font-body"
          role="alert"
        >
          Voting unavailable right now — the group chat will have to use words.
        </p>
      ) : myVote ? (
        <div className="border-2 hairline p-5" role="status">
          <p className="font-display text-white text-[22px] sm:text-[26px] leading-[1.05] tracking-[0.01em]">
            {verdictLine(tally)}
          </p>
          <dl className="mt-4 space-y-2">
            {(Object.keys(VOTE_LABELS) as ShareVote[]).map((option) => (
              <div
                key={option}
                className="flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.22em] font-body tabular-nums"
              >
                <dt className={option === myVote ? 'text-pink' : 'text-white/60'}>
                  {VOTE_LABELS[option]}
                  {option === myVote ? ' — your call' : ''}
                </dt>
                <dd className={option === myVote ? 'text-pink' : 'text-white/60'}>
                  {String(tally[option]).padStart(2, '0')}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-white/40 font-body">
            {totalVotes(tally)} vote{totalVotes(tally) === 1 ? '' : 's'} in. One per browser —
            this is a poll, not an election.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => cast('get_it')}
              disabled={phase.kind === 'sending'}
              className="tape press inline-flex items-center justify-center px-6 py-4 font-display text-[22px] sm:text-[26px] leading-none tracking-[0.02em] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {phase.kind === 'sending' && phase.vote === 'get_it' ? 'Counting…' : 'GET IT'}
              <span className="ml-3 text-[16px]">▸</span>
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => cast('sleep_on_it')}
                disabled={phase.kind === 'sending'}
                className="flex-1 text-[10px] uppercase tracking-[0.25em] text-white/70 hover:text-black hover:bg-pink border-2 hairline px-4 py-4 press font-body inline-flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {phase.kind === 'sending' && phase.vote === 'sleep_on_it'
                  ? 'Counting…'
                  : '▸ Sleep on it'}
              </button>
              <button
                type="button"
                onClick={() => cast('absolutely_not')}
                disabled={phase.kind === 'sending'}
                className="flex-1 text-[10px] uppercase tracking-[0.25em] text-white/70 hover:text-black hover:bg-pink border-2 hairline px-4 py-4 press font-body inline-flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {phase.kind === 'sending' && phase.vote === 'absolutely_not'
                  ? 'Counting…'
                  : '▸ Absolutely not'}
              </button>
            </div>
          </div>
          <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/40 font-body">
            No signup. One vote per browser. They&apos;ll see the tally.
          </p>
          {phase.kind === 'failed' && (
            <p
              className="mt-3 text-[10px] uppercase tracking-[0.2em] text-pink font-body"
              role="alert"
            >
              {phase.message}
            </p>
          )}
        </>
      )}
    </div>
  );
}

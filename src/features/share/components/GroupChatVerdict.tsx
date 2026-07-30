'use client';

import { useEffect, useState } from 'react';
import { totalVotes, type ShareVote, type ShareVoteTally } from '@/lib/share-votes';
import { peekShareVotes } from '../services/shareApi';
import { recallShare } from '../services/shareLinkMemory';
import { VOTE_LABELS, verdictLine } from './VotePanel';

/**
 * The owner's side of the Social Feedback Loop (TAT-52): a compact tally of
 * what the group chat said about a design, shown on /designs/[id].
 *
 * Deliberately small and self-erasing — it renders NOTHING until it has a
 * remembered share link for this exact selection AND a tally read back from
 * the API. A design never shared has no poll; a backend that cannot answer
 * gets an honest one-liner, not a fake zero. The host page is lane 3's
 * territory, so this stays one block that adds itself or stays out.
 *
 * The tally read uses `peek=1`: the owner checking their own poll must not
 * count as a "view" of their own share.
 */

type State =
  | { kind: 'idle' } // no remembered share, or still looking — render nothing
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'tally'; votes: ShareVoteTally };

export default function GroupChatVerdict({
  imageUrls,
  className = '',
}: {
  /** The selection identity — same list ShareDesignAction shares. */
  imageUrls: string[];
  className?: string;
}) {
  const [state, setState] = useState<State>({ kind: 'idle' });

  useEffect(() => {
    const remembered = recallShare(imageUrls);
    if (!remembered) {
      setState({ kind: 'idle' });
      return;
    }
    let cancelled = false;
    setState({ kind: 'loading' });
    peekShareVotes(remembered.shareId).then((votes) => {
      if (cancelled) return;
      setState(votes ? { kind: 'tally', votes } : { kind: 'unavailable' });
    });
    return () => {
      cancelled = true;
    };
    // The selection's identity is its contents, not the array instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrls.join(' ')]);

  if (state.kind === 'idle' || state.kind === 'loading') return null;

  return (
    <div className={`border-2 hairline p-5 ${className}`}>
      <div className="text-[10px] uppercase tracking-[0.28em] text-pink mb-3 font-body">
        ▸ Group chat verdict
      </div>

      {state.kind === 'unavailable' ? (
        <p className="text-[10px] uppercase tracking-[0.22em] leading-[1.7] text-white/50 font-body">
          Tally unavailable right now — the votes are safe, we just can&apos;t read them.
        </p>
      ) : totalVotes(state.votes) === 0 ? (
        <p className="text-[10px] uppercase tracking-[0.22em] leading-[1.7] text-white/50 font-body">
          Link&apos;s out, no votes yet. Rattle the group chat.
        </p>
      ) : (
        <>
          <p className="font-display text-white text-[20px] sm:text-[24px] leading-[1.05] tracking-[0.01em]">
            {verdictLine(state.votes)}
          </p>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            {(Object.keys(VOTE_LABELS) as ShareVote[]).map((option) => (
              <div
                key={option}
                className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-white/60 font-body tabular-nums"
              >
                <dt>{VOTE_LABELS[option]}</dt>
                <dd className="text-pink">{String(state.votes[option]).padStart(2, '0')}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </div>
  );
}

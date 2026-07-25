'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { DesignSession } from '@/services/designSession/types';
import type {
  ConversationMessage,
  ConversationStage,
} from '@/services/designConversation/types';
import {
  converse,
  confirmProposal,
  ConversationUnavailableError,
} from '../services/designSessionApi';
import { ChatBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { ThinkingLine } from './ThinkingLine';
import { DesignSessionFlow } from './DesignSessionFlow';

// The one-liner shown when every conversation provider is down and we
// degrade to the scripted two-question intake (ADR-0019). Soft — never an
// error screen, never an apology essay.
const FALLBACK_LINE = 'Keeping it simple today — two quick questions and we’re off.';

/**
 * How the surface is rendered right now.
 * 'conversation' — the live intake chat (ADR-0019).
 * 'reveal'       — proposal confirmed (ADR-0020); the existing reveal flow
 *                  owns everything from here, seeded with the session.
 * 'fallback'     — every provider down; the scripted intake takes over.
 */
type SurfaceMode = 'conversation' | 'reveal' | 'fallback';

/** The in-flight call, kept around so a failed one can be retried. */
type ConversationAction =
  | { kind: 'converse'; message?: string }
  | { kind: 'confirm' };

/**
 * The conversational intake (ADR-0019–0022): a real chat that fills the
 * intake record as a side effect. Opens on mount, proposes with playback +
 * consent (ADR-0020), warm-handoffs at the cadence cap (ADR-0021), and
 * degrades to the scripted two-question intake if the conversation engine
 * is unavailable. TurnLog stays server-side — telemetry is never rendered.
 */
export function DesignConversation() {
  const [mode, setMode] = useState<SurfaceMode>('conversation');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [stage, setStage] = useState<ConversationStage>('chatting');
  const [playback, setPlayback] = useState<string | undefined>();
  const [handoffUrl, setHandoffUrl] = useState<string | undefined>();
  const [revealSession, setRevealSession] = useState<DesignSession | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<ConversationAction | null>(null);
  const openerRequested = useRef(false);

  const runAction = (action: ConversationAction) => {
    setError(null);
    setLastAction(action);
    setPending(true);

    if (action.kind === 'confirm') {
      confirmProposal(sessionId!)
        .then((session) => {
          setRevealSession(session);
          setMode('reveal');
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Something snapped — try again.');
        })
        .finally(() => setPending(false));
      return;
    }

    converse(
      action.message === undefined ? { sessionId } : { sessionId, message: action.message }
    )
      .then((response) => {
        setSessionId(response.sessionId);
        setStage(response.stage);
        setPlayback(response.playback);
        setHandoffUrl(response.handoffUrl);
        setMessages((prev) => [...prev, { role: 'bot', text: response.reply }]);
      })
      .catch((err: unknown) => {
        if (err instanceof ConversationUnavailableError) {
          setMode('fallback');
          return;
        }
        setError(err instanceof Error ? err.message : 'Something snapped — try again.');
      })
      .finally(() => setPending(false));
  };

  // Opener on mount — the bot speaks first (ADR-0019).
  useEffect(() => {
    if (openerRequested.current) return;
    openerRequested.current = true;
    runAction({ kind: 'converse' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only opener
  }, []);

  const handleSend = (text: string) => {
    setMessages((prev) => [...prev, { role: 'user', text }]);
    runAction({ kind: 'converse', message: text });
  };

  // Every provider down → the scripted intake carries the session (ADR-0019).
  if (mode === 'fallback') {
    return (
      <div className="space-y-5">
        {messages.map((message, i) => (
          <ChatBubble key={i} role={message.role}>
            {message.text}
          </ChatBubble>
        ))}
        <ChatBubble role="bot">{FALLBACK_LINE}</ChatBubble>
        <DesignSessionFlow />
      </div>
    );
  }

  const transcript = messages.map((message, i) => (
    <ChatBubble key={i} role={message.role}>
      {message.text}
    </ChatBubble>
  ));

  // Confirmed — the existing reveal → pick → refine → handoff flow takes
  // over, with the conversation transcript kept above it.
  if (mode === 'reveal' && revealSession) {
    return (
      <div className="space-y-5">
        {transcript}
        <DesignSessionFlow initialSession={revealSession} />
      </div>
    );
  }

  const showProposal = stage === 'proposal' && !pending && !error;
  const showHandoff = stage === 'handoff' && !pending && !error;

  return (
    <div className="space-y-5">
      {transcript}

      {/* Proposal beat (ADR-0020): the bot's reply bubble above already
          carries the playback, so only the consent CTA renders here. A
          correction is just another message through the same reply box
          below. */}
      {showProposal && playback && (
        <button
          type="button"
          onClick={() => runAction({ kind: 'confirm' })}
          className="tape press inline-flex items-center px-6 py-4 font-display text-[20px] leading-none tracking-[0.02em] uppercase"
        >
          Show me<span className="ml-3 text-[14px]">▸</span>
        </button>
      )}

      {/* Warm handoff (ADR-0021): the bot's judgment call, never a limit. */}
      {showHandoff && handoffUrl && (
        <Link
          href={handoffUrl}
          className="tape press inline-flex items-center px-6 py-4 font-display text-[20px] leading-none tracking-[0.02em] uppercase"
        >
          Find my artist<span className="ml-3 text-[14px]">▸</span>
        </Link>
      )}

      {pending && <ThinkingLine label="Typing" />}

      {error && (
        <div className="space-y-3">
          <ChatBubble role="bot">{error}</ChatBubble>
          <button
            type="button"
            onClick={() => lastAction && runAction(lastAction)}
            className="press font-body text-[10px] uppercase tracking-[0.2em] text-white/70 hover:text-black hover:bg-pink border hairline px-3 py-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* The reply line — doubles as the proposal's correction box. Hidden
          at the handoff: the CTA is the way forward, not more chat. */}
      {stage !== 'handoff' && (
        <ChatInput
          placeholder="Say it however it comes out…"
          ariaLabel="Your reply"
          onSubmit={handleSend}
          disabled={pending}
        />
      )}
    </div>
  );
}

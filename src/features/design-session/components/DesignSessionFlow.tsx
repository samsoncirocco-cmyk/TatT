'use client';

import { useState } from 'react';
import type { DesignSession } from '@/services/designSession/types';
import { startSession, submitPick, submitRefinement } from '../services/designSessionApi';
import { ChatBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { ThinkingLine } from './ThinkingLine';
import { RevealGrid, type RevealMode } from './RevealGrid';
import { RefinementPrompt } from './RefinementPrompt';
import { HandoffCard } from './HandoffCard';
import { PlacementPreview } from './PlacementPreview';

// ADR-0009: exactly two opening questions — placement and meaning — rendered
// as conversation, never labeled form fields.
const QUESTION_PLACEMENT = 'Where does it go?';
const QUESTION_MEANING = 'And what do you want to feel when you look at it?';

type FlowStep =
  | 'ask-placement'
  | 'ask-meaning'
  | 'starting'
  | 'reveal'
  | 'most-not-you'
  | 'picking'
  | 'refine'
  | 'refining'
  | 'complete';

/** The in-flight session call, kept around so a failed one can be retried. */
type SessionAction =
  | { kind: 'start'; placement: string; meaning: string }
  | { kind: 'pick'; sessionId: string; pickId: string; mostNotYouId: string }
  | { kind: 'refine'; sessionId: string; answer: string };

/**
 * The design session as one conversation: intake → working state → reveal →
 * pick → most-not-you tap → one refinement round → hard-stop handoff
 * (ADR-0013). State only ever moves forward.
 *
 * The scripted two-question intake here is the LLM-down degraded mode
 * (ADR-0019); the live conversational intake (DesignConversation) hands an
 * already-revealed session in via `initialSession`, which starts this flow
 * at the reveal with the intake transcript owned by the conversation.
 */
export function DesignSessionFlow({ initialSession }: { initialSession?: DesignSession } = {}) {
  const scriptedIntake = initialSession == null;
  const [step, setStep] = useState<FlowStep>(scriptedIntake ? 'ask-placement' : 'reveal');
  const [placementAnswer, setPlacementAnswer] = useState('');
  const [meaningAnswer, setMeaningAnswer] = useState('');
  const [session, setSession] = useState<DesignSession | null>(initialSession ?? null);
  const [pickId, setPickId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<SessionAction | null>(null);

  const runAction = (action: SessionAction) => {
    setError(null);
    setLastAction(action);

    let call: Promise<DesignSession>;
    let nextStep: FlowStep;
    if (action.kind === 'start') {
      setStep('starting');
      call = startSession({ placementAnswer: action.placement, meaningAnswer: action.meaning });
      nextStep = 'reveal';
    } else if (action.kind === 'pick') {
      setStep('picking');
      call = submitPick(action.sessionId, {
        pickId: action.pickId,
        mostNotYouId: action.mostNotYouId,
      });
      nextStep = 'refine';
    } else {
      setStep('refining');
      call = submitRefinement(action.sessionId, { answer: action.answer });
      nextStep = 'complete';
    }

    call
      .then((next) => {
        setSession(next);
        setStep(nextStep);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Something snapped — try again.');
      });
  };

  const handlePlacement = (text: string) => {
    setPlacementAnswer(text);
    setStep('ask-meaning');
  };

  const handleMeaning = (text: string) => {
    setMeaningAnswer(text);
    runAction({ kind: 'start', placement: placementAnswer, meaning: text });
  };

  const handleGridSelect = (variationId: string) => {
    if (step === 'reveal') {
      setPickId(variationId);
      setStep('most-not-you');
    } else if (step === 'most-not-you' && session && pickId) {
      runAction({ kind: 'pick', sessionId: session.id, pickId, mostNotYouId: variationId });
    }
  };

  const gridMode: RevealMode = step === 'reveal' ? 'pick' : step === 'most-not-you' ? 'not-you' : 'locked';
  const showGrid = session !== null && (step === 'reveal' || step === 'most-not-you' || step === 'picking');

  return (
    <div className="space-y-5">
      {/* Scripted intake transcript (skipped when the live conversation
          already ran intake and handed a revealed session in). */}
      {scriptedIntake && (
        <>
          <ChatBubble role="bot">{QUESTION_PLACEMENT}</ChatBubble>
          {placementAnswer && <ChatBubble role="user">{placementAnswer}</ChatBubble>}
          {step !== 'ask-placement' && <ChatBubble role="bot">{QUESTION_MEANING}</ChatBubble>}
          {meaningAnswer && <ChatBubble role="user">{meaningAnswer}</ChatBubble>}

          {step === 'ask-placement' && (
            <ChatInput
              placeholder="Forearm, ribs, behind the ear…"
              ariaLabel="Where does it go?"
              onSubmit={handlePlacement}
            />
          )}
          {step === 'ask-meaning' && (
            <ChatInput
              placeholder="Say it however it comes out…"
              ariaLabel="What do you want to feel?"
              onSubmit={handleMeaning}
            />
          )}
        </>
      )}

      {/* Working state → the bot narrates with the logged axis rationale once it lands */}
      {step === 'starting' && !error && <ThinkingLine label="Sketching four directions" />}
      {showGrid && session && (
        <>
          <ChatBubble role="bot">{session.axisSelection.rationale}</ChatBubble>
          <ChatBubble role="bot">
            {step === 'most-not-you' ? (
              <>
                And which one feels most <em>not</em> you?
              </>
            ) : (
              'Four directions. Tap the one that hits.'
            )}
          </ChatBubble>
          <RevealGrid
            variations={session.variations}
            mode={gridMode}
            pickId={pickId}
            onSelect={handleGridSelect}
          />
        </>
      )}
      {step === 'picking' && !error && <ThinkingLine label="Reading your pick" />}

      {/* One refinement round — then the hard stop (ADR-0013) */}
      {step === 'refine' && session?.refinementQuestion && (
        <>
          <ChatBubble role="bot">{session.refinementQuestion}</ChatBubble>
          <RefinementPrompt
            question={session.refinementQuestion}
            onAnswer={(answer) => runAction({ kind: 'refine', sessionId: session.id, answer })}
          />
        </>
      )}
      {step === 'refining' && !error && <ThinkingLine label="Reworking your pick" />}

      {step === 'complete' && session && (
        <>
          <ChatBubble role="bot">Done. One pass, one answer, one design.</ChatBubble>
          <HandoffCard session={session} />
          {/* Placement preview — a canvas artifact, not a regen, so it lives
              outside the ADR-0013 hard stop. Saving updates the session so
              the Brief carries the preview into the booking. */}
          <PlacementPreview session={session} onAttached={setSession} />
        </>
      )}

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
    </div>
  );
}

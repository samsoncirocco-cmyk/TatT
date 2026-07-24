/**
 * Demo mode (NEXT_PUBLIC_DEMO_MODE): a short deterministic scripted
 * conversation — no LLM call ever (ADR-0019). Shape: opener → two canned
 * follow-ups → proposal with a fixed playback and a plausible demo
 * IntakeRecord. Same TurnLog discipline as the live engine: confidence and
 * missingFields come from the real scorer, so the demo transcript is an
 * honest preview of the day-one logs.
 */

import type { IntakeRecord } from '@/services/intake';
import type { ConversationTurnResult, TurnLog } from '../types';
import { proposalReply } from './persona';
import { scoreRecord } from './confidence';

export const DEMO_MODEL = 'demo-script';

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

/** The plausible fixed record the demo proposal plays back. */
export const DEMO_RECORD: IntakeRecord = {
  placement: 'left forearm',
  styleTags: ['fine-line'],
  meaning: 'a hummingbird for my grandmother — she fed them every morning',
  references: [],
  ambiguousAxes: ['color-blackwork', 'literal-abstract'],
};

const DEMO_PLAYBACK =
  'a fine line hummingbird on your left forearm, for your grandmother who fed them every morning';

interface DemoBeat {
  reply: string;
  record: Partial<IntakeRecord>;
  stage: 'chatting' | 'proposal';
  playback?: string;
}

const DEMO_BEATS: DemoBeat[] = [
  {
    reply:
      "Left forearm — great canvas, it ages well and you get to see it every day. So what's the story? What do you want this piece to mean?",
    record: {
      placement: 'left forearm',
      styleTags: [],
      references: [],
      ambiguousAxes: ['bold-fine', 'color-blackwork', 'literal-abstract', 'minimal-ornate'],
    },
    stage: 'chatting',
  },
  {
    reply:
      "A hummingbird for your grandmother — that's a beautiful reason. I'm picturing something delicate, fine line. Is that the feel, or do you want it bolder?",
    record: {
      placement: 'left forearm',
      styleTags: ['fine-line'],
      meaning: 'a hummingbird for my grandmother — she fed them every morning',
      references: [],
      ambiguousAxes: ['color-blackwork', 'literal-abstract'],
    },
    stage: 'chatting',
  },
  {
    reply: proposalReply(DEMO_PLAYBACK),
    record: DEMO_RECORD,
    stage: 'proposal',
    playback: DEMO_PLAYBACK,
  },
];

/**
 * Deterministic demo turn: beats 1 and 2 are canned follow-ups; every turn
 * from 3 on replays the fixed proposal. Input messages are ignored — the
 * demo is a script, not a model.
 */
export function runDemoTurn(userTurn: number): ConversationTurnResult {
  const beat = DEMO_BEATS[Math.min(Math.max(userTurn, 1), DEMO_BEATS.length) - 1];
  const { confidence, missingFields } = scoreRecord(beat.record);
  const turnLog: TurnLog = {
    turn: userTurn,
    confidence,
    missingFields,
    firedRule: beat.stage === 'proposal' ? 'judgment' : 'none',
    model: DEMO_MODEL,
  };
  return {
    reply: beat.reply,
    stage: beat.stage,
    ...(beat.playback ? { playback: beat.playback } : {}),
    record: { ...beat.record },
    turnLog,
  };
}

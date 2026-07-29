/**
 * SketchBot's live notepad projection (TAT-48).
 *
 * The ONE place the intake record becomes user-visible outside the chat.
 * HARD RULE (TAT-47 defect 8, revealNarration precedent): only fields the
 * user would recognize as their own brief — placement, cast, style, scene,
 * vibe, and the IP heads-up. Internal rationale, confidence scores, axis
 * telemetry, and TurnLogs NEVER cross this boundary; readiness surfaces
 * only as the boolean `sufficient`, never as a score.
 */

import type { IntakeRecord } from '@/services/intake';
import type { CharacterMatch } from '@/services/intake/internal/characterSubject';
import type { SessionNotes } from '../types';
import { scoreRecord } from './confidence';

/** Notepad rows are glanceable, not prose — bounded like the playback. */
const VIBE_MAX = 140;
const SCENE_MAX = 120;
const CAST_FALLBACK_MAX = 90;

function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : max)}…`;
}

function titleCase(name: string): string {
  return name.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/**
 * Project the working record into the notepad. Cast members are enumerated
 * one entry each — the notepad exists so a silently-dropped character is
 * visible immediately (TAT-47 defect 6, "we missed a lot of the characters").
 * When the character database matched nothing but the brief carries a
 * subject, that phrase is the single cast entry rather than showing the
 * user an empty subject line for a brief that has one.
 */
export function buildSessionNotes(
  record: Partial<IntakeRecord>,
  characters: CharacterMatch[],
  moment?: string
): SessionNotes {
  const subject = (record.subject ?? '').trim();
  const cast = characters.length
    ? characters.map((match) => `${titleCase(match.name)} (${match.series})`)
    : subject
      ? [truncateAtWord(subject, CAST_FALLBACK_MAX)]
      : [];

  const notes: SessionNotes = {
    cast,
    // The IP rule fired: a named subject means an inspired-by take, and the
    // notepad owes the user the same heads-up the chat gives (ADR-0023).
    ipHeadsUp: Boolean(subject),
    // ADR-0028 readiness — the same gate confirm enforces (placement plus
    // something to draw), surfaced as a boolean only.
    sufficient: scoreRecord(record).hasRequiredFields,
  };

  const placement = (record.placement ?? '').trim();
  if (placement) notes.placement = placement;

  const styleTags = record.styleTags ?? [];
  if (styleTags.length > 0) {
    notes.style = styleTags.map((tag) => tag.replace(/-/g, ' ')).join(' + ');
  }

  const scene = (moment ?? '').trim();
  if (scene) notes.scene = truncateAtWord(scene, SCENE_MAX);

  const vibe = (record.meaning ?? '').trim();
  if (vibe) notes.vibe = truncateAtWord(vibe, VIBE_MAX);

  return notes;
}

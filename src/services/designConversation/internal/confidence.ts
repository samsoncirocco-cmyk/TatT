/**
 * Readiness confidence for the proposal beat (ADR-0020, ADR-0021).
 *
 * This is a transparent 0–1 score computed in code from field presence and
 * strength — NEVER a raw model number. The formula (contributions sum to
 * exactly 1.0):
 *
 *   placement present                       +0.20
 *   placement specific (names a concrete
 *     body part, not just a bare limb)      +0.10
 *   meaning present                         +0.20
 *   meaning non-trivial (>= 4 words)        +0.10
 *   style tags                              +0.10 per tag, capped at +0.20
 *   variation axes resolved                 +0.05 per resolved axis (of 4),
 *                                            up to +0.20
 *
 * The judgment rule fires the proposal when confidence >=
 * CONFIDENCE_THRESHOLD AND both required fields (placement, meaning) are
 * present. missingFields lists every field that earned less than full
 * credit — "missing or weak", per the TurnLog contract.
 */

import type { IntakeRecord } from '@/services/intake';
import { VARIATION_AXIS_POOL } from '@/services/intake';

export const CONFIDENCE_THRESHOLD = 0.7;

/**
 * Concrete body parts. A placement naming one of these counts as
 * "specific"; bare limbs/regions ("arm", "leg", "back") count as present
 * but not specific — the artist still has to pin them down.
 */
const SPECIFIC_PLACEMENT_PARTS = [
  'behind the ear', 'shoulder blade', 'upper arm', 'lower back', 'upper back',
  'forearm', 'shoulder', 'sternum', 'collarbone', 'bicep', 'tricep', 'wrist',
  'hand', 'finger', 'chest', 'spine', 'ribcage', 'rib cage', 'ribs', 'hip',
  'thigh', 'knee', 'calf', 'shin', 'ankle', 'foot', 'neck', 'ear',
] as const;

export interface RecordReadiness {
  /** 0–1 readiness score per the documented formula. */
  confidence: number;
  /** Fields that earned less than full credit — missing or weak. */
  missingFields: string[];
  /** Both hard requirements (placement, meaning) present (ADR-0020). */
  hasRequiredFields: boolean;
}

function isSpecificPlacement(placement: string): boolean {
  const text = placement.toLowerCase();
  return SPECIFIC_PLACEMENT_PARTS.some((part) =>
    new RegExp(`\\b${part}\\b`).test(text)
  );
}

export function scoreRecord(record: Partial<IntakeRecord>): RecordReadiness {
  const placement = (record.placement ?? '').trim();
  const meaning = (record.meaning ?? '').trim();
  const styleTags = record.styleTags ?? [];
  const ambiguousAxes = record.ambiguousAxes ?? [...VARIATION_AXIS_POOL];

  const missingFields: string[] = [];
  let confidence = 0;

  if (placement) {
    confidence += 0.2;
    if (isSpecificPlacement(placement)) confidence += 0.1;
    else missingFields.push('placement');
  } else {
    missingFields.push('placement');
  }

  const meaningWords = meaning ? meaning.split(/\s+/).filter(Boolean).length : 0;
  if (meaning) {
    confidence += 0.2;
    if (meaningWords >= 4) confidence += 0.1;
    else missingFields.push('meaning');
  } else {
    missingFields.push('meaning');
  }

  confidence += Math.min(styleTags.length, 2) * 0.1;
  if (styleTags.length < 2) missingFields.push('styleTags');

  const resolvedAxes = Math.max(
    0,
    VARIATION_AXIS_POOL.length -
      Math.min(ambiguousAxes.length, VARIATION_AXIS_POOL.length)
  );
  confidence += resolvedAxes * 0.05;

  return {
    confidence: Math.min(1, Number(confidence.toFixed(2))),
    missingFields,
    hasRequiredFields: Boolean(placement && meaning),
  };
}

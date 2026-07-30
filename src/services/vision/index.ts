// Public entry point of the vision module (TAT-50). Everything under
// internal/ is implementation detail — import only from here.
//
// One shared reference-image analyzer for BOTH channels (SketchBot SMS
// media and the web design session's reference upload): a single Vertex
// Gemini multimodal call producing a structured tattoo-brief reading —
// subjects, recognizable characters (the IP rule's input), style
// descriptors, palette, composition, and a user-visible summary line.
//
// Guardrails: budget-gated (checkBudget / VISION_ANALYSIS_COST_CENTS on the
// same global pool as renders), fail-soft ({ status: 'failed' }, never a
// throw — the bot owns the in-voice apology), demo-mode free.

export {
  analyzeReferenceImage,
  ANALYZABLE_IMAGE_TYPES,
  MAX_REFERENCE_IMAGE_BYTES,
  MAX_REFERENCE_IMAGES_PER_MESSAGE,
} from './internal/referenceAnalysis';
export {
  referenceAckText,
  referenceFollowUpText,
  referenceOverflowText,
  REFERENCE_UNREADABLE_TEXT,
  REFERENCE_BUDGET_TEXT,
} from './internal/voice';
export type {
  ReferenceImage,
  ReferenceCharacter,
  ReferenceAnalysis,
  ReferenceAnalysisOutcome,
} from './types';

// Shared contract for reference-image vision analysis (TAT-50). Both
// channels — the SketchBot SMS adapter (inbound MMS media) and the web
// design session's reference upload — build against these types.

/** One image handed to the analyzer, already fetched and size-checked. */
export interface ReferenceImage {
  /** Raw image bytes, base64-encoded (no data-URL prefix). */
  data: string;
  /** Image MIME type (must be one of ANALYZABLE_IMAGE_TYPES). */
  mimeType: string;
}

/** A character the vision model recognized in the reference image. */
export interface ReferenceCharacter {
  name: string;
  /** Franchise/series when the model could place it. */
  series?: string;
}

/**
 * What the analyzer understood about one reference image — a tattoo-brief
 * reading, not a generic caption. `summary` is the one line designed to be
 * user-visible (the notepad row, the in-voice acknowledgment); everything
 * else is structured signal for the intake record.
 */
export interface ReferenceAnalysis {
  /** One glanceable line, e.g. "five chibi anime characters, bold outlines, red smoke background". */
  summary: string;
  /** Concrete visual subjects ("dragon", "group of five characters"). */
  subjects: string[];
  /** Recognizable (possibly copyrighted) characters — feeds the IP rule. */
  characters: ReferenceCharacter[];
  /** Free-form style descriptors ("chibi", "cel shading", "bold outlines"). */
  styleDescriptors: string[];
  /** Dominant colors, plain words ("red", "black"). */
  palette: string[];
  /** Composition note ("group shot in a loose circle"). */
  composition: string;
  /** Model's 0–1 confidence in its own reading. */
  confidence: number;
}

/**
 * Outcome of one analysis attempt. Three-way so callers can speak honestly
 * in-voice: a failed read ("couldn't make that image out") is a different
 * sentence from a budget skip ("can't study photos right now").
 */
export type ReferenceAnalysisOutcome =
  | { status: 'analyzed'; analysis: ReferenceAnalysis }
  | { status: 'budget_exhausted' }
  | { status: 'failed' };

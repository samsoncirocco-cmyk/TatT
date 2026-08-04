/**
 * The unrequested-lettering guard (#297).
 *
 * WHY THIS EXISTS: every image model measured writes words into roughly one
 * render in five, and it is not a property of any one provider. Measured on
 * the same corpus through the real prompt path (#293), n≈20 per arm:
 *
 *   Gemini 3.1 Flash Image   30% of renders contained lettering
 *   Imagen 4 via Replicate   22%
 *   Flux dev                 20%   ← the lane in production
 *
 * The words are not noise. Renders came back carrying `GOKU`, `VEGETA`,
 * `PLUS ULTRA!`, `BANG!` — the model labelling what it drew, comic-panel
 * style — and one carried a scraped Instagram handle, `@jennalittle_me`.
 *
 * So no routing choice fixes this; only a gate does. A customer who approves
 * a design with a word in it wears that word permanently.
 *
 * TWO THINGS THIS DELIBERATELY IS NOT:
 *
 * 1. **Not a bare OCR check.** Script tattoos, memorial names and banner text
 *    are ordinary tattoo work; a gate that rejected them would break the
 *    product to protect it. So the vision call reads the lettering and a
 *    separate, deterministic test on the request decides whether it belongs —
 *    see `requestsLettering` for why those two jobs are split rather than
 *    asked as one question.
 *
 * 2. **Not fail-closed.** Any provider, budget or parse failure returns
 *    `clean` with `screened: false`. A vision outage must not stop a customer
 *    getting their design — the guard removes a defect, it is not a
 *    correctness barrier, and blocking renders on it would trade a cosmetic
 *    problem for an outage. Every skip is visible in the verdict rather than
 *    silently indistinguishable from a pass.
 */
import { logger } from '@/lib/logger';
import { getGcpAccessToken } from '@/lib/google-auth-edge';
import { buildVertexEndpoint } from '@/lib/vertex-endpoint';
import { checkBudget, recordSpend, VISION_ANALYSIS_COST_CENTS } from '@/lib/budget-tracker';

/** Same env chain as vision, with the render provider's `tatt-pro` default. */
function vertexProjectId(): string {
  return (
    process.env.NEXT_PUBLIC_VERTEX_AI_PROJECT_ID ||
    process.env.GCP_PROJECT_ID ||
    process.env.VERTEX_PROJECT_ID ||
    'tatt-pro'
  );
}

/** Same override the reference-analysis pass uses; kept independent of it. */
export const DEFAULT_GUARD_MODEL = 'gemini-3.1-flash-lite';

function guardModel(): string {
  return process.env.TEXT_GUARD_MODEL || process.env.VISION_MODEL || DEFAULT_GUARD_MODEL;
}

export interface TextVerdict {
  /** True when the image carries lettering the request did not ask for. */
  intruded: boolean;
  /** The offending words, for logs and for the re-roll decision's audit trail. */
  words: string[];
  /**
   * False when the check did not actually run — budget, provider or parse
   * failure. `intruded: false, screened: false` is "unknown", not "clean",
   * and callers must not report it as a pass.
   */
  screened: boolean;
  /** Why it did not run, when it did not. */
  skipReason?: 'budget' | 'provider' | 'parse' | 'disabled';
}

const CLEAN: TextVerdict = { intruded: false, words: [], screened: true };

function skipped(skipReason: TextVerdict['skipReason']): TextVerdict {
  return { intruded: false, words: [], screened: false, skipReason };
}

/**
 * Does the request ask for writing to appear in the artwork?
 *
 * Deliberately a keyword test on our own prompt text, not a model judgment.
 *
 * The first three versions of this guard asked ONE vision call to do both
 * jobs — read the lettering and decide whether it was requested — and it
 * failed the same way each time. Given a request that explicitly asked for
 * "the character names GOKU, VEGETA and PICCOLO lettered in a banner", it
 * still reported the banner as intruded. Sharpening the wording fixed the
 * opposite direction and never this one: with the image in front of it, the
 * model reads lettering as a defect regardless of what the request says.
 *
 * So the judgment moves out of the vision call. The prompt is text we
 * generate (structuredMode builds it), so a keyword test over it is
 * auditable and deterministic, and the failure is bounded in the safe
 * direction: a missed phrasing flags a legitimate script tattoo, which costs
 * a re-roll and a metadata flag — it never withholds the design, because
 * nothing here rejects a render.
 */
const LETTERING_REQUESTED = [
  'lettering', 'letters', 'text', 'script', 'calligraphy', 'typography', 'font',
  'banner', 'scroll', 'ribbon', 'quote', 'inscription', 'inscribed', 'written',
  'writing', 'word', 'words', 'name reading', 'reading "', "reading '",
  'the name', 'the date', 'spelled', 'spelling', 'cursive',
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Negations that strip lettering needles so "no text" / "without lettering"
 * / "no text or lettering" do not disable the intrusion gate. Whole-word
 * only — "no texture" stays. The trailing (or|and|nor|…) chain is required
 * so a second disjunct cannot survive the first replace and rematch a needle.
 */
const LETTERING_TERM =
  'lettering|letters|text|script|calligraphy|typography|font|banner|scroll|ribbon|quote|inscription|inscribed|written|writing|words?|cursive';

const LETTERING_NEGATED = new RegExp(
  `\\b(?:no|without|sans|avoid|excluding)\\s+(?:any\\s+)?(?:${LETTERING_TERM})(?:(?:\\s*(?:,|/|and|or|nor)\\s*)+(?:any\\s+)?(?:${LETTERING_TERM}))*\\b`,
  'g'
);

/**
 * Style-tag embeddings are not lettering requests. structuredMode builds
 * "in a ${styleDesc} style" / "style locks to ${styleDesc}" from intake
 * tags, and the lettering ontology id (aliases: script, calligraphy,
 * typography) is a real styleTag — matching those would disable the guard
 * for figure-only designs that merely named a style.
 */
const STYLE_DESCRIPTOR =
  /\bin an?\s+[\w][\w\s,/&+-]*?\s+styles?\b|\bstyle locks to\s+[\w+-]+(?:,\s*[\w+-]+)*/g;

export function requestsLettering(prompt: string): boolean {
  // Drop negated phrases and style-descriptor shells so declining lettering
  // or naming a style cannot match a needle.
  const haystack = prompt
    .toLowerCase()
    .replace(LETTERING_NEGATED, ' ')
    .replace(STYLE_DESCRIPTOR, ' ');
  return LETTERING_REQUESTED.some((needle) => {
    // Quote-anchored needles are phrase prefixes ("reading \"…"), not words.
    if (needle.includes('"') || needle.includes("'")) {
      return haystack.includes(needle);
    }
    // Whole-word match so "texture"/"sword"/"description" do not count as
    // requesting lettering via the needles "text"/"word"/"script".
    return new RegExp(`\\b${escapeRegExp(needle)}\\b`).test(haystack);
  });
}

/**
 * Pure OCR: what legible lettering is in this artwork?
 *
 * No mention of the request, because that is what contaminated the earlier
 * versions. One job, and the one vision models are reliable at.
 */
function buildPrompt(): string {
  return [
    'List every piece of legible lettering in this tattoo design — words,',
    'letters, numbers, or characters in any script.',
    '',
    'Decorative marks are not lettering. Logos, crests and emblems without',
    'readable characters are not lettering. Illegible squiggles are not',
    'lettering. Report only characters you can actually read.',
    '',
    'Reply as JSON: {"words": [string]}',
  ].join('\n');
}

/**
 * Resolve a provider image into Vertex inlineData.
 *
 * Vertex/Gemini render paths return data URLs (sometimes JPEG); Replicate
 * returns HTTPS URLs. Bare base64 also appears. Fetch remote URLs so the
 * vision call always gets real image bytes.
 */
async function resolveImagePayload(
  image: string
): Promise<{ data: string; mimeType: string } | null> {
  if (image.startsWith('data:')) {
    const comma = image.indexOf(',');
    if (comma < 0) return null;
    const header = image.slice('data:'.length, comma);
    const data = image.slice(comma + 1);
    if (!data) return null;
    const mimeType = header.split(';')[0]?.trim() || 'image/png';
    return { data, mimeType };
  }

  if (/^https?:\/\//i.test(image)) {
    const response = await fetch(image);
    if (!response.ok) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.byteLength) return null;
    const contentType = response.headers.get('content-type')?.split(';')[0]?.trim();
    const mimeType =
      contentType && contentType.startsWith('image/') ? contentType : 'image/png';
    return { data: bytes.toString('base64'), mimeType };
  }

  // Bare base64 — providers that omit the data-URL wrapper.
  if (!image) return null;
  return { data: image, mimeType: 'image/png' };
}

/**
 * Screen one render. Never throws.
 *
 * `image` may be a data URL, bare base64, or an HTTPS URL (Replicate).
 */
export async function screenForText(
  image: string,
  requestPrompt: string
): Promise<TextVerdict> {
  const budget = await checkBudget().catch(() => ({ allowed: false }));
  if (!budget.allowed) return skipped('budget');

  try {
    const payload = await resolveImagePayload(image);
    if (!payload) return skipped('parse');

    const model = guardModel();
    const response = await fetch(buildVertexEndpoint(vertexProjectId(), model), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await getGcpAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: payload.mimeType, data: payload.data } },
              { text: buildPrompt() },
            ],
          },
        ],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      }),
    });

    if (!response.ok) {
      logger.warn({ event_type: 'generation.text_guard.provider_failed', status: response.status });
      return skipped('provider');
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return skipped('parse');

    const parsed = JSON.parse(text);
    await recordSpend(VISION_ANALYSIS_COST_CENTS);

    const words: string[] = Array.isArray(parsed.words)
      ? parsed.words.filter((w: unknown) => typeof w === 'string' && w.trim())
      : [];

    /*
     * The comparison happens here, not in the model: lettering is intruded
     * unless the request asked for writing at all. Words are reported either
     * way so a reviewer can see what was in the image.
     */
    return {
      intruded: words.length > 0 && !requestsLettering(requestPrompt),
      words,
      screened: true,
    };
  } catch (error) {
    logger.warn({
      event_type: 'generation.text_guard.failed',
      error: error instanceof Error ? error.message : String(error),
    });
    return skipped('parse');
  }
}

/** A result is clean when every image screened clean (unknown skips are not). */
export function isClean(verdicts: TextVerdict[]): boolean {
  return verdicts.every((v) => v.screened && !v.intruded);
}

export { CLEAN as CLEAN_VERDICT };

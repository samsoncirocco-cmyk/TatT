/**
 * SMS rendering + fixed channel phrasings (TAT-49).
 *
 * The conversation engine writes for a chat pane; SMS needs the same
 * consultant voice in a tighter frame: no markdown, no long turns. Long
 * replies get TIGHTENED at sentence boundaries — the closing sentence (the
 * bot's question/affordance almost always lives there) is always kept, and
 * earlier sentences are dropped from the middle out. Never a mid-sentence
 * truncation.
 *
 * The canned texts stay in the persona's register (ADR-0021: consultant,
 * never a wall — refusals are judgment calls or honest capacity, not
 * "limit reached").
 */
import {
  referenceAckText as sharedReferenceAck,
  referenceOverflowText,
  type ReferenceAnalysis,
} from '@/services/vision';

/** ~3 GSM-7 segments. Beyond this a turn stops being a text message. */
export const SMS_MAX_CHARS = 450;

/** Strip the markdown the engine may emit down to plain SMS text. */
export function stripMarkdown(text: string): string {
  return (
    text
      // [label](url) → "label url" — the URL must survive, SMS has no anchors.
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 $2')
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^\s*[-*•]\s+/gm, '- ')
      // Whitespace: newlines collapse to spaces (short SMS turns read as
      // one paragraph), runs collapse to one space.
      .replace(/\s*\n+\s*/g, ' ')
      .replace(/[ \t]{2,}/g, ' ')
      .trim()
  );
}

function sentences(text: string): string[] {
  // Split after terminal punctuation; keeps the punctuation with the sentence.
  return text.split(/(?<=[.!?…])\s+/).filter((s) => s.length > 0);
}

/**
 * Render one bot turn for SMS: strip markdown, then tighten to maxChars.
 * Tightening keeps the FIRST sentence(s) that fit alongside the LAST
 * sentence — openers carry the reaction, closers carry the question — and
 * drops the middle. Only a single over-long sentence is ever word-cut.
 */
export function renderSmsReply(text: string, maxChars: number = SMS_MAX_CHARS): string {
  const plain = stripMarkdown(text);
  if (plain.length <= maxChars) return plain;

  const parts = sentences(plain);
  const last = parts[parts.length - 1];

  if (parts.length === 1) {
    // One giant sentence — the pathological case. Cut on a word boundary.
    const cut = plain.slice(0, maxChars - 1);
    return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
  }

  const kept: string[] = [];
  let used = last.length + 1; // room for the closing sentence + a space
  for (const part of parts.slice(0, -1)) {
    if (used + part.length + 1 > maxChars) break;
    kept.push(part);
    used += part.length + 1;
  }
  if (kept.length === 0) {
    // Even sentence #1 doesn't fit next to the closer — closer alone wins.
    return last.length <= maxChars ? last : renderSmsReply(last, maxChars);
  }
  return [...kept, last].join(' ');
}

// ─── Fixed channel phrasings ────────────────────────────────────────────

/** Ack sent the moment a reveal is armed — renders take minutes. */
export const REVEAL_ACK =
  "On it. I'm sketching four takes now — give me a couple of minutes and they'll land right here.";

/** Per-phone daily reveal cap reached — a judgment call, never a wall. */
export function capReachedText(webUrl: string): string {
  return (
    "I've put a lot in front of you today — I'd rather you sit with these than pile on more. " +
    `Fresh eyes tomorrow, or keep working what you have here: ${webUrl}`
  );
}

/** Global budget exhausted — honest capacity, never silence. */
export const BUDGET_EXHAUSTED_TEXT =
  "We're at capacity today — I can't render new designs right now. Your ideas are saved; text me tomorrow and we'll pick this right up.";

/** Account-link gate after the free reveals: the invitation, in voice. */
export function linkGateText(signupUrl: string): string {
  return (
    "You've got two full sets from me — at this point you deserve a real workspace. " +
    `Grab a free account and everything we've made together comes with you: ${signupUrl}`
  );
}

/** Generation failed after the ack — own it, refund is already done. */
export const REVEAL_FAILED_TEXT =
  "That render didn't come together — my fault, not yours, and it didn't count against you. Give it another go in a few minutes.";

/** Conversation providers all down (the web flow's 503 path, in voice). */
export function unavailableText(webUrl: string): string {
  return `I'm having trouble thinking straight right now. Try me again shortly — or design on the site: ${webUrl}`;
}

/**
 * An unexpected failure on a VERIFIED inbound — the catch-all's in-voice
 * answer. The channel's rule is that a refusal is always a reply the texter
 * can read (see internal/adapter.ts); an HTTP 500 is not, because Twilio
 * sends nothing on it and the texter just watches their message go nowhere.
 */
export const INTERNAL_ERROR_TEXT =
  "Something went sideways on my end — that's mine to fix, not yours. Text me again in a minute and I'll pick this straight back up.";

/**
 * Closing text of a reveal MMS sequence — the bridge into the web session,
 * and the channel's ask for the pick.
 *
 * The pick is what the rest of the flow hangs off: it is the only way an SMS
 * session reaches phase 'complete', which is the only phase that carries a
 * Brief into a booking. So the closing turn asks for it directly rather than
 * leaving the texter with four images and no next move.
 */
export function revealClosingText(shareUrl: string): string {
  return (
    'Four takes, four directions. Text me the number of the one you would ' +
    `actually get — then I'll tighten it into something an artist can work ` +
    `from. See them big here: ${shareUrl}`
  );
}

/** The reply named no single cut — ask again without scolding. */
export function pickRetryText(cutCount: number): string {
  return `Just the number — 1 to ${cutCount} — whichever one you'd actually put on your body.`;
}

/** The pick landed; now the one clean negative signal (ADR-0012). */
export function mostNotYouQuestion(pickedNumber: number): string {
  return `Cut ${pickedNumber} it is. Now the opposite: which one is the least you? That tells me what to steer away from.`;
}

/** The most-not-you tap named the cut they already picked. */
export function pickCollisionText(cutCount: number): string {
  return (
    `That's the one you're keeping — I need a different number for the one ` +
    `that's least you. Any of the other ${Math.max(cutCount - 1, 1)}.`
  );
}

/** Caption for cut n of 4 in the sequential MMS delivery. */
export function cutCaption(index: number, total: number): string {
  return `Cut ${index + 1} of ${total}`;
}

// ─── Reference images (TAT-50) ──────────────────────────────────────────

/**
 * The acknowledgment sentence(s) for a message's analyzed reference photos
 * — SketchBot NEVER silently ingests an image; every reading is named back.
 * Voice pieces are shared with the web channel via '@/services/vision'.
 */
export function referenceAckText(
  analyses: ReferenceAnalysis[],
  ignored: number,
  unreadable = 0
): string {
  const parts: string[] = [];
  if (analyses.length === 1) {
    parts.push(sharedReferenceAck(analyses[0]));
  } else if (analyses.length > 1) {
    parts.push(
      `Got your photos — I'm seeing ${analyses.map((a) => a.summary).join('; and ')}.`
    );
  }
  if (unreadable > 0 && analyses.length > 0) {
    parts.push(
      unreadable === 1 ? "One of them I couldn't make out." : `${unreadable} of them I couldn't make out.`
    );
  }
  if (ignored > 0) parts.push(referenceOverflowText(analyses.length));
  return parts.join(' ');
}

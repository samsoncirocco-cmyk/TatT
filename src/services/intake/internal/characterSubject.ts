/**
 * Deterministic character-subject backfill.
 *
 * The LLM paths (live conversation and scripted intake) are asked to fill
 * `subject` when the user names a character, but they drop it often enough
 * to matter — a session that opened with "goku from dragon ball z charging
 * a kamehameha" rendered lettering of the meaning phrase instead, because
 * subject came back empty and the prompt fell through to the meaning
 * clause. The character database already carries exactly the costume-level
 * anchors the prompts need, so a name match backfills a subject the model
 * forgot rather than trusting it to remember.
 */

import { CHARACTER_DATABASE } from '../../../config/characterDatabase.js';

interface CharacterEntry {
  name: string;
  aliases: string[];
  description: string;
  series: string;
}

interface SeriesEntry {
  series: string;
  characters: { name: string; aliases: string[]; description: string }[];
}

/** Longest names first so "killua zoldyck" wins over "killua". */
const ENTRIES: CharacterEntry[] = Object.values(
  CHARACTER_DATABASE as Record<string, SeriesEntry>
)
  .flatMap((series) =>
    series.characters.map((character) => ({
      ...character,
      series: series.series,
    }))
  )
  .sort((a, b) => b.name.length - a.name.length);

/*
 * Character names that are also ordinary English words. Matching these on
 * their own turns "keep it simple" into a Pennywise tattoo, so they only
 * count when the text also names their series. Everything else matches on
 * the name alone.
 */
const AMBIGUOUS_NAMES = new Set([
  'it', 'ace', 'alien', 'angel', 'beam', 'cap', 'cell', 'cloud', 'envy',
  'flash', 'greed', 'guile', 'hawks', 'hide', 'iron', 'joker', 'law', 'lust',
  'maul', 'mercy', 'pain', 'panda', 'power', 'raven', 'robin', 'scar', 'todo',
  'venom', 'wrath', 'brook', 'gon', 'ken', 'mai', 'uta', 'kira', 'dio',
]);

const MIN_NAME_LENGTH = 3;

function mentions(haystack: string, needle: string): boolean {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(haystack);
}

/** A name counts when it is unambiguous, or when its series is named too. */
function nameMatches(text: string, name: string, series: string): boolean {
  if (name.length < MIN_NAME_LENGTH) return false;
  if (!mentions(text, name)) return false;
  if (!AMBIGUOUS_NAMES.has(name.toLowerCase())) return true;
  return mentions(text, series);
}

/**
 * One character the text named. Structured rather than pre-joined because
 * the two consumers need different halves of it: generation prompts want the
 * full costume anchors (`description`), while the playback sentence the user
 * reads wants only a short, human name ("Goku (Dragon Ball Z)") — dropping
 * the costume prose into that sentence makes it unreadable.
 */
export interface CharacterMatch {
  /** Canonical short name from the database, lowercase (e.g. "goku"). */
  name: string;
  /** Series the character belongs to (e.g. "Dragon Ball Z"). */
  series: string;
  /** Costume-level visual anchors the generation prompts depend on. */
  description: string;
}

/**
 * Every character the text names, or an empty array when it names none.
 * Multiple characters are preserved as a scene — the whole point of the
 * two-character briefs the IP rule exists to support.
 */
export function charactersIn(text: string): CharacterMatch[] {
  const source = (text || '').toLowerCase();
  if (!source.trim()) return [];

  const matched: CharacterMatch[] = [];
  for (const entry of ENTRIES) {
    if (matched.some((m) => m.description === entry.description)) continue;
    const names = [entry.name, ...entry.aliases];
    if (names.some((name) => nameMatches(source, name, entry.series))) {
      matched.push({ name: entry.name, series: entry.series, description: entry.description });
    }
    // Two characters is already a scene; more than that stops being a
    // tattoo brief and starts being a poster.
    if (matched.length === 2) break;
  }

  return matched;
}

/**
 * The prompt-facing subject: full costume anchors, exactly what
 * `IntakeRecord.subject` has always carried.
 */
export function subjectPhraseFor(matches: CharacterMatch[]): string | undefined {
  if (matches.length === 0) return undefined;

  if (matches.length === 1) {
    const [only] = matches;
    return `${only.description} (${only.series})`;
  }

  const [first, second] = matches;
  const seriesNote = first.series === second.series ? ` (${first.series})` : '';
  return `${first.description}; and ${second.description}${seriesNote}`;
}

function titleCase(name: string): string {
  return name.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/**
 * The playback-facing label: short enough to read aloud in the "Here's what
 * I'm hearing" sentence — "Goku (Dragon Ball Z)".
 */
export function characterLabelFor(matches: CharacterMatch[]): string | undefined {
  if (matches.length === 0) return undefined;

  if (matches.length === 1) {
    const [only] = matches;
    return `${titleCase(only.name)} (${only.series})`;
  }

  const [first, second] = matches;
  const names = `${titleCase(first.name)} and ${titleCase(second.name)}`;
  return first.series === second.series ? `${names} (${first.series})` : names;
}

/*
 * Action words that describe what a character is DOING. The database
 * anchors describe who a character IS, so a backfilled subject alone
 * rendered Goku standing still four times for a session that asked for a
 * charging Kamehameha. When the user's own words carry a moment, it rides
 * along with the anchors instead of being replaced by them.
 */
const MOMENT_PATTERN =
  /\b(?:charging|firing|launching|throwing|punching|kicking|slashing|swinging|drawing|blocking|dodging|leaping|jumping|flying|falling|running|standing|kneeling|sitting|crying|screaming|shouting|smiling|smirking|glaring|staring|mid-[a-z]+|about to [a-z]+)\b[^.,;!?]*/gi;

/** The user's own action phrasing, bounded so prose cannot flood the prompt. */
export function momentFrom(text: string): string | undefined {
  const found = (text || '').match(MOMENT_PATTERN);
  if (!found || found.length === 0) return undefined;
  const phrase = found
    .map((m) => m.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(', ')
    .trim();
  return phrase.length > 0 ? phrase.slice(0, 120) : undefined;
}

/**
 * Build a subject phrase from any characters the text names, or undefined
 * when it names none. Convenience wrapper over charactersIn + subjectPhraseFor
 * for the callers that only need the prompt-facing string. The user's own
 * action phrasing is appended when present — the anchors say who it is, the
 * moment says what it is doing.
 */
export function characterSubjectFrom(text: string): string | undefined {
  const base = subjectPhraseFor(charactersIn(text));
  if (!base) return undefined;
  const moment = momentFrom(text);
  return moment ? `${base}, ${moment}` : base;
}

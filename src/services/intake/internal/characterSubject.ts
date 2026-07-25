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
 * Build a subject phrase from any characters the text names, or undefined
 * when it names none. Multiple characters are preserved as a scene — the
 * whole point of the two-character briefs the IP rule exists to support.
 */
export function characterSubjectFrom(text: string): string | undefined {
  const source = (text || '').toLowerCase();
  if (!source.trim()) return undefined;

  const matched: CharacterEntry[] = [];
  for (const entry of ENTRIES) {
    if (matched.some((m) => m.description === entry.description)) continue;
    const names = [entry.name, ...entry.aliases];
    if (names.some((name) => nameMatches(source, name, entry.series))) matched.push(entry);
    // Two characters is already a scene; more than that stops being a
    // tattoo brief and starts being a poster.
    if (matched.length === 2) break;
  }

  if (matched.length === 0) return undefined;

  if (matched.length === 1) {
    const [only] = matched;
    return `${only.description} (${only.series})`;
  }

  const [first, second] = matched;
  const seriesNote = first.series === second.series ? ` (${first.series})` : '';
  return `${first.description}; and ${second.description}${seriesNote}`;
}

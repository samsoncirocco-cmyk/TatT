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
  // Shared across franchises (Naruto's Nine-Tails is also Kurama) — only
  // counts when the series is named too.
  'kurama',
]);

/*
 * How fans actually type series names. "hxh" is more common than
 * "Hunter x Hunter" in a chat box, and an ambiguous name gated on the series
 * being mentioned must accept the abbreviations or it silently drops
 * characters the user clearly named (a real session lost Gon to exactly
 * this: "characters from hxh").
 */
const SERIES_ALIASES: Record<string, string[]> = {
  'hunter x hunter': ['hxh', 'hunterxhunter'],
  'yu yu hakusho': ['yyh', 'yuyu hakusho', 'yuyu'],
  'my hero academia': ['mha', 'bnha', 'boku no hero'],
  'jujutsu kaisen': ['jjk'],
  'dragon ball': ['dbz', 'dragon ball z', 'dragonball'],
  'attack on titan': ['aot', 'snk', 'shingeki no kyojin'],
  'demon slayer': ['kny', 'kimetsu no yaiba'],
  'one piece': ['op'],
  'fullmetal alchemist': ['fma', 'fmab'],
  'chainsaw man': ['csm'],
};

const MIN_NAME_LENGTH = 3;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mentions(haystack: string, needle: string): boolean {
  return new RegExp(`\\b${escapeRegExp(needle)}\\b`, 'i').test(haystack);
}

/**
 * Co-mention needs more than a bare token — "gohan in a prison cell" is not
 * Cell. Promote an ambiguous name only when it is cast-listed with a matched
 * castmate (and / vs / with / …) or used possessively ("cell's").
 */
function coMentionedWith(text: string, name: string, castmateNames: string[]): boolean {
  const escaped = escapeRegExp(name);
  if (new RegExp(`\\b${escaped}'s\\b`, 'i').test(text)) return true;
  const link = '(?:and|&|or|vs\\.?|versus|with|against|fighting|facing|battling)';
  return castmateNames.some((mate) => {
    const other = escapeRegExp(mate);
    return (
      new RegExp(`\\b${other}\\b\\s*,?\\s*${link}\\s+\\b${escaped}\\b`, 'i').test(text) ||
      new RegExp(`\\b${escaped}\\b\\s*,?\\s*${link}\\s+\\b${other}\\b`, 'i').test(text)
    );
  });
}

function mentionsSeries(text: string, series: string): boolean {
  if (mentions(text, series)) return true;
  const aliases = SERIES_ALIASES[series.toLowerCase()] ?? [];
  return aliases.some((alias) => mentions(text, alias));
}

/** A name counts when it is unambiguous, or when its series is named too. */
function nameMatches(text: string, name: string, series: string): boolean {
  if (name.length < MIN_NAME_LENGTH) return false;
  if (!mentions(text, name)) return false;
  if (!AMBIGUOUS_NAMES.has(name.toLowerCase())) return true;
  return mentionsSeries(text, series);
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

/*
 * A sleeve or back piece legitimately carries a whole cast — a real session
 * asked for five Togashi characters and the old cap of two silently dropped
 * three of them from the brief AND the renders. Six bounds the prompt while
 * covering every plausible group request.
 */
const MAX_CHARACTERS = 6;

/**
 * Every character the text names (up to MAX_CHARACTERS), or an empty array
 * when it names none. Multiple characters are preserved as a scene or cast —
 * never collapsed; dropping named characters from a brief is a hard failure
 * of the IP rule (ADR-0023).
 */
export function charactersIn(text: string): CharacterMatch[] {
  const source = (text || '').toLowerCase();
  if (!source.trim()) return [];

  const matched: CharacterMatch[] = [];
  const skippedAmbiguous: CharacterMatch[] = [];
  for (const entry of ENTRIES) {
    if (matched.some((m) => m.description === entry.description)) continue;
    const names = [entry.name, ...entry.aliases];
    if (names.some((name) => nameMatches(source, name, entry.series))) {
      matched.push({ name: entry.name, series: entry.series, description: entry.description });
    } else if (names.some((name) => name.length >= MIN_NAME_LENGTH && mentions(source, name))) {
      // Name present but gated on the series being named — remember it for
      // the co-mention pass below.
      skippedAmbiguous.push({ name: entry.name, series: entry.series, description: entry.description });
    }
    if (matched.length === MAX_CHARACTERS) break;
  }

  // Co-mention pass: an ambiguous name counts when an unambiguous
  // castmate from the SAME series already matched AND the name looks
  // cast-listed with that mate (not a homonym like "prison cell").
  // "gohan and cell's beam struggle" names no series, but Gohan pins
  // Dragon Ball; dropping Cell truncates the cast.
  const matchedSeries = new Set(matched.map((m) => m.series));
  for (const candidate of skippedAmbiguous) {
    if (matched.length === MAX_CHARACTERS) break;
    if (!matchedSeries.has(candidate.series)) continue;
    if (matched.some((m) => m.description === candidate.description)) continue;
    const castmateNames = matched
      .filter((m) => m.series === candidate.series)
      .flatMap((m) => {
        const entry = ENTRIES.find((e) => e.description === m.description);
        return entry ? [entry.name, ...entry.aliases] : [m.name];
      })
      .filter((name) => name.length >= MIN_NAME_LENGTH);
    const candidateNames = (() => {
      const entry = ENTRIES.find((e) => e.description === candidate.description);
      return (entry ? [entry.name, ...entry.aliases] : [candidate.name]).filter(
        (name) => name.length >= MIN_NAME_LENGTH && mentions(source, name)
      );
    })();
    if (!candidateNames.some((name) => coMentionedWith(source, name, castmateNames))) {
      continue;
    }
    matched.push(candidate);
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

  // Every match rides along — never drop a named character (ADR-0023). The
  // anchors join as a cast list, with the series named once at the end.
  const anchors = matches.map((m) => m.description).join('; ');
  const series = [...new Set(matches.map((m) => m.series))].join(', ');
  return `${anchors} (${series})`;
}

function titleCase(name: string): string {
  return name.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function joinNames(names: string[]): string {
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * The playback-facing label: short enough to read aloud in the "Here's what
 * I'm hearing" sentence — "Goku (Dragon Ball Z)". Multiple characters group
 * by series in first-mention order ("Gon and Killua (Hunter x Hunter),
 * Hiei and Kurama (Yu Yu Hakusho)") — the playback must enumerate every
 * named character, never a truncated pair.
 */
export function characterLabelFor(matches: CharacterMatch[]): string | undefined {
  if (matches.length === 0) return undefined;

  const groups: { series: string; names: string[] }[] = [];
  for (const match of matches) {
    const group = groups.find((g) => g.series === match.series);
    if (group) group.names.push(titleCase(match.name));
    else groups.push({ series: match.series, names: [titleCase(match.name)] });
  }
  return groups
    .map((group) => `${joinNames(group.names)} (${group.series})`)
    .join(', ');
}

/*
 * Action words that describe what a character is DOING. The database
 * anchors describe who a character IS, so a backfilled subject alone
 * rendered Goku standing still four times for a session that asked for a
 * charging Kamehameha. When the user's own words carry a moment, it rides
 * along with the anchors instead of being replaced by them.
 */
const MOMENT_PATTERN =
  /\b(?:charging|firing|launching|throwing|punching|kicking|slashing|swinging|drawing|blocking|dodging|leaping|jumping|flying|falling|running|standing|kneeling|sitting|crying|screaming|shouting|smiling|smirking|glaring|staring|using|unleashing|casting|summoning|clashing|battling|fighting|facing off|mid-[a-z]+|about to [a-z]+)\b[^.,;!?]*/gi;

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

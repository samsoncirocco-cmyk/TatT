/**
 * Indexed matching for the generated MAL/Kitsu identity catalog.
 *
 * This module is deliberately data-source agnostic and side-effect free. The
 * server adapter loads the generated snapshot once; tests can build the same
 * matcher from a tiny in-memory catalog.
 */

export interface GeneratedCatalogCharacter {
  id: string;
  name: string;
  aliases?: string[];
  role: 'main';
  /** Present in schema v3; IDs remain source-qualified either way. */
  source?: string;
  sourcePath?: string;
}

export interface GeneratedCatalogAnime {
  title: string;
  aliases?: string[];
  selectionPosition: number;
  /** Present in schema v3 when a fallback supplied the cast. */
  characterSource?: string | null;
  characters: GeneratedCatalogCharacter[];
}

export interface GeneratedCharacterCatalog {
  schemaVersion: 2 | 3;
  anime: GeneratedCatalogAnime[];
}

export interface CuratedCharacterAnchor {
  name: string;
  aliases: string[];
  series: string;
  description: string;
}

export interface CatalogCharacterMatch {
  name: string;
  series: string;
  description: string;
  characterId: string;
}

interface Appearance {
  series: string;
  seriesAliases: string[];
  selectionPosition: number;
}

interface Candidate {
  id: string;
  displayName: string;
  aliases: Set<string>;
  appearances: Appearance[];
  curated?: CuratedCharacterAnchor;
}

interface TrieNode {
  children: Map<string, TrieNode>;
  candidates?: Candidate[];
  ambiguousOrdinaryWord?: boolean;
}

/*
 * These single-word names occur naturally in tattoo conversations. They are
 * still recognized when the customer also names the show, but never from the
 * bare word alone. This is intentionally conservative: missing one implicit
 * reference is preferable to quietly changing the subject of a tattoo.
 */
const ORDINARY_SINGLE_WORD_NAMES = new Set([
  'ace', 'alien', 'angel', 'beam', 'brook', 'cap', 'cell', 'cloud', 'dio',
  'envy', 'flash', 'gon', 'greed', 'guile', 'hawks', 'hide', 'iron', 'it',
  'joker', 'ken', 'kira', 'law', 'light', 'lust', 'mai', 'maul', 'mercy',
  'monster', 'nana', 'orange', 'pain', 'panda', 'power', 'raven', 'rei',
  'robin', 'scar', 'shin', 'simon', 'todo', 'uta', 'venom', 'violet',
  'wrath', 'yuki', 'zero',
]);

/*
 * Franchises this catalog can never corroborate. The snapshot is an ANIME
 * catalog, so a customer who anchors the piece to a game or a western
 * franchise gets no series signal out of it at all — which is exactly how a
 * Kingdom Hearts sleeve resolved "Sora" to the No Game No Life character,
 * the only Sora the catalog holds. Naming one of these counts as the
 * customer naming a series: an otherwise-uncorroborated catalog name is then
 * somebody else's character, and stays a literal name.
 *
 * The catalog's own titles and the curated series names already join this
 * vocabulary automatically; this list only covers what an anime snapshot
 * structurally cannot know about.
 */
const NON_CATALOG_FRANCHISES: readonly string[] = [
  'kingdom hearts', 'final fantasy', 'legend of zelda', 'super mario',
  'metal gear', 'dark souls', 'elden ring', 'genshin impact',
  'mortal kombat', 'street fighter', 'resident evil', 'devil may cry',
  'silent hill', 'god of war', 'league of legends', 'apex legends',
  'hollow knight', 'animal crossing', 'super smash', 'red dead redemption',
  'the witcher', 'mass effect', 'the last of us', 'world of warcraft',
  'star wars', 'star trek', 'harry potter', 'lord of the rings',
  'game of thrones', 'stranger things', 'the walking dead',
  'rick and morty', 'adventure time', 'steven universe', 'gravity falls',
  'the last airbender', 'teenage mutant ninja turtles', 'dc comics',
  'marvel comics', 'nightmare before christmas',
];

/*
 * A franchise phrase has to be at least two words. Single-word titles are
 * indistinguishable from ordinary tattoo prose — "Monster", "Orange" and
 * "Bleach" are all real catalog titles — and a phantom franchise signal
 * costs a correct enrichment. Missing "a Naruto sleeve" is the cheaper
 * error, and it is the same trade ORDINARY_SINGLE_WORD_NAMES already makes.
 */
const FRANCHISE_MIN_WORDS = 2;

function words(value: string): string[] {
  const unicodeWord = new RegExp('[\\p{L}\\p{M}\\p{N}]+', 'gu');
  return [
    ...value
      .normalize('NFKC')
      .toLocaleLowerCase('en-US')
      .matchAll(unicodeWord),
  ].map((match) => match[0]);
}

function phraseKey(value: string): string {
  return words(value).join(' ');
}

function containsPhrase(sourceWords: readonly string[], phrase: string): boolean {
  const target = phrase.split(' ');
  if (target.length === 0 || !target[0]) return false;
  outer: for (let index = 0; index <= sourceWords.length - target.length; index += 1) {
    for (let offset = 0; offset < target.length; offset += 1) {
      if (sourceWords[index + offset] !== target[offset]) continue outer;
    }
    return true;
  }
  return false;
}

function seriesRelated(left: string, right: string): boolean {
  const a = phraseKey(left);
  const b = phraseKey(right);
  if (!a || !b) return false;
  const aWords = a.split(' ');
  const bWords = b.split(' ');
  return containsPhrase(aWords, b) || containsPhrase(bWords, a);
}

function chooseCuratedAnchor(
  candidate: Candidate,
  curated: readonly CuratedCharacterAnchor[],
): CuratedCharacterAnchor | undefined {
  const candidateNames = candidate.aliases;
  const matches = curated.filter((anchor) => {
    const anchorNames = [anchor.name, ...anchor.aliases].map(phraseKey);
    return (
      anchorNames.some((name) => candidateNames.has(name)) &&
      candidate.appearances.some((appearance) => seriesRelated(appearance.series, anchor.series))
    );
  });
  return matches.length === 1 ? matches[0] : undefined;
}

function assertSupportedCatalog(
  catalog: GeneratedCharacterCatalog,
): asserts catalog is GeneratedCharacterCatalog {
  if (!catalog || typeof catalog !== 'object') {
    throw new Error('Character catalog was not an object');
  }
  if (catalog.schemaVersion !== 2 && catalog.schemaVersion !== 3) {
    throw new Error(`Unsupported character catalog schema: ${String(catalog.schemaVersion)}`);
  }
  if (!Array.isArray(catalog.anime)) {
    throw new Error('Character catalog had no anime array');
  }
  for (const [animeIndex, anime] of catalog.anime.entries()) {
    if (
      !anime ||
      typeof anime.title !== 'string' ||
      !anime.title.trim() ||
      !Number.isSafeInteger(anime.selectionPosition) ||
      anime.selectionPosition < 1 ||
      !Array.isArray(anime.characters)
    ) {
      throw new Error(`Character catalog anime ${animeIndex} was malformed`);
    }
    if (
      anime.aliases !== undefined &&
      (!Array.isArray(anime.aliases) ||
        anime.aliases.some((alias) => typeof alias !== 'string'))
    ) {
      throw new Error(`Character catalog anime ${animeIndex} had invalid aliases`);
    }
    for (const [characterIndex, character] of anime.characters.entries()) {
      if (
        !character ||
        typeof character.id !== 'string' ||
        !character.id.trim() ||
        typeof character.name !== 'string' ||
        !character.name.trim() ||
        character.role !== 'main' ||
        (character.aliases !== undefined &&
          (!Array.isArray(character.aliases) ||
            character.aliases.some((alias) => typeof alias !== 'string')))
      ) {
        throw new Error(
          `Character catalog anime ${animeIndex} character ${characterIndex} was malformed`,
        );
      }
    }
  }
}

function buildCandidates(
  catalog: GeneratedCharacterCatalog,
  curated: readonly CuratedCharacterAnchor[],
): Candidate[] {
  assertSupportedCatalog(catalog);

  const byId = new Map<string, Candidate>();
  for (const anime of catalog.anime) {
    const seriesAliases = [anime.title, ...(anime.aliases ?? [])]
      .map(phraseKey)
      .filter(Boolean);
    for (const character of anime.characters) {
      const aliases = [character.name, ...(character.aliases ?? [])]
        .map(phraseKey)
        .filter((name) => name.length >= 2);
      if (aliases.length === 0) continue;
      const existing = byId.get(character.id);
      if (existing) {
        aliases.forEach((alias) => existing.aliases.add(alias));
        if (!existing.appearances.some((appearance) => appearance.series === anime.title)) {
          existing.appearances.push({
            series: anime.title,
            seriesAliases,
            selectionPosition: anime.selectionPosition,
          });
        }
      } else {
        byId.set(character.id, {
          id: character.id,
          displayName: character.name.trim(),
          aliases: new Set(aliases),
          appearances: [{
            series: anime.title,
            seriesAliases,
            selectionPosition: anime.selectionPosition,
          }],
        });
      }
    }
  }

  const candidates = [...byId.values()];
  for (const candidate of candidates) {
    candidate.appearances.sort((a, b) => a.selectionPosition - b.selectionPosition);
    candidate.curated = chooseCuratedAnchor(candidate, curated);
  }
  return candidates;
}

/**
 * Every phrase that, said in a tattoo brief, names a body of work: the
 * catalog's own titles and aliases, the curated series, and the franchises
 * an anime catalog cannot represent.
 */
function buildFranchiseVocabulary(
  catalog: GeneratedCharacterCatalog,
  curated: readonly CuratedCharacterAnchor[],
): string[] {
  const phrases = new Set<string>();
  const add = (value: string) => {
    const key = phraseKey(value);
    if (key.split(' ').length >= FRANCHISE_MIN_WORDS) phrases.add(key);
  };
  for (const anime of catalog.anime) {
    add(anime.title);
    for (const alias of anime.aliases ?? []) add(alias);
  }
  for (const anchor of curated) add(anchor.series);
  for (const franchise of NON_CATALOG_FRANCHISES) add(franchise);
  return [...phrases];
}

function seriesMentioned(sourceWords: readonly string[], candidate: Candidate): Appearance | undefined {
  return candidate.appearances.find((appearance) =>
    appearance.seriesAliases.some((alias) => containsPhrase(sourceWords, alias))
  );
}

function addToTrie(root: TrieNode, alias: string, candidate: Candidate): void {
  const aliasWords = alias.split(' ');
  let node = root;
  for (const word of aliasWords) {
    const next = node.children.get(word) ?? { children: new Map<string, TrieNode>() };
    node.children.set(word, next);
    node = next;
  }
  node.candidates ??= [];
  if (!node.candidates.some((existing) => existing.id === candidate.id)) {
    node.candidates.push(candidate);
  }
  node.ambiguousOrdinaryWord =
    aliasWords.length === 1 && ORDINARY_SINGLE_WORD_NAMES.has(aliasWords[0]);
}

/**
 * Build the index once, then match each chat turn in O(words × longest name).
 * Colliding aliases are ignored unless a named series identifies exactly one
 * character. The interface intentionally exposes just one matching method.
 */
export function createCharacterCatalogMatcher(
  catalog: GeneratedCharacterCatalog,
  curated: readonly CuratedCharacterAnchor[] = [],
): (text: string, limit?: number) => CatalogCharacterMatch[] {
  const candidates = buildCandidates(catalog, curated);
  const root: TrieNode = { children: new Map() };
  for (const candidate of candidates) {
    for (const alias of candidate.aliases) addToTrie(root, alias, candidate);
  }
  const franchiseVocabulary = buildFranchiseVocabulary(catalog, curated);

  return (text: string, limit = 12): CatalogCharacterMatch[] => {
    const sourceWords = words(text || '');
    if (sourceWords.length === 0 || limit < 1) return [];

    // Which bodies of work this brief names. Cheap first-word prefilter so a
    // thousand catalog titles do not each scan the sentence.
    const present = new Set(sourceWords);
    const namedFranchises = franchiseVocabulary.filter(
      (phrase) =>
        present.has(phrase.slice(0, phrase.indexOf(' '))) &&
        containsPhrase(sourceWords, phrase),
    );
    /**
     * The customer named a franchise, and it is not this character's. Their
     * series never came up, so accepting them would change the subject of
     * the tattoo to somebody who merely shares a given name.
     */
    const franchiseDisagrees = (candidate: Candidate): boolean =>
      namedFranchises.length > 0 &&
      !namedFranchises.some((franchise) =>
        candidate.appearances.some((appearance) =>
          seriesRelated(appearance.series, franchise),
        ),
      );

    const matches = new Map<string, { candidate: Candidate; appearance: Appearance }>();
    for (let start = 0; start < sourceWords.length; start += 1) {
      let node = root;
      for (let cursor = start; cursor < sourceWords.length; cursor += 1) {
        const next = node.children.get(sourceWords[cursor]);
        if (!next) break;
        node = next;
        if (!node.candidates) continue;

        const qualified = node.candidates
          .map((candidate) => ({ candidate, appearance: seriesMentioned(sourceWords, candidate) }))
          .filter((entry) => entry.appearance !== undefined) as {
            candidate: Candidate;
            appearance: Appearance;
          }[];
        let selected: { candidate: Candidate; appearance: Appearance } | undefined;
        if (node.candidates.length === 1 && !node.ambiguousOrdinaryWord) {
          const candidate = node.candidates[0];
          // A name unique in the catalog is still only a guess when the
          // brief never mentions the character's series. Require franchise
          // agreement before spending that guess: silence still enriches,
          // a named and disagreeing franchise does not.
          const appearance = seriesMentioned(sourceWords, candidate);
          if (appearance || !franchiseDisagrees(candidate)) {
            selected = { candidate, appearance: appearance ?? candidate.appearances[0] };
          }
        } else if (qualified.length === 1) {
          selected = qualified[0];
        }
        if (selected && !matches.has(selected.candidate.id)) {
          matches.set(selected.candidate.id, selected);
        }
      }
    }

    return [...matches.values()].slice(0, limit).map(({ candidate, appearance }) => {
      const anchor = candidate.curated;
      return {
        characterId: candidate.id,
        name: phraseKey(anchor?.name ?? candidate.displayName),
        series: anchor?.series ?? appearance.series,
        description:
          anchor?.description ??
          `${candidate.displayName}, a main character from ${appearance.series}`,
      };
    });
  };
}

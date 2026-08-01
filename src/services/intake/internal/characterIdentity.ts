import {
  referenceSeriesIn,
  referenceSeriesMentioned,
} from '@/config/referenceSeriesAliases';
import type { CharacterIdentity } from '../types';

function normalize(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsPhrase(source: string, phrase: string): boolean {
  return ` ${source} `.includes(` ${phrase} `);
}

function spokenNameAppears(source: string, name: string): boolean {
  const normalizedName = normalize(name);
  if (containsPhrase(source, normalizedName)) return true;
  const comma = name.match(/^\s*([^,]+),\s*(.+)\s*$/);
  return Boolean(
    comma && containsPhrase(source, normalize(`${comma[2]} ${comma[1]}`))
  );
}

function sameCharacterName(left: string, right: string): boolean {
  const a = normalize(left);
  const b = normalize(right);
  if (a === b) return true;
  const aParts = a.split(' ');
  const bParts = b.split(' ');
  return (
    (aParts.length === 1 && bParts.includes(a)) ||
    (bParts.length === 1 && aParts.includes(b))
  );
}

/** Accept provider identity claims only when the customer grounded both halves. */
export function groundedCharacterIdentities(
  value: unknown,
  sourceText: string
): CharacterIdentity[] {
  if (!Array.isArray(value)) return [];
  const normalizedSource = normalize(sourceText);
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const nameValue = (candidate as { name?: unknown }).name;
    const seriesValue = (candidate as { series?: unknown }).series;
    const name = typeof nameValue === 'string' ? nameValue.trim() : '';
    const series = typeof seriesValue === 'string' ? seriesValue.trim() : '';
    if (!name || !series) return [];
    if (!spokenNameAppears(normalizedSource, name)) return [];
    if (!referenceSeriesMentioned(sourceText, series)) return [];
    return [{ name, series }];
  });
}

/**
 * A single explicitly named source can legitimately re-contextualize a
 * character who also appears elsewhere (for example Cloud in Kingdom
 * Hearts), so a grounded provider pair wins there. In a crossover, catalog
 * evidence corrects any provider-swapped source while preserving cast order.
 */
export function mergeCharacterIdentities(
  provider: readonly CharacterIdentity[],
  detected: readonly CharacterIdentity[],
  sourceText = ''
): CharacterIdentity[] {
  const explicitlyNamedSeries = new Set([
    ...referenceSeriesIn(sourceText).map(normalize),
    ...provider.map((identity) => normalize(identity.series)),
    ...detected
      .filter((identity) => referenceSeriesMentioned(sourceText, identity.series))
      .map((identity) => normalize(identity.series)),
  ]);
  const isCrossover = explicitlyNamedSeries.size > 1;
  const providerWithCorroboratedSources = provider.flatMap((identity) => {
    if (!isCrossover) return [identity];
    const corroborated = detected.find((candidate) =>
      sameCharacterName(candidate.name, identity.name)
    );
    return corroborated ? [corroborated] : [];
  });
  return [
    ...providerWithCorroboratedSources,
    ...detected.filter((identity) =>
      !providerWithCorroboratedSources.some((candidate) =>
        sameCharacterName(candidate.name, identity.name)
      )
    ),
  ].filter((identity, index, all) =>
    all.findIndex((candidate) =>
      sameCharacterName(candidate.name, identity.name) &&
      normalize(candidate.series) === normalize(identity.series)
    ) === index
  );
}

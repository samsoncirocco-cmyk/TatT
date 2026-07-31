/**
 * Server-only adapter for the generated character snapshot.
 *
 * `node:fs` is intentional: importing this module from a Client Component
 * fails the build instead of shipping the catalog to the browser. The file is
 * read and indexed once when the server module is initialized.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CHARACTER_DATABASE } from '@/config/characterDatabase.js';
import {
  createCharacterCatalogMatcher,
  type CuratedCharacterAnchor,
  type GeneratedCharacterCatalog,
} from './catalogMatcher';

interface CuratedSeries {
  series: string;
  characters: {
    name: string;
    aliases: string[];
    description: string;
  }[];
}

function curatedAnchors(): CuratedCharacterAnchor[] {
  return Object.values(CHARACTER_DATABASE as Record<string, CuratedSeries>).flatMap((series) =>
    series.characters.map((character) => ({
      name: character.name,
      aliases: character.aliases,
      series: series.series,
      description: character.description,
    }))
  );
}

function loadGeneratedCatalog(): GeneratedCharacterCatalog {
  try {
    const source = readFileSync(
      join(process.cwd(), 'src/data/generated/mal-character-catalog.json'),
      'utf8',
    );
    return JSON.parse(source) as GeneratedCharacterCatalog;
  } catch (error) {
    // Development checkouts can legitimately predate the generated snapshot.
    // The curated detector remains fully functional until acquisition runs.
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return { schemaVersion: 3, anime: [] };
    }
    throw error;
  }
}

export const charactersInGeneratedCatalog = createCharacterCatalogMatcher(
  loadGeneratedCatalog(),
  curatedAnchors(),
);

/**
 * Script to extend artists.json schema with new fields
 * Adds embedding_id, mentor_id, apprentices, and influenced_by to all artists
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const artistsFilePath = join(__dirname, '../src/data/artists.json');

try {
  const fileContent = readFileSync(artistsFilePath, 'utf-8');
  const data = JSON.parse(fileContent);

  // Add new fields to each artist if they don't exist
  data.artists = data.artists.map(artist => ({
    ...artist,
    embedding_id: artist.embedding_id ?? null,
    mentor_id: artist.mentor_id ?? null,
    apprentices: artist.apprentices ?? [],
    influenced_by: artist.influenced_by ?? []
  }));

  // Write back to file with pretty formatting
  writeFileSync(artistsFilePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log(`✅ Extended schema for ${data.artists.length} artists`);
  console.log('   Added fields: embedding_id, mentor_id, apprentices, influenced_by');
} catch (error) {
  console.error('❌ Error extending artists schema:', error.message);
  process.exit(1);
}


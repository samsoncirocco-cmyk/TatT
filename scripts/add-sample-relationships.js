/**
 * Script to add sample mentor/influence relationships to artists.json
 * Creates 10-15 mentor/apprentice relationships and 20-30 influence relationships
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const artistsFilePath = join(__dirname, '../src/data/artists.json');

// Influence types constants
const INFLUENCE_TYPES = {
  STYLE: 'style_influence',
  TECHNIQUE: 'technique_influence',
  PHILOSOPHY: 'philosophy_influence',
  COMPOSITION: 'composition_influence'
};

// Sample mentor/apprentice relationships
// Format: { apprentice_id, mentor_id }
const mentorRelationships = [
  { apprentice_id: 4, mentor_id: 3 },    // Sarah Martin apprenticed under Sophia Phillips
  { apprentice_id: 10, mentor_id: 2 },   // Example mentor relationships
  { apprentice_id: 15, mentor_id: 1 },   // Young artists learning from experienced ones
  { apprentice_id: 20, mentor_id: 5 },
  { apprentice_id: 25, mentor_id: 8 },
  { apprentice_id: 30, mentor_id: 12 },
  { apprentice_id: 35, mentor_id: 18 },
  { apprentice_id: 40, mentor_id: 22 },
  { apprentice_id: 45, mentor_id: 28 },
  { apprentice_id: 50, mentor_id: 33 },
  { apprentice_id: 55, mentor_id: 38 },
  { apprentice_id: 60, mentor_id: 42 },
  { apprentice_id: 65, mentor_id: 48 },
  { apprentice_id: 70, mentor_id: 52 },
  { apprentice_id: 75, mentor_id: 58 }
];

// Sample influence relationships
// Format: { artist_id, influenced_by: [{ artist_id, influence_type, strength }] }
const influenceRelationships = [
  { artist_id: 6, influences: [{ artist_id: 2, type: INFLUENCE_TYPES.TECHNIQUE, strength: 0.8 }] },
  { artist_id: 7, influences: [{ artist_id: 1, type: INFLUENCE_TYPES.STYLE, strength: 0.7 }] },
  { artist_id: 8, influences: [{ artist_id: 3, type: INFLUENCE_TYPES.PHILOSOPHY, strength: 0.9 }] },
  { artist_id: 9, influences: [{ artist_id: 2, type: INFLUENCE_TYPES.COMPOSITION, strength: 0.6 }] },
  { artist_id: 11, influences: [
    { artist_id: 5, type: INFLUENCE_TYPES.STYLE, strength: 0.75 },
    { artist_id: 1, type: INFLUENCE_TYPES.TECHNIQUE, strength: 0.65 }
  ]},
  { artist_id: 12, influences: [{ artist_id: 4, type: INFLUENCE_TYPES.PHILOSOPHY, strength: 0.85 }] },
  { artist_id: 13, influences: [{ artist_id: 3, type: INFLUENCE_TYPES.COMPOSITION, strength: 0.7 }] },
  { artist_id: 14, influences: [{ artist_id: 2, type: INFLUENCE_TYPES.STYLE, strength: 0.8 }] },
  { artist_id: 16, influences: [
    { artist_id: 6, type: INFLUENCE_TYPES.TECHNIQUE, strength: 0.6 },
    { artist_id: 1, type: INFLUENCE_TYPES.STYLE, strength: 0.7 }
  ]},
  { artist_id: 17, influences: [{ artist_id: 5, type: INFLUENCE_TYPES.PHILOSOPHY, strength: 0.75 }] },
  { artist_id: 18, influences: [{ artist_id: 8, type: INFLUENCE_TYPES.COMPOSITION, strength: 0.65 }] },
  { artist_id: 19, influences: [{ artist_id: 3, type: INFLUENCE_TYPES.STYLE, strength: 0.9 }] },
  { artist_id: 21, influences: [
    { artist_id: 7, type: INFLUENCE_TYPES.TECHNIQUE, strength: 0.7 },
    { artist_id: 2, type: INFLUENCE_TYPES.PHILOSOPHY, strength: 0.6 }
  ]},
  { artist_id: 23, influences: [{ artist_id: 10, type: INFLUENCE_TYPES.COMPOSITION, strength: 0.8 }] },
  { artist_id: 24, influences: [{ artist_id: 4, type: INFLUENCE_TYPES.STYLE, strength: 0.75 }] },
  { artist_id: 26, influences: [{ artist_id: 12, type: INFLUENCE_TYPES.TECHNIQUE, strength: 0.7 }] },
  { artist_id: 27, influences: [{ artist_id: 6, type: INFLUENCE_TYPES.PHILOSOPHY, strength: 0.85 }] },
  { artist_id: 29, influences: [
    { artist_id: 15, type: INFLUENCE_TYPES.COMPOSITION, strength: 0.65 },
    { artist_id: 1, type: INFLUENCE_TYPES.STYLE, strength: 0.8 }
  ]},
  { artist_id: 31, influences: [{ artist_id: 9, type: INFLUENCE_TYPES.TECHNIQUE, strength: 0.75 }] },
  { artist_id: 32, influences: [{ artist_id: 11, type: INFLUENCE_TYPES.PHILOSOPHY, strength: 0.7 }] },
  { artist_id: 34, influences: [{ artist_id: 13, type: INFLUENCE_TYPES.COMPOSITION, strength: 0.8 }] },
  { artist_id: 36, influences: [
    { artist_id: 14, type: INFLUENCE_TYPES.STYLE, strength: 0.7 },
    { artist_id: 5, type: INFLUENCE_TYPES.TECHNIQUE, strength: 0.65 }
  ]},
  { artist_id: 37, influences: [{ artist_id: 16, type: INFLUENCE_TYPES.PHILOSOPHY, strength: 0.75 }] },
  { artist_id: 39, influences: [{ artist_id: 17, type: INFLUENCE_TYPES.COMPOSITION, strength: 0.8 }] },
  { artist_id: 41, influences: [{ artist_id: 18, type: INFLUENCE_TYPES.STYLE, strength: 0.7 }] },
  { artist_id: 43, influences: [
    { artist_id: 19, type: INFLUENCE_TYPES.TECHNIQUE, strength: 0.75 },
    { artist_id: 3, type: INFLUENCE_TYPES.PHILOSOPHY, strength: 0.6 }
  ]},
  { artist_id: 44, influences: [{ artist_id: 20, type: INFLUENCE_TYPES.COMPOSITION, strength: 0.85 }] },
  { artist_id: 46, influences: [{ artist_id: 21, type: INFLUENCE_TYPES.STYLE, strength: 0.7 }] },
  { artist_id: 47, influences: [{ artist_id: 22, type: INFLUENCE_TYPES.TECHNIQUE, strength: 0.8 }] }
];

function estimateYears(artist, mentor) {
  // Estimate apprenticeship start_year and end_year based on yearsExperience
  // Assume apprenticeship started when apprentice had 0-2 years, lasted 2-4 years
  const currentYear = new Date().getFullYear();
  const apprenticeStartYear = currentYear - artist.yearsExperience;
  const apprenticeshipDuration = Math.min(artist.yearsExperience, 4); // Cap at 4 years
  const startYear = apprenticeStartYear;
  const endYear = startYear + apprenticeshipDuration;
  
  return { startYear, endYear };
}

try {
  const fileContent = readFileSync(artistsFilePath, 'utf-8');
  const data = JSON.parse(fileContent);

  // Create a map of artists by ID for quick lookup
  const artistMap = new Map(data.artists.map(a => [a.id, a]));

  // Apply mentor relationships
  mentorRelationships.forEach(({ apprentice_id, mentor_id }) => {
    const apprentice = artistMap.get(apprentice_id);
    const mentor = artistMap.get(mentor_id);
    
    if (apprentice && mentor) {
      apprentice.mentor_id = mentor_id;
      
      // Add apprentice to mentor's apprentices list if not already there
      if (!mentor.apprentices.includes(apprentice_id)) {
        mentor.apprentices = mentor.apprentices || [];
        mentor.apprentices.push(apprentice_id);
      }
    }
  });

  // Apply influence relationships
  influenceRelationships.forEach(({ artist_id, influences }) => {
    const artist = artistMap.get(artist_id);
    if (artist) {
      artist.influenced_by = influences.map(inf => ({
        artist_id: inf.artist_id,
        influence_type: inf.type,
        strength: inf.strength
      }));
    }
  });

  // Write back to file
  writeFileSync(artistsFilePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  
  console.log(`✅ Added sample relationships to artists.json`);
  console.log(`   Mentor/apprentice relationships: ${mentorRelationships.length}`);
  console.log(`   Influence relationships: ${influenceRelationships.length}`);
  console.log(`   Influence types used: ${Object.values(INFLUENCE_TYPES).join(', ')}`);
} catch (error) {
  console.error('❌ Error adding sample relationships:', error.message);
  console.error(error);
  process.exit(1);
}


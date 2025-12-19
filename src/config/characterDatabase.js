/**
 * Character Enhancement Database
 *
 * Centralized database of detailed character descriptions for AI tattoo generation.
 * Organized by series for easy expansion and maintenance.
 *
 * Structure:
 * - series: Anime/manga/game series name
 * - characters: Array of character objects
 *   - name: Primary character name (lowercase for matching)
 *   - aliases: Alternative names/spellings (optional)
 *   - description: Detailed visual description for AI generation
 *   - popularity: rough estimate for future prioritization (1-10)
 *
 * Usage:
 * - Import this database in councilService.js
 * - Easily add new series/characters without touching service logic
 * - Future: Convert to JSON file or database table for dynamic updates
 */

const CHARACTER_DATABASE = {
  'hunter-x-hunter': {
    series: 'Hunter x Hunter',
    characters: [
      {
        name: 'gon',
        aliases: ['gon freecss'],
        description: 'Gon Freecss in his iconic green jacket with spiky black and green hair, determined expression, fists clenched in combat stance',
        popularity: 9
      },
      {
        name: 'killua',
        aliases: ['killua zoldyck'],
        description: 'Killua Zoldyck with lightning crackling around his hands, silver spiky hair, sharp blue eyes, assassin pose with clawed fingers',
        popularity: 9
      },
      {
        name: 'hisoka',
        aliases: [],
        description: 'Hisoka with his signature playing card suit face paint, slicked back red hair with star and teardrop markings, sinister grin, cards floating around him',
        popularity: 8
      },
      {
        name: 'kurapika',
        aliases: [],
        description: 'Kurapika with blonde hair, scarlet eyes glowing with intensity, chains wrapped around hands',
        popularity: 7
      },
      {
        name: 'leorio',
        aliases: [],
        description: 'Leorio in his signature dark suit and sunglasses, briefcase in hand, confident expression',
        popularity: 6
      }
    ]
  },

  'dragon-ball': {
    series: 'Dragon Ball',
    characters: [
      {
        name: 'goku',
        aliases: ['son goku', 'kakarot'],
        description: 'Goku with spiky black hair, orange gi with blue undershirt, confident fighting stance',
        popularity: 10
      },
      {
        name: 'vegeta',
        aliases: [],
        description: 'Vegeta with characteristic widow\'s peak hairstyle, Saiyan armor, arms crossed in proud stance',
        popularity: 9
      },
      {
        name: 'shenron',
        aliases: ['eternal dragon'],
        description: 'Shenron the eternal dragon with flowing serpentine body, antler-like horns, glowing red eyes, emerald scales with golden highlights',
        popularity: 8
      },
      {
        name: 'gohan',
        aliases: ['son gohan'],
        description: 'Gohan with black spiky hair, gi similar to Goku, focused determined expression',
        popularity: 7
      },
      {
        name: 'trunks',
        aliases: [],
        description: 'Trunks with purple hair, sword strapped to back, Capsule Corp jacket',
        popularity: 7
      }
    ]
  },

  'naruto': {
    series: 'Naruto',
    characters: [
      {
        name: 'naruto',
        aliases: ['naruto uzumaki'],
        description: 'Naruto Uzumaki with spiky blonde hair, orange jumpsuit, whisker marks on cheeks, rasengan glowing in hand',
        popularity: 10
      },
      {
        name: 'sasuke',
        aliases: ['sasuke uchiha'],
        description: 'Sasuke Uchiha with dark spiky hair, Sharingan eyes glowing red, lightning blade jutsu',
        popularity: 9
      },
      {
        name: 'kakashi',
        aliases: ['kakashi hatake'],
        description: 'Kakashi Hatake with silver spiky hair, mask covering lower face, Sharingan eye visible',
        popularity: 8
      },
      {
        name: 'itachi',
        aliases: ['itachi uchiha'],
        description: 'Itachi Uchiha with long dark hair, Akatsuki cloak with red clouds, Mangekyou Sharingan active',
        popularity: 9
      }
    ]
  },

  'one-piece': {
    series: 'One Piece',
    characters: [
      {
        name: 'luffy',
        aliases: ['monkey d luffy', 'monkey d. luffy'],
        description: 'Monkey D. Luffy with straw hat, red vest, denim shorts, stretching rubber arms in action',
        popularity: 10
      },
      {
        name: 'zoro',
        aliases: ['roronoa zoro'],
        description: 'Roronoa Zoro with green hair, three sword style stance, muscular build, scar over eye',
        popularity: 9
      },
      {
        name: 'sanji',
        aliases: [],
        description: 'Sanji with blonde hair covering one eye, black suit, leg raised in kicking stance',
        popularity: 8
      },
      {
        name: 'nami',
        aliases: [],
        description: 'Nami with orange hair, Clima-Tact staff, navigational charts in background',
        popularity: 8
      }
    ]
  },

  'solo-leveling': {
    series: 'Solo Leveling',
    characters: [
      {
        name: 'sung jinwoo',
        aliases: ['jinwoo', 'jin woo'],
        description: 'Sung Jinwoo with glowing purple eyes, dark armor materializing, shadow soldiers emerging behind him',
        popularity: 9
      },
      {
        name: 'shadow',
        aliases: ['shadow soldiers'],
        description: 'shadowy figures with glowing eyes rising from the ground',
        popularity: 7
      }
    ]
  },

  'demon-slayer': {
    series: 'Demon Slayer',
    characters: [
      {
        name: 'tanjiro',
        aliases: ['tanjiro kamado'],
        description: 'Tanjiro Kamado with checkered haori, scar on forehead, water breathing technique swirling around him',
        popularity: 9
      },
      {
        name: 'nezuko',
        aliases: ['nezuko kamado'],
        description: 'Nezuko in her demon form with bamboo muzzle, pink eyes, flames flickering around her',
        popularity: 9
      },
      {
        name: 'zenitsu',
        aliases: ['zenitsu agatsuma'],
        description: 'Zenitsu with yellow hair, lightning breathing technique crackling',
        popularity: 7
      }
    ]
  },

  'attack-on-titan': {
    series: 'Attack on Titan',
    characters: [
      {
        name: 'eren',
        aliases: ['eren yeager', 'eren jaeger'],
        description: 'Eren Yeager in Survey Corps uniform, titan transformation energy surrounding him',
        popularity: 9
      },
      {
        name: 'levi',
        aliases: ['levi ackerman'],
        description: 'Levi Ackerman in Survey Corps uniform, dual blades ready, intense focused expression',
        popularity: 10
      },
      {
        name: 'mikasa',
        aliases: ['mikasa ackerman'],
        description: 'Mikasa Ackerman with red scarf, ODM gear visible, determined protective stance',
        popularity: 8
      }
    ]
  },

  'jujutsu-kaisen': {
    series: 'Jujutsu Kaisen',
    characters: [
      {
        name: 'gojo',
        aliases: ['satoru gojo', 'gojo satoru'],
        description: 'Satoru Gojo with white hair, blindfold partially removed revealing bright blue eyes, infinity technique visualized',
        popularity: 10
      },
      {
        name: 'yuji',
        aliases: ['yuji itadori', 'itadori'],
        description: 'Yuji Itadori with pink hair, school uniform, cursed energy glowing around fists',
        popularity: 8
      },
      {
        name: 'sukuna',
        aliases: ['ryomen sukuna'],
        description: 'Ryomen Sukuna with four arms, face markings, malevolent cursed energy radiating',
        popularity: 9
      }
    ]
  }
};

/**
 * Utility functions for character database access
 */

/**
 * Flatten database into simple name-to-description map for quick lookups
 * @returns {Object} Map of character names/aliases to descriptions
 */
function buildCharacterMap() {
  const map = {};

  Object.values(CHARACTER_DATABASE).forEach(series => {
    series.characters.forEach(character => {
      // Add primary name
      map[character.name.toLowerCase()] = character.description;

      // Add all aliases
      character.aliases.forEach(alias => {
        map[alias.toLowerCase()] = character.description;
      });
    });
  });

  return map;
}

/**
 * Get all character names and aliases for regex matching
 * @returns {Array<string>} All searchable character names
 */
function getAllCharacterNames() {
  const names = [];

  Object.values(CHARACTER_DATABASE).forEach(series => {
    series.characters.forEach(character => {
      names.push(character.name);
      names.push(...character.aliases);
    });
  });

  return names;
}

/**
 * Get characters by series
 * @param {string} seriesKey - Series identifier (e.g., 'hunter-x-hunter')
 * @returns {Array<Object>} Characters from that series
 */
function getCharactersBySeries(seriesKey) {
  return CHARACTER_DATABASE[seriesKey]?.characters || [];
}

/**
 * Search for character by partial name match
 * @param {string} query - Search query
 * @returns {Array<Object>} Matching characters with series info
 */
function searchCharacters(query) {
  const lowerQuery = query.toLowerCase();
  const results = [];

  Object.entries(CHARACTER_DATABASE).forEach(([seriesKey, seriesData]) => {
    seriesData.characters.forEach(character => {
      const matchesName = character.name.includes(lowerQuery);
      const matchesAlias = character.aliases.some(alias =>
        alias.toLowerCase().includes(lowerQuery)
      );

      if (matchesName || matchesAlias) {
        results.push({
          ...character,
          series: seriesData.series,
          seriesKey
        });
      }
    });
  });

  // Sort by popularity
  return results.sort((a, b) => b.popularity - a.popularity);
}

/**
 * Get top N most popular characters across all series
 * @param {number} limit - Number of characters to return
 * @returns {Array<Object>} Top characters with series info
 */
function getTopCharacters(limit = 10) {
  const allCharacters = [];

  Object.entries(CHARACTER_DATABASE).forEach(([seriesKey, seriesData]) => {
    seriesData.characters.forEach(character => {
      allCharacters.push({
        ...character,
        series: seriesData.series,
        seriesKey
      });
    });
  });

  return allCharacters
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
}

module.exports = {
  CHARACTER_DATABASE,
  buildCharacterMap,
  getAllCharacterNames,
  getCharactersBySeries,
  searchCharacters,
  getTopCharacters
};

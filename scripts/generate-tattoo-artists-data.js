/**
 * Generate Demo Tattoo Artist Data
 * 
 * Generates 200 realistic tattoo artist entries with:
 * - Geographic diversity (US states + international)
 * - Supabase-compatible structure (UUID, timestamps, arrays)
 * - Neo4j-compatible export format
 * 
 * Required fields:
 * - id (UUID)
 * - name
 * - location_city
 * - location_region (state/province)
 * - location_country
 * - has_multiple_locations (boolean)
 * - profile_url (placeholder)
 * - is_curated (boolean)
 * - created_at (timestamp)
 * - styles (array)
 * - color_palettes (array)
 * - specializations (array)
 */

import { randomUUID } from 'crypto';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Geographic locations with realistic distribution
const LOCATIONS = [
  // US States (major cities)
  { city: 'Manhattan', region: 'New York', country: 'United States', hasMultiple: true },
  { city: 'Brooklyn', region: 'New York', country: 'United States', hasMultiple: false },
  { city: 'Los Angeles', region: 'California', country: 'United States', hasMultiple: true },
  { city: 'San Francisco', region: 'California', country: 'United States', hasMultiple: false },
  { city: 'San Diego', region: 'California', country: 'United States', hasMultiple: false },
  { city: 'Austin', region: 'Texas', country: 'United States', hasMultiple: false },
  { city: 'Houston', region: 'Texas', country: 'United States', hasMultiple: false },
  { city: 'Dallas', region: 'Texas', country: 'United States', hasMultiple: false },
  { city: 'Portland', region: 'Oregon', country: 'United States', hasMultiple: false },
  { city: 'Miami', region: 'Florida', country: 'United States', hasMultiple: false },
  { city: 'Tampa', region: 'Florida', country: 'United States', hasMultiple: false },
  { city: 'Burlington', region: 'Vermont', country: 'United States', hasMultiple: false },
  { city: 'Denver', region: 'Colorado', country: 'United States', hasMultiple: false },
  { city: 'Phoenix', region: 'Arizona', country: 'United States', hasMultiple: false },
  { city: 'Tucson', region: 'Arizona', country: 'United States', hasMultiple: false },
  { city: 'Ewing Township', region: 'New Jersey', country: 'United States', hasMultiple: false },
  { city: 'Newark', region: 'New Jersey', country: 'United States', hasMultiple: false },
  { city: 'Jersey City', region: 'New Jersey', country: 'United States', hasMultiple: false },
  // International
  { city: 'Vancouver', region: 'British Columbia', country: 'Canada', hasMultiple: false },
  { city: 'Toronto', region: 'Ontario', country: 'Canada', hasMultiple: false },
  { city: 'Montreal', region: 'Quebec', country: 'Canada', hasMultiple: false },
  { city: 'Perth', region: 'Western Australia', country: 'Australia', hasMultiple: false },
  { city: 'Sydney', region: 'New South Wales', country: 'Australia', hasMultiple: false },
  { city: 'Melbourne', region: 'Victoria', country: 'Australia', hasMultiple: false },
];

// Tattoo styles
const STYLES = [
  'Fine Line', 'Traditional', 'Realism', 'Watercolor', 'Minimalist',
  'Japanese', 'Tribal', 'Geometric', 'Blackwork', 'Neo-Traditional',
  'Portrait', 'Lettering', 'Dotwork', 'Illustrative', 'Biomechanical',
  'New School', 'Old School', 'Photo Realism', 'Abstract', 'Surrealism'
];

// Color palettes
const COLOR_PALETTES = [
  'Black & Grey', 'Full Color', 'Black Only', 'Pastel', 'Bold Colors',
  'Monochrome', 'Neon', 'Earth Tones', 'Vibrant', 'Muted'
];

// Specializations
const SPECIALIZATIONS = [
  'Portraits', 'Lettering', 'Cover-ups', 'Floral', 'Animal', 'Geometric',
  'Mandala', 'Religious', 'Memorial', 'Cultural', 'Abstract', 'Nature',
  'Horror', 'Fantasy', 'Minimalist', 'Large Scale', 'Small Delicate',
  'Medical Cover-up', 'Watercolor', 'Biomechanical'
];

// Shop names (synthetic demo data — the canonical Neo4j model routes artists
// through their shop: (City)-[:HAS_SHOP]->(Shop)-[:HAS_ARTIST]->(Artist))
const SHOP_NAMES = [
  'Black Anchor Collective', 'Ink & Iron Studio', 'Golden Needle Tattoo',
  'Electric Rose Parlor', 'Midnight Owl Tattoo', 'Sacred Art Collective',
  'Wildflower Ink', 'Steel & Bone Tattoo', 'Crimson Lotus Studio',
  'Northern Lights Tattoo', 'Old Soul Tattoo Co.', 'Raven & Rose Ink'
];

// First names (tattoo artist style)
const FIRST_NAMES = [
  'Miss Vampira', 'Blair', 'Raven', 'Luna', 'Phoenix', 'Zephyr', 'Kai',
  'Jade', 'Zane', 'Aria', 'Blaze', 'Storm', 'River', 'Sky', 'Wolf',
  'Felix', 'Tyler', 'Sophia', 'Marcus', 'Elena', 'Dante', 'Violet',
  'Axel', 'Seraphina', 'Orion', 'Willow', 'Asher', 'Ivy', 'Kane',
  'Aurora', 'Drake', 'Sage', 'Ember', 'Jaxon', 'Nova', 'Steel',
  'Amara', 'Cruz', 'Lilith', 'Ryder', 'Zara', 'Knox', 'Lyra'
];

// Last names
const LAST_NAMES = [
  'Schwartz', 'Young', 'Wilson', 'Phillips', 'Martinez', 'Chen',
  'Anderson', 'Black', 'Steele', 'Wolfe', 'Fox', 'Stone', 'Knight',
  'Rivers', 'Hart', 'Gray', 'Bright', 'Wild', 'Silver', 'Iron',
  'Thorn', 'Blade', 'Cross', 'Reed', 'Frost', 'Flame', 'Moon',
  'Star', 'Cloud', 'Storm', 'Light', 'Dark', 'Sharp', 'Bold'
];

/**
 * Generate a random artist name
 */
function generateArtistName() {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${firstName} ${lastName}`;
}

/**
 * Generate random styles (1-4 styles per artist)
 */
function generateStyles() {
  const count = Math.floor(Math.random() * 4) + 1;
  const shuffled = [...STYLES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Generate color palettes (1-3 per artist)
 */
function generateColorPalettes() {
  const count = Math.floor(Math.random() * 3) + 1;
  const shuffled = [...COLOR_PALETTES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Generate specializations (1-5 per artist)
 */
function generateSpecializations() {
  const count = Math.floor(Math.random() * 5) + 1;
  const shuffled = [...SPECIALIZATIONS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Generate a single artist record
 */
function generateArtist(index) {
  const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
  
  // Some artists have multiple locations (marked with +1)
  const hasMultipleLocations = location.hasMultiple && Math.random() > 0.7;
  
  return {
    id: randomUUID(),
    name: generateArtistName(),
    shop_name: SHOP_NAMES[Math.floor(Math.random() * SHOP_NAMES.length)],
    location_city: location.city,
    location_region: location.region,
    location_country: location.country,
    has_multiple_locations: hasMultipleLocations,
    profile_url: `https://tatt.example.com/artists/${randomUUID()}`,
    is_curated: Math.random() > 0.6, // 40% are curated
    created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    styles: generateStyles(),
    color_palettes: generateColorPalettes(),
    specializations: generateSpecializations()
  };
}

/**
 * Generate all artists
 */
function generateAllArtists(count = 200) {
  console.log(`Generating ${count} tattoo artists...`);
  const artists = [];
  
  for (let i = 0; i < count; i++) {
    artists.push(generateArtist(i));
  }
  
  return artists;
}

/**
 * Convert to Supabase insert format (batch ready)
 */
function formatForSupabase(artists) {
  return artists.map(artist => ({
    id: artist.id,
    name: artist.name,
    location_city: artist.location_city,
    location_region: artist.location_region,
    location_country: artist.location_country,
    has_multiple_locations: artist.has_multiple_locations,
    profile_url: artist.profile_url,
    is_curated: artist.is_curated,
    created_at: artist.created_at,
    styles: artist.styles,
    color_palettes: artist.color_palettes,
    specializations: artist.specializations
  }));
}

/**
 * Convert to Neo4j export format using the canonical graph model:
 *   (State)-[:HAS_CITY]->(City)-[:HAS_SHOP]->(Shop)-[:HAS_ARTIST]->(Artist)
 *   (Artist)-[:SPECIALIZES_IN]->(Style), (Shop)-[:FEATURES_STYLE]->(Style)
 *   (Artist)-[:HAS_WEBSITE]->(Website)   -- from profile_url
 *
 * Geography uses location_region as the State and the synthetic shop_name as the
 * Shop. Color palettes / specializations have no home in the canonical model, so
 * they are intentionally omitted from the graph (they remain in the Supabase
 * export). Composite node keys are represented as `|`-joined strings so the
 * Cypher generator can rebuild them.
 */
function formatForNeo4j(artists) {
  const nodes = {
    artists: artists.map(artist => ({
      id: artist.id,
      name: artist.name,
      has_multiple_locations: artist.has_multiple_locations,
      profile_url: artist.profile_url,
      is_curated: artist.is_curated,
      created_at: artist.created_at
    })),
    states: [],
    cities: [],
    shops: [],
    styles: [],
    websites: []
  };

  const relationships = {
    HAS_CITY: [],
    HAS_SHOP: [],
    HAS_ARTIST: [],
    SPECIALIZES_IN: [],
    FEATURES_STYLE: [],
    HAS_WEBSITE: []
  };

  // Extract unique nodes
  const stateSet = new Set();
  const cityMap = new Map();   // `${city}|${state}` -> {name, state}
  const shopMap = new Map();   // `${shop}|${city}|${state}` -> {name, city, state}
  const styleSet = new Set();
  const websiteSet = new Set();

  artists.forEach(artist => {
    const state = artist.location_region;
    const city = artist.location_city;
    const shop = artist.shop_name;

    stateSet.add(state);
    cityMap.set(`${city}|${state}`, { name: city, state });
    shopMap.set(`${shop}|${city}|${state}`, { name: shop, city, state });
    artist.styles.forEach(style => styleSet.add(style));
    if (artist.profile_url) websiteSet.add(artist.profile_url);
  });

  nodes.states = Array.from(stateSet).map(name => ({ name }));
  nodes.cities = Array.from(cityMap.values());
  nodes.shops = Array.from(shopMap.values());
  nodes.styles = Array.from(styleSet).map(name => ({ name }));
  nodes.websites = Array.from(websiteSet).map(url => ({ url }));

  // Geography relationships (deduplicated)
  const seenHasCity = new Set();
  const seenHasShop = new Set();
  const seenFeaturesStyle = new Set();

  artists.forEach(artist => {
    const state = artist.location_region;
    const city = artist.location_city;
    const shop = artist.shop_name;
    const cityKey = `${city}|${state}`;
    const shopKey = `${shop}|${city}|${state}`;

    if (!seenHasCity.has(cityKey)) {
      seenHasCity.add(cityKey);
      relationships.HAS_CITY.push({ state, city, cityState: state });
    }
    if (!seenHasShop.has(shopKey)) {
      seenHasShop.add(shopKey);
      relationships.HAS_SHOP.push({ city, cityState: state, shop, shopCity: city, shopState: state });
    }

    relationships.HAS_ARTIST.push({ shop, shopCity: city, shopState: state, artistId: artist.id });

    artist.styles.forEach(style => {
      relationships.SPECIALIZES_IN.push({ from: artist.id, to: style, type: 'SPECIALIZES_IN' });
      const fsKey = `${shopKey}|${style}`;
      if (!seenFeaturesStyle.has(fsKey)) {
        seenFeaturesStyle.add(fsKey);
        relationships.FEATURES_STYLE.push({ shop, shopCity: city, shopState: state, style });
      }
    });

    if (artist.profile_url) {
      relationships.HAS_WEBSITE.push({ from: artist.id, to: artist.profile_url, type: 'HAS_WEBSITE' });
    }
  });

  return { nodes, relationships };
}

/**
 * Main execution
 */
function main() {
  console.log('🎨 Tattoo Artist Data Generator\n');
  
  // Generate 200 artists
  const artists = generateAllArtists(200);
  console.log(`✅ Generated ${artists.length} artists\n`);
  
  // Format for Supabase
  const supabaseFormat = formatForSupabase(artists);
  
  // Format for Neo4j
  const neo4jFormat = formatForNeo4j(artists);
  
  // Save Supabase format
  const supabasePath = join(__dirname, '../generated/tattoo-artists-supabase.json');
  writeFileSync(supabasePath, JSON.stringify(supabaseFormat, null, 2), 'utf-8');
  console.log(`✅ Saved Supabase format to: ${supabasePath}`);
  console.log(`   Total records: ${supabaseFormat.length}`);
  
  // Save Neo4j format
  const neo4jPath = join(__dirname, '../generated/tattoo-artists-neo4j.json');
  writeFileSync(neo4jPath, JSON.stringify(neo4jFormat, null, 2), 'utf-8');
  console.log(`✅ Saved Neo4j format to: ${neo4jPath}`);
  console.log(`   Artists: ${neo4jFormat.nodes.artists.length}`);
  console.log(`   States: ${neo4jFormat.nodes.states.length}`);
  console.log(`   Cities: ${neo4jFormat.nodes.cities.length}`);
  console.log(`   Shops: ${neo4jFormat.nodes.shops.length}`);
  console.log(`   Styles: ${neo4jFormat.nodes.styles.length}`);
  console.log(`   Websites: ${neo4jFormat.nodes.websites.length}`);
  
  // Save batch for initial insert (first 50)
  const batchPath = join(__dirname, '../generated/tattoo-artists-batch-50.json');
  writeFileSync(batchPath, JSON.stringify(supabaseFormat.slice(0, 50), null, 2), 'utf-8');
  console.log(`✅ Saved batch (50 records) to: ${batchPath}\n`);
  
  // Generate statistics
  const locationCounts = {};
  artists.forEach(a => {
    const key = `${a.location_city}, ${a.location_region}`;
    locationCounts[key] = (locationCounts[key] || 0) + 1;
  });
  
  console.log('📍 Geographic Distribution:');
  Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([loc, count]) => {
      console.log(`   ${loc}: ${count} artists`);
    });
  
  console.log('\n✅ Data generation complete!');
  
  return {
    all: supabaseFormat,
    batch: supabaseFormat.slice(0, 50),
    neo4j: neo4jFormat
  };
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateAllArtists, formatForSupabase, formatForNeo4j };


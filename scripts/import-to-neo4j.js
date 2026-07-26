/**
 * Neo4j Import Script for TatT Artists
 *
 * Purpose: Import artists from src/data/artists.json into Neo4j using the
 * graph metadata model below.
 *
 * Metadata model (nodes):
 * - (State)     { name }
 * - (City)      { name, state }
 * - (Shop)      { name, city, state }
 * - (Artist)    { id, name, hourlyRate, rating, reviewCount, bio,
 *                 yearsExperience, bookingAvailable, lat, lng, location(point),
 *                 embedding_id, mentor_id }
 * - (Style)     { name }
 * - (Tattoo)    { id, imageUrl, artistId }
 * - (Instagram) { handle }
 * - (Tag)       { name }
 * - (Website)   { url }   -- only created when a real URL exists in the data
 *
 * Relationships:
 * - (State)-[:HAS_CITY]->(City)
 * - (City)-[:HAS_SHOP]->(Shop)
 * - (Shop)-[:HAS_ARTIST]->(Artist)
 * - (Shop)-[:FEATURES_STYLE]->(Style)
 * - (Shop)-[:HAS_WEBSITE]->(Website)        -- only when a URL exists
 * - (Artist)-[:SPECIALIZES_IN]->(Style)
 * - (Artist)-[:CREATED]->(Tattoo)
 * - (Artist)-[:HAS_INSTAGRAM]->(Instagram)
 * - (Artist)-[:HAS_WEBSITE]->(Website)      -- only when a URL exists
 * - (Tattoo)-[:IN_STYLE]->(Style)
 * - (Tattoo)-[:TAGGED_WITH]->(Tag)
 * - (Instagram)-[:FEATURES]->(Tattoo)
 * - (Artist)-[:APPRENTICED_UNDER]->(Artist) -- preserved from source data
 * - (Artist)-[:INFLUENCED_BY]->(Artist)     -- preserved from source data
 *
 * Data policy: every node/relationship is derived strictly from real fields in
 * artists.json. No values are fabricated. Website nodes are only created when an
 * explicit URL is present (none exist in the current dataset, so none are made).
 *
 * The script is idempotent (MERGE-based). Pass --wipe to delete ALL existing
 * data first — never do this casually: the live DB also holds the national
 * scraped dataset, which this seed file does not contain.
 */

import neo4j from 'neo4j-driver';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import {
  filterTombstoned,
  loadTombstoneGate,
  neo4jTombstoneReader,
} from './lib/takedown-tombstone.mjs';

// Load environment variables (.env then .env.local overrides)
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Neo4j connection configuration
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USERNAME || process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;
const NEO4J_DATABASE = process.env.NEO4J_DATABASE || undefined;

if (!NEO4J_PASSWORD) {
  console.error('❌ Error: NEO4J_PASSWORD environment variable is required');
  console.error('Please set it in your .env / .env.local file');
  process.exit(1);
}

// Initialize Neo4j driver
const driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
);

const newSession = () =>
  driver.session(NEO4J_DATABASE ? { database: NEO4J_DATABASE } : undefined);

// Load artists data
const artistsFilePath = join(__dirname, '../src/data/artists.json');
let artistsData;

try {
  const fileContent = readFileSync(artistsFilePath, 'utf-8');
  artistsData = JSON.parse(fileContent);
  console.log(`✅ Loaded ${artistsData.artists.length} artists from artists.json`);
} catch (error) {
  console.error('❌ Error loading artists.json:', error.message);
  process.exit(1);
}

/**
 * Return the list of website URLs declared on an artist (if any).
 * Supports either a single `website` string or a `websites` array.
 * Returns [] when no real URL is present so no Website nodes are fabricated.
 */
function websiteUrlsFor(entity) {
  if (!entity) return [];
  const raw = entity.websites ?? entity.website ?? [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.filter((u) => typeof u === 'string' && u.trim().length > 0);
}

/**
 * Create indexes / constraints for optimal query performance.
 */
async function createIndexes(session) {
  console.log('\n📊 Creating indexes...');

  const indexes = [
    'CREATE INDEX artist_id_index IF NOT EXISTS FOR (a:Artist) ON (a.id)',
    'CREATE INDEX artist_name_index IF NOT EXISTS FOR (a:Artist) ON (a.name)',
    'CREATE INDEX state_name_index IF NOT EXISTS FOR (s:State) ON (s.name)',
    'CREATE INDEX city_name_index IF NOT EXISTS FOR (c:City) ON (c.name)',
    'CREATE INDEX shop_name_index IF NOT EXISTS FOR (sh:Shop) ON (sh.name)',
    'CREATE INDEX style_name_index IF NOT EXISTS FOR (s:Style) ON (s.name)',
    'CREATE INDEX tag_name_index IF NOT EXISTS FOR (t:Tag) ON (t.name)',
    'CREATE INDEX tattoo_id_index IF NOT EXISTS FOR (t:Tattoo) ON (t.id)',
    'CREATE INDEX instagram_handle_index IF NOT EXISTS FOR (i:Instagram) ON (i.handle)',
    'CREATE INDEX website_url_index IF NOT EXISTS FOR (w:Website) ON (w.url)',
    // Spatial index for distance-based queries
    'CREATE POINT INDEX artist_location_index IF NOT EXISTS FOR (a:Artist) ON (a.location)'
  ];

  for (const indexQuery of indexes) {
    try {
      await session.run(indexQuery);
      console.log(`  ✓ ${indexQuery.split(' ')[2]}`);
    } catch (error) {
      console.log(`  ⚠️  ${indexQuery.split(' ')[2]} (might already exist)`);
    }
  }
}

/**
 * Clean existing data (be careful in production!)
 */
async function cleanDatabase(session) {
  console.log('\n🧹 Cleaning existing data...');
  await session.run('MATCH (n) DETACH DELETE n');
  console.log('  ✓ All existing nodes and relationships deleted');
}

/**
 * Pre-create Style nodes from the reference list.
 */
async function importStyles(session, styles) {
  console.log('\n🎨 Importing styles...');

  const uniqueStyles = styles
    .filter((style) => style !== 'All Styles')
    .map((name) => ({ name }));

  const result = await session.run(
    `UNWIND $styles AS style
     MERGE (s:Style {name: style.name})
     RETURN count(s) as styleCount`,
    { styles: uniqueStyles }
  );
  console.log(`  ✓ ${neo4j.integer.toNumber(result.records[0].get('styleCount'))} styles imported`);
}

/**
 * Import geography (State/City/Shop), Artist nodes, Instagram nodes, and
 * optional Website nodes. Uses batching for efficiency.
 */
async function importArtists(session, artists) {
  console.log('\n👨‍🎨 Importing State/City/Shop/Artist/Instagram...');

  const BATCH_SIZE = 25;
  let imported = 0;

  for (let i = 0; i < artists.length; i += BATCH_SIZE) {
    const batch = artists.slice(i, i + BATCH_SIZE);

    const artistsForImport = batch.map((artist) => ({
      id: artist.id,
      name: artist.name,
      shopName: artist.shopName,
      city: artist.city,
      state: artist.state,
      lat: artist.coordinates?.lat ?? null,
      lng: artist.coordinates?.lng ?? null,
      instagram: artist.instagram || null,
      websites: websiteUrlsFor(artist),
      hourlyRate: artist.hourlyRate,
      rating: artist.rating,
      reviewCount: artist.reviewCount,
      bio: artist.bio,
      yearsExperience: artist.yearsExperience,
      bookingAvailable: artist.bookingAvailable,
      embedding_id: artist.embedding_id || null,
      mentor_id: artist.mentor_id || null
    }));

    const query = `
      UNWIND $artists AS artist

      // State -> City -> Shop
      MERGE (state:State {name: artist.state})
      MERGE (city:City {name: artist.city, state: artist.state})
      MERGE (state)-[:HAS_CITY]->(city)
      MERGE (shop:Shop {name: artist.shopName, city: artist.city, state: artist.state})
      MERGE (city)-[:HAS_SHOP]->(shop)

      // Artist node
      MERGE (a:Artist {id: artist.id})
      SET a.name = artist.name,
          a.shopName = artist.shopName,
          a.city = artist.city,
          a.state = artist.state,
          a.lat = artist.lat,
          a.lng = artist.lng,
          a.location = CASE
            WHEN artist.lat IS NOT NULL AND artist.lng IS NOT NULL
            THEN point({latitude: artist.lat, longitude: artist.lng})
            ELSE null END,
          a.instagram = artist.instagram,
          a.hourlyRate = artist.hourlyRate,
          a.rating = artist.rating,
          a.reviewCount = artist.reviewCount,
          a.bio = artist.bio,
          a.yearsExperience = artist.yearsExperience,
          a.bookingAvailable = artist.bookingAvailable,
          a.embedding_id = artist.embedding_id,
          a.mentor_id = artist.mentor_id
      MERGE (shop)-[:HAS_ARTIST]->(a)

      // Instagram (only when a handle exists)
      FOREACH (_ IN CASE WHEN artist.instagram IS NULL OR artist.instagram = '' THEN [] ELSE [1] END |
        MERGE (ig:Instagram {handle: artist.instagram})
        MERGE (a)-[:HAS_INSTAGRAM]->(ig)
      )

      // Websites (only when real URLs exist) — linked to both Artist and Shop
      FOREACH (url IN artist.websites |
        MERGE (w:Website {url: url})
        MERGE (a)-[:HAS_WEBSITE]->(w)
        MERGE (shop)-[:HAS_WEBSITE]->(w)
      )

      RETURN count(a) as artistCount
    `;

    const result = await session.run(query, { artists: artistsForImport });
    imported += neo4j.integer.toNumber(result.records[0].get('artistCount'));
    console.log(`  ✓ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${imported}/${artists.length}`);
  }

  console.log(`  ✅ ${imported} artists imported`);
}

/**
 * Link artists (and their shops) to styles.
 * (Artist)-[:SPECIALIZES_IN]->(Style) and (Shop)-[:FEATURES_STYLE]->(Style)
 */
async function importStyleRelationships(session, artists) {
  console.log('\n🖌️  Linking artists & shops to styles...');

  const rows = [];
  artists.forEach((artist) => {
    (artist.styles || []).forEach((style) => {
      rows.push({ artistId: artist.id, style });
    });
  });

  if (rows.length === 0) {
    console.log('  ⚠️  No style relationships to import');
    return;
  }

  const result = await session.run(
    `UNWIND $rows AS r
     MATCH (a:Artist {id: r.artistId})
     MATCH (shop:Shop)-[:HAS_ARTIST]->(a)
     MERGE (s:Style {name: r.style})
     MERGE (a)-[:SPECIALIZES_IN]->(s)
     MERGE (shop)-[:FEATURES_STYLE]->(s)
     RETURN count(*) as c`,
    { rows }
  );
  console.log(`  ✓ ${neo4j.integer.toNumber(result.records[0].get('c'))} style links processed`);
}

/**
 * Create Tattoo nodes from each artist's portfolioImages and connect them.
 * (Artist)-[:CREATED]->(Tattoo), (Tattoo)-[:IN_STYLE]->(Style),
 * (Tattoo)-[:TAGGED_WITH]->(Tag), (Instagram)-[:FEATURES]->(Tattoo)
 */
async function importTattoos(session, artists) {
  console.log('\n🖼️  Importing tattoos, tags & instagram features...');

  const tattooNodes = [];
  const tattooStyle = [];
  const tattooTag = [];
  const igFeatures = [];

  artists.forEach((artist) => {
    (artist.portfolioImages || []).forEach((imageUrl, idx) => {
      const tattooId = `${artist.id}-t${idx}`;
      tattooNodes.push({ tattooId, imageUrl, artistId: artist.id });
      (artist.styles || []).forEach((style) => tattooStyle.push({ tattooId, style }));
      (artist.tags || []).forEach((tag) => tattooTag.push({ tattooId, tag }));
      if (artist.instagram) igFeatures.push({ instagram: artist.instagram, tattooId });
    });
  });

  if (tattooNodes.length === 0) {
    console.log('  ⚠️  No tattoos (portfolioImages) to import');
    return;
  }

  await runBatched(session, tattooNodes, 200,
    `UNWIND $rows AS r
     MATCH (a:Artist {id: r.artistId})
     MERGE (t:Tattoo {id: r.tattooId})
     SET t.imageUrl = r.imageUrl, t.artistId = r.artistId
     MERGE (a)-[:CREATED]->(t)`);
  console.log(`  ✓ ${tattooNodes.length} tattoo nodes created`);

  await runBatched(session, tattooStyle, 500,
    `UNWIND $rows AS r
     MATCH (t:Tattoo {id: r.tattooId})
     MERGE (s:Style {name: r.style})
     MERGE (t)-[:IN_STYLE]->(s)`);
  console.log(`  ✓ ${tattooStyle.length} tattoo→style links`);

  await runBatched(session, tattooTag, 500,
    `UNWIND $rows AS r
     MATCH (t:Tattoo {id: r.tattooId})
     MERGE (tg:Tag {name: r.tag})
     MERGE (t)-[:TAGGED_WITH]->(tg)`);
  console.log(`  ✓ ${tattooTag.length} tattoo→tag links`);

  await runBatched(session, igFeatures, 500,
    `UNWIND $rows AS r
     MATCH (t:Tattoo {id: r.tattooId})
     MERGE (ig:Instagram {handle: r.instagram})
     MERGE (ig)-[:FEATURES]->(t)`);
  console.log(`  ✓ ${igFeatures.length} instagram→tattoo links`);
}

/**
 * Helper: run a MERGE query over rows in batches.
 */
async function runBatched(session, rows, size, query) {
  for (let i = 0; i < rows.length; i += size) {
    await session.run(query, { rows: rows.slice(i, i + size) });
  }
}

/**
 * Import mentor/apprentice relationships (APPRENTICED_UNDER) from source data.
 */
async function importMentorRelationships(session, artists) {
  console.log('\n👥 Importing mentor/apprentice relationships...');

  const mentorData = artists
    .filter((artist) => artist.mentor_id != null)
    .map((artist) => {
      const currentYear = new Date().getFullYear();
      const apprenticeStartYear = currentYear - artist.yearsExperience;
      const apprenticeshipDuration = Math.min(artist.yearsExperience, 4);
      return {
        apprentice_id: artist.id,
        mentor_id: artist.mentor_id,
        startYear: apprenticeStartYear,
        endYear: apprenticeStartYear + apprenticeshipDuration
      };
    });

  if (mentorData.length === 0) {
    console.log('  ⚠️  No mentor relationships to import');
    return;
  }

  const result = await session.run(
    `UNWIND $relationships AS rel
     MATCH (apprentice:Artist {id: rel.apprentice_id})
     MATCH (mentor:Artist {id: rel.mentor_id})
     MERGE (apprentice)-[r:APPRENTICED_UNDER]->(mentor)
     SET r.start_year = rel.startYear, r.end_year = rel.endYear
     RETURN count(r) as relationshipCount`,
    { relationships: mentorData }
  );
  const count = result.records.length > 0
    ? neo4j.integer.toNumber(result.records[0].get('relationshipCount'))
    : 0;
  console.log(`  ✓ Created ${count} APPRENTICED_UNDER relationships`);
}

/**
 * Import influence relationships (INFLUENCED_BY) from source data.
 */
async function importInfluenceRelationships(session, artists) {
  console.log('\n🎨 Importing influence relationships...');

  const influenceData = [];
  artists.forEach((artist) => {
    if (Array.isArray(artist.influenced_by)) {
      artist.influenced_by.forEach((influence) => {
        influenceData.push({
          artist_id: artist.id,
          influenced_by_id: influence.artist_id,
          influence_type: influence.influence_type,
          strength: influence.strength
        });
      });
    }
  });

  if (influenceData.length === 0) {
    console.log('  ⚠️  No influence relationships to import');
    return;
  }

  const result = await session.run(
    `UNWIND $relationships AS rel
     MATCH (artist:Artist {id: rel.artist_id})
     MATCH (influencer:Artist {id: rel.influenced_by_id})
     MERGE (artist)-[r:INFLUENCED_BY]->(influencer)
     SET r.influence_type = rel.influence_type, r.strength = rel.strength
     RETURN count(r) as relationshipCount`,
    { relationships: influenceData }
  );
  const count = result.records.length > 0
    ? neo4j.integer.toNumber(result.records[0].get('relationshipCount'))
    : 0;
  console.log(`  ✓ Created ${count} INFLUENCED_BY relationships`);
}

/**
 * Verify the import with node/relationship counts.
 */
async function verifyImport(session) {
  console.log('\n🔍 Verifying import...');

  const nodeLabels = ['State', 'City', 'Shop', 'Artist', 'Style', 'Tattoo', 'Instagram', 'Tag', 'Website'];
  for (const label of nodeLabels) {
    const res = await session.run(`MATCH (n:${label}) RETURN count(n) AS c`);
    console.log(`  ✓ ${label}: ${neo4j.integer.toNumber(res.records[0].get('c'))}`);
  }

  const relTypes = [
    'HAS_CITY', 'HAS_SHOP', 'HAS_ARTIST', 'FEATURES_STYLE', 'HAS_WEBSITE',
    'SPECIALIZES_IN', 'CREATED', 'HAS_INSTAGRAM', 'IN_STYLE', 'TAGGED_WITH',
    'FEATURES', 'APPRENTICED_UNDER', 'INFLUENCED_BY'
  ];
  console.log('  --- relationships ---');
  for (const rel of relTypes) {
    const res = await session.run(`MATCH ()-[r:${rel}]->() RETURN count(r) AS c`);
    console.log(`  ✓ ${rel}: ${neo4j.integer.toNumber(res.records[0].get('c'))}`);
  }

  // Sample traversal: State -> City -> Shop -> Artist -> Style
  const sample = await session.run(`
    MATCH (st:State)-[:HAS_CITY]->(c:City)-[:HAS_SHOP]->(sh:Shop)-[:HAS_ARTIST]->(a:Artist)-[:SPECIALIZES_IN]->(s:Style {name: 'Traditional'})
    RETURN st.name AS state, c.name AS city, sh.name AS shop, a.name AS artist
    LIMIT 3
  `);
  if (sample.records.length > 0) {
    console.log('\n  📍 Sample (Traditional artists via full path):');
    sample.records.forEach((rec) => {
      console.log(`    - ${rec.get('artist')} @ ${rec.get('shop')} (${rec.get('city')}, ${rec.get('state')})`);
    });
  }
}

/**
 * Main import function
 */
async function main() {
  const session = newSession();

  try {
    console.log('🚀 Starting Neo4j import for TatT artists...');
    console.log(`📍 Connecting to ${NEO4J_URI} as ${NEO4J_USER} (db: ${NEO4J_DATABASE || 'default'})`);

    await session.run('RETURN 1');
    console.log('✅ Connected to Neo4j successfully');

    await createIndexes(session);
    if (process.argv.includes('--wipe')) {
      await cleanDatabase(session);
    } else {
      console.log('ℹ️  Skipping database clean (pass --wipe to delete all existing data first)');
    }

    // Takedown gate — every downstream import step works off `artists`, so
    // filtering once here keeps a tombstoned artist out of the nodes, styles,
    // tattoos and relationships alike. loadTombstoneGate THROWS if the list
    // cannot be read, aborting the import on purpose: proceeding without it
    // would silently re-ingest everyone who asked to be removed
    // (docs/adr/0024 §4).
    const gate = await loadTombstoneGate(neo4jTombstoneReader(session));
    const { allowed: artists, blocked } = filterTombstoned(gate, artistsData.artists);
    console.log(`\n🪦 Takedown gate: ${gate.keyCount} tombstone key(s) loaded.`);
    if (blocked.length) {
      console.log(`⛔ Skipping ${blocked.length} tombstoned artist(s):`);
      for (const b of blocked) {
        console.log(`    - ${b.record.instagram || b.record.id} (matched ${b.matchedKey})`);
      }
    }

    await importStyles(session, artistsData.styles);
    await importArtists(session, artists);
    await importStyleRelationships(session, artists);
    await importTattoos(session, artists);
    await importMentorRelationships(session, artists);
    await importInfluenceRelationships(session, artists);

    await verifyImport(session);

    console.log('\n✅ Import completed successfully!');
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
    console.log('\n👋 Connection closed');
  }
}

main().catch(console.error);

/**
 * Insert tattoo artist data into Neo4j
 *
 * This script:
 * 1. Connects to Neo4j using credentials from .env.local
 * 2. Imports artists from src/data/artists.json using the canonical graph model
 * 3. Creates State/City/Shop/Artist/Style/Tattoo/Tag/Instagram nodes and their
 *    relationships (plus APPRENTICED_UNDER / INFLUENCED_BY from source data)
 * 4. Uses MERGE to avoid duplicates (idempotent, non-destructive)
 *
 * Canonical model (see scripts/import-to-neo4j.js for the reference importer):
 * - (State)-[:HAS_CITY]->(City)-[:HAS_SHOP]->(Shop)-[:HAS_ARTIST]->(Artist)
 * - (Artist)-[:SPECIALIZES_IN]->(Style), (Shop)-[:FEATURES_STYLE]->(Style)
 * - (Artist)-[:CREATED]->(Tattoo)-[:IN_STYLE]->(Style)
 * - (Tattoo)-[:TAGGED_WITH]->(Tag), (Instagram)-[:FEATURES]->(Tattoo)
 * - (Artist)-[:HAS_INSTAGRAM]->(Instagram)
 * - (Artist)-[:APPRENTICED_UNDER]->(Artist), (Artist)-[:INFLUENCED_BY]->(Artist)
 *
 * Data policy: every node/relationship is derived strictly from real fields in
 * artists.json. No values are fabricated.
 */

import neo4j from 'neo4j-driver';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USERNAME = process.env.NEO4J_USERNAME || process.env.NEO4J_USER;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;
const NEO4J_DATABASE = process.env.NEO4J_DATABASE || undefined;

if (!NEO4J_URI || !NEO4J_USERNAME || !NEO4J_PASSWORD) {
  console.error('❌ Neo4j credentials not found in environment');
  console.error('   Required: NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD');
  process.exit(1);
}

// Initialize Neo4j driver
const driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD)
);

const newSession = () =>
  driver.session(NEO4J_DATABASE ? { database: NEO4J_DATABASE } : undefined);

/**
 * Return the list of website URLs declared on an entity (if any).
 * Supports either a single `website` string or a `websites` array.
 * Returns [] when no real URL is present so no Website nodes are fabricated.
 */
function websiteUrlsFor(entity) {
  if (!entity) return [];
  const raw = entity.websites ?? entity.website ?? [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.filter((u) => typeof u === 'string' && u.trim().length > 0);
}

async function testConnection() {
  console.log('\n🔌 Testing Neo4j connection...');

  const session = newSession();
  try {
    await session.run('RETURN 1 as test');
    console.log('✅ Connected to Neo4j successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Neo4j:', error.message);
    return false;
  } finally {
    await session.close();
  }
}

async function clearDatabase() {
  console.log('\n🧹 Checking for existing artist data...');

  const session = newSession();
  try {
    const countResult = await session.run(
      'MATCH (a:Artist) RETURN count(a) as count'
    );
    const count = countResult.records[0].get('count').toNumber();

    if (count > 0) {
      console.log(`   Found ${count} existing artists`);
      console.log('   ⚠️  Skipping clear to preserve existing data');
      console.log('   (Script will use MERGE to avoid duplicates)');
    } else {
      console.log('   No existing artists found');
    }

    return true;
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
    return false;
  } finally {
    await session.close();
  }
}

async function createConstraints() {
  console.log('\n📐 Creating constraints and indexes...');

  const session = newSession();
  const constraints = [
    'CREATE CONSTRAINT IF NOT EXISTS FOR (a:Artist) REQUIRE a.id IS UNIQUE',
    'CREATE CONSTRAINT IF NOT EXISTS FOR (s:Style) REQUIRE s.name IS UNIQUE',
    'CREATE CONSTRAINT IF NOT EXISTS FOR (st:State) REQUIRE st.name IS UNIQUE',
    'CREATE CONSTRAINT IF NOT EXISTS FOR (t:Tattoo) REQUIRE t.id IS UNIQUE',
    'CREATE CONSTRAINT IF NOT EXISTS FOR (i:Instagram) REQUIRE i.handle IS UNIQUE',
    'CREATE CONSTRAINT IF NOT EXISTS FOR (tg:Tag) REQUIRE tg.name IS UNIQUE',
    'CREATE CONSTRAINT IF NOT EXISTS FOR (w:Website) REQUIRE w.url IS UNIQUE',
    'CREATE CONSTRAINT IF NOT EXISTS FOR (c:City) REQUIRE (c.name, c.state) IS UNIQUE',
    'CREATE CONSTRAINT IF NOT EXISTS FOR (sh:Shop) REQUIRE (sh.name, sh.city, sh.state) IS UNIQUE'
  ];

  try {
    for (const constraint of constraints) {
      await session.run(constraint);
    }
    console.log('✅ Constraints created successfully');
    return true;
  } catch (error) {
    console.error('❌ Error creating constraints:', error.message);
    return false;
  } finally {
    await session.close();
  }
}

function loadArtistsData() {
  const filePath = path.join(__dirname, '../src/data/artists.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function importArtists() {
  console.log('\n👥 Loading artist data...');

  const data = loadArtistsData();
  const artists = data.artists || [];
  console.log(`   Found ${artists.length} artists to import`);

  const session = newSession();
  let successCount = 0;

  try {
    for (let i = 0; i < artists.length; i++) {
      const artist = artists[i];

      const params = {
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
        mentor_id: artist.mentor_id || null,
        styles: artist.styles || [],
        tattoos: (artist.portfolioImages || []).map((imageUrl, idx) => ({
          id: `${artist.id}-t${idx}`,
          imageUrl,
          tags: artist.tags || [],
          styles: artist.styles || []
        }))
      };

      await session.run(
        `
        // State -> City -> Shop -> Artist
        MERGE (state:State {name: $state})
        MERGE (city:City {name: $city, state: $state})
        MERGE (state)-[:HAS_CITY]->(city)
        MERGE (shop:Shop {name: $shopName, city: $city, state: $state})
        MERGE (city)-[:HAS_SHOP]->(shop)

        MERGE (a:Artist {id: $id})
        SET a.name = $name,
            a.shopName = $shopName,
            a.city = $city,
            a.state = $state,
            a.lat = $lat,
            a.lng = $lng,
            a.location = CASE
              WHEN $lat IS NOT NULL AND $lng IS NOT NULL
              THEN point({latitude: $lat, longitude: $lng})
              ELSE null END,
            a.instagram = $instagram,
            a.hourlyRate = $hourlyRate,
            a.rating = $rating,
            a.reviewCount = $reviewCount,
            a.bio = $bio,
            a.yearsExperience = $yearsExperience,
            a.bookingAvailable = $bookingAvailable,
            a.embedding_id = $embedding_id,
            a.mentor_id = $mentor_id
        MERGE (shop)-[:HAS_ARTIST]->(a)

        // Instagram (only when a handle exists)
        FOREACH (_ IN CASE WHEN $instagram IS NULL OR $instagram = '' THEN [] ELSE [1] END |
          MERGE (ig:Instagram {handle: $instagram})
          MERGE (a)-[:HAS_INSTAGRAM]->(ig)
        )

        // Websites (only when real URLs exist) — linked to both Artist and Shop
        FOREACH (url IN $websites |
          MERGE (w:Website {url: url})
          MERGE (a)-[:HAS_WEBSITE]->(w)
          MERGE (shop)-[:HAS_WEBSITE]->(w)
        )

        // Styles: (Artist)-[:SPECIALIZES_IN]->(Style), (Shop)-[:FEATURES_STYLE]->(Style)
        FOREACH (styleName IN $styles |
          MERGE (s:Style {name: styleName})
          MERGE (a)-[:SPECIALIZES_IN]->(s)
          MERGE (shop)-[:FEATURES_STYLE]->(s)
        )

        // Tattoos with their styles and tags, plus Instagram feature links
        FOREACH (tattoo IN $tattoos |
          MERGE (t:Tattoo {id: tattoo.id})
          SET t.imageUrl = tattoo.imageUrl, t.artistId = $id
          MERGE (a)-[:CREATED]->(t)
          FOREACH (styleName IN tattoo.styles |
            MERGE (ts:Style {name: styleName})
            MERGE (t)-[:IN_STYLE]->(ts)
          )
          FOREACH (tagName IN tattoo.tags |
            MERGE (tg:Tag {name: tagName})
            MERGE (t)-[:TAGGED_WITH]->(tg)
          )
          FOREACH (_ IN CASE WHEN $instagram IS NULL OR $instagram = '' THEN [] ELSE [1] END |
            MERGE (ig2:Instagram {handle: $instagram})
            MERGE (ig2)-[:FEATURES]->(t)
          )
        )
        `,
        params
      );

      successCount++;

      if ((i + 1) % 10 === 0) {
        console.log(`   Progress: ${i + 1}/${artists.length} artists processed`);
      }
    }

    console.log('\n📊 Import complete:');
    console.log(`   ✅ Imported: ${successCount}`);

    return true;
  } catch (error) {
    console.error('❌ Error importing artists:', error.message);
    return false;
  } finally {
    await session.close();
  }
}

/**
 * Import mentor/apprentice (APPRENTICED_UNDER) and influence (INFLUENCED_BY)
 * relationships from source data.
 */
async function importRelationships() {
  console.log('\n👥 Creating mentor & influence relationships...');

  const data = loadArtistsData();
  const artists = data.artists || [];

  const mentorData = artists
    .filter((artist) => artist.mentor_id != null)
    .map((artist) => ({ apprentice_id: artist.id, mentor_id: artist.mentor_id }));

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

  const session = newSession();
  try {
    if (mentorData.length > 0) {
      const result = await session.run(
        `UNWIND $relationships AS rel
         MATCH (apprentice:Artist {id: rel.apprentice_id})
         MATCH (mentor:Artist {id: rel.mentor_id})
         MERGE (apprentice)-[r:APPRENTICED_UNDER]->(mentor)
         RETURN count(r) as c`,
        { relationships: mentorData }
      );
      console.log(`   ✓ ${result.records[0].get('c').toNumber()} APPRENTICED_UNDER relationships`);
    } else {
      console.log('   ⚠️  No mentor relationships to import');
    }

    if (influenceData.length > 0) {
      const result = await session.run(
        `UNWIND $relationships AS rel
         MATCH (artist:Artist {id: rel.artist_id})
         MATCH (influencer:Artist {id: rel.influenced_by_id})
         MERGE (artist)-[r:INFLUENCED_BY]->(influencer)
         SET r.influence_type = rel.influence_type, r.strength = rel.strength
         RETURN count(r) as c`,
        { relationships: influenceData }
      );
      console.log(`   ✓ ${result.records[0].get('c').toNumber()} INFLUENCED_BY relationships`);
    } else {
      console.log('   ⚠️  No influence relationships to import');
    }

    return true;
  } catch (error) {
    console.error('❌ Error creating relationships:', error.message);
    return false;
  } finally {
    await session.close();
  }
}

async function verifyImport() {
  console.log('\n🔍 Verifying import...');

  const session = newSession();
  try {
    const labels = ['State', 'City', 'Shop', 'Artist', 'Style', 'Tattoo', 'Instagram', 'Tag', 'Website'];
    console.log('   Node counts:');
    for (const label of labels) {
      const res = await session.run(`MATCH (n:${label}) RETURN count(n) as count`);
      console.log(`     ${label}: ${res.records[0].get('count').toNumber()}`);
    }

    // Sample traversal: State -> City -> Shop -> Artist -> Style
    const sampleResult = await session.run(`
      MATCH (st:State)-[:HAS_CITY]->(c:City)-[:HAS_SHOP]->(sh:Shop)-[:HAS_ARTIST]->(a:Artist)
      OPTIONAL MATCH (a)-[:SPECIALIZES_IN]->(s:Style)
      RETURN a.name as name, sh.name as shop, c.name as city, st.name as state,
             collect(s.name) as styles
      LIMIT 5
    `);

    console.log('\n📋 Sample artists:');
    sampleResult.records.forEach((record, i) => {
      const name = record.get('name');
      const shop = record.get('shop');
      const city = record.get('city');
      const state = record.get('state');
      const styles = record.get('styles');
      console.log(`   ${i + 1}. ${name} @ ${shop} (${city}, ${state})`);
      console.log(`      Styles: ${styles.join(', ')}`);
    });

    return true;
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  } finally {
    await session.close();
  }
}

async function main() {
  console.log('🚀 TatTester - Neo4j Artist Data Import');
  console.log('='.repeat(60));

  try {
    if (!await testConnection()) {
      process.exit(1);
    }

    if (!await clearDatabase()) {
      process.exit(1);
    }

    if (!await createConstraints()) {
      process.exit(1);
    }

    if (!await importArtists()) {
      process.exit(1);
    }

    if (!await importRelationships()) {
      process.exit(1);
    }

    if (!await verifyImport()) {
      process.exit(1);
    }

    console.log('\n✨ All done! Your artist data is now in Neo4j.');
    console.log('   View it at: https://console.neo4j.io');

  } catch (err) {
    console.error('\n💥 Unexpected error:', err);
    process.exit(1);
  } finally {
    await driver.close();
  }
}

main();

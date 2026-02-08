/**
 * Insert tattoo artist data into Neo4j
 *
 * This script:
 * 1. Connects to Neo4j using credentials from .env.local
 * 2. Creates Artist, Style, Color, Specialization, and Location nodes
 * 3. Creates relationships between them
 * 4. Uses MERGE to avoid duplicates
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

async function testConnection() {
  console.log('\n🔌 Testing Neo4j connection...');

  const session = driver.session();
  try {
    const result = await session.run('RETURN 1 as test');
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

  const session = driver.session();
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

  const session = driver.session();
  const constraints = [
    'CREATE CONSTRAINT IF NOT EXISTS FOR (a:Artist) REQUIRE a.id IS UNIQUE',
    'CREATE CONSTRAINT IF NOT EXISTS FOR (s:Style) REQUIRE s.name IS UNIQUE',
    'CREATE CONSTRAINT IF NOT EXISTS FOR (c:Color) REQUIRE c.name IS UNIQUE',
    'CREATE CONSTRAINT IF NOT EXISTS FOR (sp:Specialization) REQUIRE sp.name IS UNIQUE',
    'CREATE CONSTRAINT IF NOT EXISTS FOR (l:Location) REQUIRE (l.city, l.region, l.country) IS UNIQUE'
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

async function importArtists() {
  console.log('\n👥 Loading artist data...');

  const artistsData = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '../generated/tattoo-artists-batch-50.json'),
      'utf8'
    )
  );

  console.log(`   Found ${artistsData.length} artists to import`);

  const session = driver.session();
  let successCount = 0;
  let skipCount = 0;

  try {
    for (let i = 0; i < artistsData.length; i++) {
      const artist = artistsData[i];

      // Check if artist already exists
      const checkResult = await session.run(
        'MATCH (a:Artist {id: $id}) RETURN a',
        { id: artist.id }
      );

      if (checkResult.records.length > 0) {
        skipCount++;
        continue;
      }

      // Create artist node
      await session.run(
        `MERGE (a:Artist {id: $id})
         SET a.name = $name,
             a.profile_url = $profile_url,
             a.is_curated = $is_curated,
             a.has_multiple_locations = $has_multiple_locations,
             a.created_at = datetime($created_at)`,
        {
          id: artist.id,
          name: artist.name,
          profile_url: artist.profile_url,
          is_curated: artist.is_curated,
          has_multiple_locations: artist.has_multiple_locations,
          created_at: artist.created_at
        }
      );

      // Create location node and relationship
      await session.run(
        `MATCH (a:Artist {id: $artistId})
         MERGE (l:Location {
           city: $city,
           region: $region,
           country: $country
         })
         MERGE (a)-[:LOCATED_IN]->(l)`,
        {
          artistId: artist.id,
          city: artist.location_city,
          region: artist.location_region,
          country: artist.location_country
        }
      );

      // Create style relationships
      for (const style of artist.styles) {
        await session.run(
          `MATCH (a:Artist {id: $artistId})
           MERGE (s:Style {name: $styleName})
           MERGE (a)-[:PRACTICES_STYLE]->(s)`,
          {
            artistId: artist.id,
            styleName: style
          }
        );
      }

      // Create color palette relationships
      for (const color of artist.color_palettes) {
        await session.run(
          `MATCH (a:Artist {id: $artistId})
           MERGE (c:Color {name: $colorName})
           MERGE (a)-[:USES_COLOR]->(c)`,
          {
            artistId: artist.id,
            colorName: color
          }
        );
      }

      // Create specialization relationships
      for (const specialization of artist.specializations) {
        await session.run(
          `MATCH (a:Artist {id: $artistId})
           MERGE (sp:Specialization {name: $specializationName})
           MERGE (a)-[:SPECIALIZES_IN]->(sp)`,
          {
            artistId: artist.id,
            specializationName: specialization
          }
        );
      }

      successCount++;

      if ((i + 1) % 10 === 0) {
        console.log(`   Progress: ${i + 1}/${artistsData.length} artists processed`);
      }
    }

    console.log(`\n📊 Import complete:`);
    console.log(`   ✅ Imported: ${successCount}`);
    if (skipCount > 0) {
      console.log(`   ⏭️  Skipped (already exist): ${skipCount}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Error importing artists:', error.message);
    return false;
  } finally {
    await session.close();
  }
}

async function verifyImport() {
  console.log('\n🔍 Verifying import...');

  const session = driver.session();
  try {
    // Count nodes
    const artistCount = await session.run('MATCH (a:Artist) RETURN count(a) as count');
    const styleCount = await session.run('MATCH (s:Style) RETURN count(s) as count');
    const colorCount = await session.run('MATCH (c:Color) RETURN count(c) as count');
    const specializationCount = await session.run('MATCH (sp:Specialization) RETURN count(sp) as count');
    const locationCount = await session.run('MATCH (l:Location) RETURN count(l) as count');

    console.log('   Node counts:');
    console.log(`     Artists: ${artistCount.records[0].get('count').toNumber()}`);
    console.log(`     Styles: ${styleCount.records[0].get('count').toNumber()}`);
    console.log(`     Colors: ${colorCount.records[0].get('count').toNumber()}`);
    console.log(`     Specializations: ${specializationCount.records[0].get('count').toNumber()}`);
    console.log(`     Locations: ${locationCount.records[0].get('count').toNumber()}`);

    // Get sample artists with relationships
    const sampleResult = await session.run(`
      MATCH (a:Artist)-[:LOCATED_IN]->(l:Location)
      OPTIONAL MATCH (a)-[:PRACTICES_STYLE]->(s:Style)
      RETURN a.name as name, l.city as city, l.country as country, collect(s.name) as styles
      LIMIT 5
    `);

    console.log('\n📋 Sample artists:');
    sampleResult.records.forEach((record, i) => {
      const name = record.get('name');
      const city = record.get('city');
      const country = record.get('country');
      const styles = record.get('styles');
      console.log(`   ${i + 1}. ${name} - ${city}, ${country}`);
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
    // Test connection
    if (!await testConnection()) {
      process.exit(1);
    }

    // Check for existing data
    if (!await clearDatabase()) {
      process.exit(1);
    }

    // Create constraints
    if (!await createConstraints()) {
      process.exit(1);
    }

    // Import artists
    if (!await importArtists()) {
      process.exit(1);
    }

    // Verify import
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

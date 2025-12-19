/**
 * Neo4j Import Script for TatTester Artists
 *
 * Purpose: Import 100 Arizona artists from src/data/artists.json into Neo4j
 *
 * Schema:
 * - (Artist) nodes with properties: id, name, shopName, city, state, location,
 *   lat, lng, instagram, hourlyRate, rating, reviewCount, bio, yearsExperience, bookingAvailable
 * - (City) nodes with properties: name, state
 * - (Style) nodes with properties: name
 * - (Tag) nodes with properties: name
 * - Relationships:
 *   - (Artist)-[:LOCATED_IN]->(City)
 *   - (Artist)-[:SPECIALIZES_IN]->(Style)
 *   - (Artist)-[:TAGGED_WITH]->(Tag)
 *
 * Optimizations:
 * - Batch operations for all 100 artists (reduces round trips)
 * - Indexed queries on Artist.id, City.name, Style.name for performance
 * - MERGE operations to prevent duplicates
 * - Proper cleanup before import
 */

import neo4j from 'neo4j-driver';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Neo4j connection configuration
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;

if (!NEO4J_PASSWORD) {
  console.error('❌ Error: NEO4J_PASSWORD environment variable is required');
  console.error('Please set it in your .env file');
  process.exit(1);
}

// Initialize Neo4j driver
const driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
);

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
 * Create database indexes for optimal query performance
 */
async function createIndexes(session) {
  console.log('\n📊 Creating indexes...');

  const indexes = [
    'CREATE INDEX artist_id_index IF NOT EXISTS FOR (a:Artist) ON (a.id)',
    'CREATE INDEX artist_name_index IF NOT EXISTS FOR (a:Artist) ON (a.name)',
    'CREATE INDEX artist_city_index IF NOT EXISTS FOR (a:Artist) ON (a.city)',
    'CREATE INDEX city_name_index IF NOT EXISTS FOR (c:City) ON (c.name)',
    'CREATE INDEX style_name_index IF NOT EXISTS FOR (s:Style) ON (s.name)',
    'CREATE INDEX tag_name_index IF NOT EXISTS FOR (t:Tag) ON (t.name)',
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
 * Clean existing data (optional - be careful in production!)
 */
async function cleanDatabase(session) {
  console.log('\n🧹 Cleaning existing data...');

  await session.run('MATCH (n) DETACH DELETE n');
  console.log('  ✓ All existing nodes and relationships deleted');
}

/**
 * Import cities as nodes
 */
async function importCities(session, cities) {
  console.log('\n🏙️  Importing cities...');

  // Filter out "All Locations" and extract unique cities
  const uniqueCities = cities
    .filter(city => city !== 'All Locations')
    .map(cityStr => {
      const [name, state] = cityStr.split(', ');
      return { name, state: state || 'AZ' };
    });

  const query = `
    UNWIND $cities AS city
    MERGE (c:City {name: city.name, state: city.state})
    RETURN count(c) as cityCount
  `;

  const result = await session.run(query, { cities: uniqueCities });
  const cityCount = neo4j.integer.toNumber(result.records[0].get('cityCount'));
  console.log(`  ✓ ${cityCount} cities imported`);
}

/**
 * Import styles as nodes
 */
async function importStyles(session, styles) {
  console.log('\n🎨 Importing styles...');

  // Filter out "All Styles"
  const uniqueStyles = styles
    .filter(style => style !== 'All Styles')
    .map(name => ({ name }));

  const query = `
    UNWIND $styles AS style
    MERGE (s:Style {name: style.name})
    RETURN count(s) as styleCount
  `;

  const result = await session.run(query, { styles: uniqueStyles });
  const styleCount = neo4j.integer.toNumber(result.records[0].get('styleCount'));
  console.log(`  ✓ ${styleCount} styles imported`);
}

/**
 * Import artists with all properties and relationships
 * Uses batch processing for efficiency
 */
async function importArtists(session, artists) {
  console.log('\n👨‍🎨 Importing artists...');

  const BATCH_SIZE = 25; // Process 25 artists at a time for optimal performance
  let imported = 0;

  for (let i = 0; i < artists.length; i += BATCH_SIZE) {
    const batch = artists.slice(i, i + BATCH_SIZE);

    // Transform artists for Neo4j
    const artistsForImport = batch.map(artist => ({
      id: artist.id,
      name: artist.name,
      shopName: artist.shopName,
      city: artist.city,
      state: artist.state,
      location: artist.location,
      lat: artist.coordinates.lat,
      lng: artist.coordinates.lng,
      instagram: artist.instagram,
      hourlyRate: artist.hourlyRate,
      rating: artist.rating,
      reviewCount: artist.reviewCount,
      bio: artist.bio,
      yearsExperience: artist.yearsExperience,
      bookingAvailable: artist.bookingAvailable,
      portfolioImages: artist.portfolioImages,
      styles: artist.styles,
      tags: artist.tags
    }));

    const query = `
      UNWIND $artists AS artist

      // Create Artist node with properties
      MERGE (a:Artist {id: artist.id})
      SET a.name = artist.name,
          a.shopName = artist.shopName,
          a.city = artist.city,
          a.state = artist.state,
          a.location = point({latitude: artist.lat, longitude: artist.lng}),
          a.lat = artist.lat,
          a.lng = artist.lng,
          a.instagram = artist.instagram,
          a.hourlyRate = artist.hourlyRate,
          a.rating = artist.rating,
          a.reviewCount = artist.reviewCount,
          a.bio = artist.bio,
          a.yearsExperience = artist.yearsExperience,
          a.bookingAvailable = artist.bookingAvailable,
          a.portfolioImages = artist.portfolioImages

      // Link to City
      WITH a, artist
      MATCH (c:City {name: artist.city, state: artist.state})
      MERGE (a)-[:LOCATED_IN]->(c)

      // Link to Styles
      WITH a, artist
      UNWIND artist.styles AS styleName
      MATCH (s:Style {name: styleName})
      MERGE (a)-[:SPECIALIZES_IN]->(s)

      // Link to Tags
      WITH a, artist
      UNWIND artist.tags AS tagName
      MERGE (t:Tag {name: tagName})
      MERGE (a)-[:TAGGED_WITH]->(t)

      RETURN count(a) as artistCount
    `;

    const result = await session.run(query, { artists: artistsForImport });
    const batchCount = neo4j.integer.toNumber(result.records[0].get('artistCount'));
    imported += batchCount;

    console.log(`  ✓ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batchCount} artists imported (Total: ${imported}/${artists.length})`);
  }

  console.log(`  ✅ All ${imported} artists imported successfully`);
}

/**
 * Verify the import by running some sample queries
 */
async function verifyImport(session) {
  console.log('\n🔍 Verifying import...');

  // Count nodes
  const counts = await session.run(`
    MATCH (a:Artist) WITH count(a) as artists
    MATCH (c:City) WITH artists, count(c) as cities
    MATCH (s:Style) WITH artists, cities, count(s) as styles
    MATCH (t:Tag) WITH artists, cities, styles, count(t) as tags
    RETURN artists, cities, styles, tags
  `);

  const record = counts.records[0];
  console.log(`  ✓ Artists: ${neo4j.integer.toNumber(record.get('artists'))}`);
  console.log(`  ✓ Cities: ${neo4j.integer.toNumber(record.get('cities'))}`);
  console.log(`  ✓ Styles: ${neo4j.integer.toNumber(record.get('styles'))}`);
  console.log(`  ✓ Tags: ${neo4j.integer.toNumber(record.get('tags'))}`);

  // Count relationships
  const relationships = await session.run(`
    MATCH ()-[r:LOCATED_IN]->() WITH count(r) as located
    MATCH ()-[r:SPECIALIZES_IN]->() WITH located, count(r) as specializes
    MATCH ()-[r:TAGGED_WITH]->() WITH located, specializes, count(r) as tagged
    RETURN located, specializes, tagged
  `);

  const relRecord = relationships.records[0];
  console.log(`  ✓ LOCATED_IN relationships: ${neo4j.integer.toNumber(relRecord.get('located'))}`);
  console.log(`  ✓ SPECIALIZES_IN relationships: ${neo4j.integer.toNumber(relRecord.get('specializes'))}`);
  console.log(`  ✓ TAGGED_WITH relationships: ${neo4j.integer.toNumber(relRecord.get('tagged'))}`);

  // Sample query: Find artists in Phoenix who specialize in Traditional
  const sampleQuery = await session.run(`
    MATCH (a:Artist)-[:LOCATED_IN]->(c:City {name: 'Phoenix'})
    MATCH (a)-[:SPECIALIZES_IN]->(s:Style {name: 'Traditional'})
    RETURN a.name, a.shopName, a.hourlyRate
    ORDER BY a.rating DESC
    LIMIT 3
  `);

  if (sampleQuery.records.length > 0) {
    console.log('\n  📍 Sample: Top Traditional artists in Phoenix:');
    sampleQuery.records.forEach(rec => {
      const hourlyRate = neo4j.integer.toNumber(rec.get('a.hourlyRate'));
      console.log(`    - ${rec.get('a.name')} at ${rec.get('a.shopName')} ($${hourlyRate}/hr)`);
    });
  }

  // Sample spatial query: Artists within 50km of Phoenix downtown
  const spatialQuery = await session.run(`
    WITH point({latitude: 33.4484, longitude: -112.074}) AS phoenixDowntown
    MATCH (a:Artist)
    WHERE point.distance(a.location, phoenixDowntown) < 50000
    RETURN a.name, a.city,
           round(point.distance(a.location, phoenixDowntown) / 1000) AS distanceKm
    ORDER BY distanceKm
    LIMIT 5
  `);

  if (spatialQuery.records.length > 0) {
    console.log('\n  📏 Sample: Artists within 50km of Phoenix downtown:');
    spatialQuery.records.forEach(rec => {
      const distanceKm = neo4j.integer.toNumber(rec.get('distanceKm'));
      console.log(`    - ${rec.get('a.name')} in ${rec.get('a.city')} (${distanceKm}km away)`);
    });
  }
}

/**
 * Main import function
 */
async function main() {
  const session = driver.session();

  try {
    console.log('🚀 Starting Neo4j import for TatTester artists...');
    console.log(`📍 Connecting to ${NEO4J_URI} as ${NEO4J_USER}`);

    // Test connection
    await session.run('RETURN 1');
    console.log('✅ Connected to Neo4j successfully');

    // Create indexes first for optimal import performance
    await createIndexes(session);

    // Clean existing data (comment this out if you want to keep existing data)
    await cleanDatabase(session);

    // Import reference data
    await importCities(session, artistsData.cities);
    await importStyles(session, artistsData.styles);

    // Import artists with relationships
    await importArtists(session, artistsData.artists);

    // Verify the import
    await verifyImport(session);

    console.log('\n✅ Import completed successfully!');
    console.log('\n📊 Quick Stats:');
    console.log(`   - Total artists: ${artistsData.artists.length}`);
    console.log(`   - Cities covered: ${artistsData.cities.length - 1}`); // Exclude "All Locations"
    console.log(`   - Tattoo styles: ${artistsData.styles.length - 1}`);  // Exclude "All Styles"

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

// Run the import
main().catch(console.error);

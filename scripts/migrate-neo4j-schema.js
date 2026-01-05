/**
 * Neo4j Schema Migration Script for TatTester
 *
 * Purpose: Extend existing Neo4j schema to support mentor/apprentice relationships,
 * influence tracking, and vector embedding references for hybrid matching.
 *
 * Migration Steps:
 * 1. Add embedding_id property to all Artist nodes (default: null)
 * 2. Add mentor_id property to all Artist nodes (default: null)
 * 3. Create indexes for embedding_id and mentor_id for performance
 * 4. Verify migration with COUNT queries
 *
 * This script is idempotent - can be run multiple times safely.
 */

import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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

/**
 * Add embedding_id and mentor_id properties to all Artist nodes
 * 
 * Note: In Neo4j, setting a property to null removes it. This function ensures
 * the properties exist on all nodes by setting them to empty string if missing,
 * which can later be updated to actual values. Existing values are preserved.
 */
async function addProperties(session) {
  console.log('\n📝 Adding new properties to Artist nodes...');

  // Set properties to empty string if they don't exist, preserving existing values
  // Empty string is used instead of null because Neo4j removes null properties
  const query = `
    MATCH (a:Artist)
    SET a.embedding_id = coalesce(a.embedding_id, ''),
        a.mentor_id = coalesce(a.mentor_id, '')
    RETURN count(a) as updatedCount
  `;

  try {
    const result = await session.run(query);
    const count = neo4j.integer.toNumber(result.records[0].get('updatedCount'));
    console.log(`  ✓ Updated ${count} Artist nodes with embedding_id and mentor_id properties`);
    console.log(`  ℹ️  Properties set to empty string if missing (can be updated later)`);
  } catch (error) {
    console.error('  ❌ Error adding properties:', error.message);
    throw error;
  }
}

/**
 * Create indexes for embedding_id and mentor_id
 */
async function createIndexes(session) {
  console.log('\n📊 Creating indexes...');

  const indexes = [
    {
      name: 'artist_embedding_id',
      query: 'CREATE INDEX artist_embedding_id IF NOT EXISTS FOR (a:Artist) ON (a.embedding_id)'
    },
    {
      name: 'artist_mentor_id',
      query: 'CREATE INDEX artist_mentor_id IF NOT EXISTS FOR (a:Artist) ON (a.mentor_id)'
    }
  ];

  for (const index of indexes) {
    try {
      await session.run(index.query);
      console.log(`  ✓ Created index: ${index.name}`);
    } catch (error) {
      // Index might already exist or there might be an issue
      console.log(`  ⚠️  Index ${index.name} (${error.message.includes('already exists') ? 'already exists' : 'error'})`);
    }
  }
}

/**
 * Verify migration by checking counts and property existence
 */
async function verifyMigration(session) {
  console.log('\n🔍 Verifying migration...');

  try {
    // Count artists with properties
    const artistCount = await session.run(`
      MATCH (a:Artist)
      RETURN count(a) as totalArtists
    `);
    const totalArtists = neo4j.integer.toNumber(artistCount.records[0].get('totalArtists'));

    // Count artists with embedding_id property (including null)
    // Check if property exists in the node's keys, regardless of value
    const embeddingCount = await session.run(`
      MATCH (a:Artist)
      WHERE 'embedding_id' IN keys(a)
      RETURN count(a) as artistsWithEmbedding
    `);
    const artistsWithEmbedding = neo4j.integer.toNumber(embeddingCount.records[0].get('artistsWithEmbedding'));

    // Count artists with mentor_id property (including null)
    // Check if property exists in the node's keys, regardless of value
    const mentorCount = await session.run(`
      MATCH (a:Artist)
      WHERE 'mentor_id' IN keys(a)
      RETURN count(a) as artistsWithMentor
    `);
    const artistsWithMentor = neo4j.integer.toNumber(mentorCount.records[0].get('artistsWithMentor'));

    // Check if indexes exist
    const indexCheck = await session.run(`
      SHOW INDEXES
      WHERE name = 'artist_embedding_id' OR name = 'artist_mentor_id'
      RETURN name, state
    `);

    console.log(`  ✓ Total Artist nodes: ${totalArtists}`);
    console.log(`  ✓ Artists with embedding_id property: ${artistsWithEmbedding} (should equal ${totalArtists} if migration succeeded)`);
    console.log(`  ✓ Artists with mentor_id property: ${artistsWithMentor} (should equal ${totalArtists} if migration succeeded)`);
    
    if (indexCheck.records.length > 0) {
      console.log(`  ✓ Indexes created: ${indexCheck.records.length}`);
      indexCheck.records.forEach(record => {
        console.log(`    - ${record.get('name')}: ${record.get('state')}`);
      });
    } else {
      console.log(`  ⚠️  Indexes not found (may need to be created)`);
    }

    console.log('\n  ✅ Migration verification complete');
  } catch (error) {
    console.error('  ❌ Error verifying migration:', error.message);
    throw error;
  }
}

/**
 * Main migration function
 */
async function main() {
  const session = driver.session();

  try {
    console.log('🚀 Starting Neo4j schema migration...');
    console.log(`📍 Connecting to ${NEO4J_URI} as ${NEO4J_USER}`);

    // Test connection
    await session.run('RETURN 1');
    console.log('✅ Connected to Neo4j successfully');

    // Add new properties to Artist nodes
    await addProperties(session);

    // Create indexes
    await createIndexes(session);

    // Verify migration
    await verifyMigration(session);

    console.log('\n✅ Schema migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Update artists.json with mentor_id and embedding_id fields');
    console.log('   2. Add mentor/influence relationships to artists.json');
    console.log('   3. Run import-to-neo4j.js to import new relationships');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
    console.log('\n👋 Connection closed');
  }
}

// Run the migration
main().catch(console.error);


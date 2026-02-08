/**
 * Simple Neo4j connection test
 */

import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USERNAME = process.env.NEO4J_USERNAME || process.env.NEO4J_USER;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;

console.log('🔍 Neo4j Connection Details:');
console.log(`   URI: ${NEO4J_URI}`);
console.log(`   Username: ${NEO4J_USERNAME}`);
console.log(`   Password: ${NEO4J_PASSWORD ? '[SET]' : '[NOT SET]'}`);

if (!NEO4J_URI || !NEO4J_USERNAME || !NEO4J_PASSWORD) {
  console.error('\n❌ Missing Neo4j credentials');
  process.exit(1);
}

console.log('\n🔌 Attempting connection...');

const driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD),
  {
    maxConnectionLifetime: 3 * 60 * 1000, // 3 minutes
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
    connectionTimeout: 30000 // 30 seconds
  }
);

async function testConnection() {
  const session = driver.session();

  try {
    console.log('   Verifying connectivity...');
    const result = await session.run('RETURN 1 as test');
    console.log('✅ Connected successfully!');

    // Get database info
    const dbInfo = await session.run('CALL dbms.components() YIELD name, versions, edition');
    const component = dbInfo.records[0];
    console.log(`   Database: ${component.get('name')}`);
    console.log(`   Version: ${component.get('versions')[0]}`);
    console.log(`   Edition: ${component.get('edition')}`);

    return true;
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error(`   ${error.message}`);

    if (error.code === 'ServiceUnavailable') {
      console.error('\n💡 Tips:');
      console.error('   - Check if your Neo4j Aura instance is running');
      console.error('   - Instances auto-pause after inactivity (takes 1-2 min to resume)');
      console.error('   - Visit: https://console.neo4j.io');
    }

    return false;
  } finally {
    await session.close();
    await driver.close();
  }
}

testConnection();

/**
 * Wait for Neo4j to become available and then import artists
 */

import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USERNAME = process.env.NEO4J_USERNAME || process.env.NEO4J_USER;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;

const MAX_RETRIES = 12; // 12 attempts = 2 minutes
const RETRY_DELAY = 10000; // 10 seconds

async function checkConnection(attemptNum) {
  const driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD),
    { connectionTimeout: 10000 }
  );

  const session = driver.session();

  try {
    await session.run('RETURN 1 as test');
    await session.close();
    await driver.close();
    return true;
  } catch (error) {
    await session.close();
    await driver.close();
    return false;
  }
}

async function waitForNeo4j() {
  console.log('⏳ Waiting for Neo4j to become available...');
  console.log(`   Will retry up to ${MAX_RETRIES} times (${MAX_RETRIES * RETRY_DELAY / 1000}s total)`);

  for (let i = 0; i < MAX_RETRIES; i++) {
    process.stdout.write(`\n   Attempt ${i + 1}/${MAX_RETRIES}... `);

    const isConnected = await checkConnection(i + 1);

    if (isConnected) {
      console.log('✅ Connected!');
      return true;
    }

    console.log('❌ Not ready yet');

    if (i < MAX_RETRIES - 1) {
      process.stdout.write(`   Waiting ${RETRY_DELAY / 1000}s before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }

  console.log('\n\n❌ Neo4j did not become available after maximum retries');
  console.log('   Please check the instance status at: https://console.neo4j.io');
  return false;
}

async function runImport() {
  console.log('\n🚀 Starting artist import...\n');

  try {
    const { stdout, stderr } = await execAsync('node scripts/insert-artists-to-neo4j.js', {
      cwd: path.join(__dirname, '..')
    });

    console.log(stdout);
    if (stderr) console.error(stderr);

    return true;
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔄 Neo4j Connection Waiter');
  console.log('='.repeat(60));

  const isConnected = await waitForNeo4j();

  if (isConnected) {
    await runImport();
  } else {
    process.exit(1);
  }
}

main();

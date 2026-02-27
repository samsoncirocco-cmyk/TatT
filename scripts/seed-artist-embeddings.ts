import { getApps, initializeApp } from 'firebase-admin/app';
import neo4j from 'neo4j-driver';
import { batchGenerateEmbeddings } from '../src/services/vertex-embedding-service';
import { storeArtistEmbedding } from '../src/services/firestore-vector-service';

const BATCH_SIZE = 5;
const DEFAULT_LIMIT = 500;

type ArtistSeedRow = {
  id: string;
  name?: string;
  city?: string;
  styles?: string[];
  tags?: string[];
  bodyParts?: string[];
};

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function compact(values: Array<string | undefined | null>): string[] {
  return values.map((value) => String(value || '').trim()).filter(Boolean);
}

function ensureFirebaseAdmin(): void {
  if (getApps().length > 0) {
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID
    || process.env.GCP_PROJECT_ID
    || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (projectId) {
    initializeApp({ projectId });
    return;
  }

  initializeApp();
}

function buildEmbeddingText(artist: ArtistSeedRow): string {
  const parts: string[] = [];
  const name = String(artist.name || '').trim();
  const city = String(artist.city || '').trim();
  const styles = compact(artist.styles || []);
  const tags = compact(artist.tags || []);
  const bodyParts = compact(artist.bodyParts || []);

  if (name) parts.push(name);
  if (city) parts.push(`Located in ${city}`);
  if (styles.length) parts.push(`Specializes in: ${styles.join(', ')}`);
  if (tags.length) parts.push(`Tags: ${tags.join(', ')}`);
  if (bodyParts.length) parts.push(`Body parts: ${bodyParts.join(', ')}`);

  return parts.join('. ');
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

async function loadArtists(driver: any): Promise<ArtistSeedRow[]> {
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });

  try {
    const result = await session.run(
      `
      MATCH (a:Artist)
      RETURN
        a.id AS id,
        a.name AS name,
        a.city AS city,
        a.styles AS styles,
        a.tags AS tags,
        a.bodyParts AS bodyParts
      LIMIT $limit
      `,
      { limit: neo4j.int(DEFAULT_LIMIT) }
    );

    return result.records.map((record: any) => ({
      id: String(record.get('id')),
      name: record.get('name') || '',
      city: record.get('city') || '',
      styles: Array.isArray(record.get('styles')) ? record.get('styles') : [],
      tags: Array.isArray(record.get('tags')) ? record.get('tags') : [],
      bodyParts: Array.isArray(record.get('bodyParts')) ? record.get('bodyParts') : []
    })).filter((artist: ArtistSeedRow) => artist.id);
  } finally {
    await session.close();
  }
}

async function main(): Promise<void> {
  const dryRun = hasFlag('--dry-run');
  const projectId = requireEnv('GCP_PROJECT_ID');
  const neo4jUri = requireEnv('NEO4J_URI');
  const neo4jUser = process.env.NEO4J_USERNAME || process.env.NEO4J_USER || requireEnv('NEO4J_USERNAME');
  const neo4jPassword = requireEnv('NEO4J_PASSWORD');

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.warn('[SeedEmbeddings] GOOGLE_APPLICATION_CREDENTIALS not set; relying on Application Default Credentials');
  }

  process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || projectId;
  ensureFirebaseAdmin();

  const driver = neo4j.driver(
    neo4jUri,
    neo4j.auth.basic(neo4jUser, neo4jPassword),
    { maxConnectionPoolSize: 5 }
  );

  let successCount = 0;
  let errorCount = 0;

  try {
    const artists = await loadArtists(driver);
    const total = artists.length;
    console.log(`[SeedEmbeddings] Loaded ${total} artists from Neo4j`);

    for (let i = 0; i < artists.length; i += BATCH_SIZE) {
      const batch = artists.slice(i, i + BATCH_SIZE);
      const texts = batch.map(buildEmbeddingText);

      if (dryRun) {
        successCount += batch.length;
        console.log(`[SeedEmbeddings] Dry-run embedded ${Math.min(i + batch.length, total)}/${total} artists`);
        continue;
      }

      try {
        const embeddings = await batchGenerateEmbeddings(texts);
        await Promise.all(batch.map((artist, index) =>
          storeArtistEmbedding(artist.id, embeddings[index], {
            sourceText: texts[index],
            model: 'text-embedding-004'
          })
        ));

        successCount += batch.length;
        console.log(`[SeedEmbeddings] Embedded ${Math.min(i + batch.length, total)}/${total} artists`);
      } catch (error) {
        errorCount += batch.length;
        console.error(`[SeedEmbeddings] Batch failed at index ${i}:`, error);
      }
    }

    console.log(`[SeedEmbeddings] Completed: ${successCount}/${artists.length} artists embedded, ${errorCount} errors`);
  } finally {
    await driver.close();
  }
}

main().catch((error) => {
  console.error('[SeedEmbeddings] Fatal error:', error);
  process.exit(1);
});

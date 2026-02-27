import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { normalizeVector } from '../lib/embedding-normalization';

const COLLECTION_NAME = 'artist_embeddings';
const EMBEDDING_DIMENSION = 768;
const DEFAULT_LIMIT = 20;

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

export async function storeArtistEmbedding(
  artistId: string,
  embedding: number[],
  metadata: { sourceText?: string; model?: string } = {}
): Promise<void> {
  if (!artistId) {
    throw new Error('artistId is required');
  }

  const normalized = normalizeVector(embedding);
  if (normalized.length !== EMBEDDING_DIMENSION) {
    throw new Error(`Embedding must be ${EMBEDDING_DIMENSION} dimensions`);
  }

  ensureFirebaseAdmin();
  const db = getFirestore();

  await db.collection(COLLECTION_NAME).doc(String(artistId)).set({
    embedding: FieldValue.vector(normalized),
    dimension: EMBEDDING_DIMENSION,
    model: metadata.model || 'text-embedding-004',
    sourceText: metadata.sourceText || null,
    createdAt: FieldValue.serverTimestamp()
  }, { merge: true });
}

export async function searchSimilarArtists(
  queryEmbedding: number[],
  limit: number = DEFAULT_LIMIT
): Promise<Array<{ artistId: string; score: number; rank: number }>> {
  const normalized = normalizeVector(queryEmbedding);
  if (normalized.length !== EMBEDDING_DIMENSION) {
    throw new Error(`Query embedding must be ${EMBEDDING_DIMENSION} dimensions`);
  }

  ensureFirebaseAdmin();
  const db = getFirestore();

  const snapshot = await db.collection(COLLECTION_NAME)
    .findNearest({
      vectorField: 'embedding',
      queryVector: normalized,
      distanceMeasure: 'COSINE',
      limit: limit || DEFAULT_LIMIT,
      distanceResultField: 'vector_distance'
    })
    .get();

  return snapshot.docs.map((doc, index) => {
    const rawDistance = Number(doc.get('vector_distance'));
    const distance = Number.isFinite(rawDistance) ? rawDistance : 2;
    const similarity = Math.max(0, Math.min(1, 1 - (distance / 2)));

    return {
      artistId: doc.id,
      score: similarity,
      rank: index + 1
    };
  });
}

export async function getArtistEmbedding(
  artistId: string
): Promise<{ embedding: number[]; model: string } | null> {
  if (!artistId) {
    return null;
  }

  ensureFirebaseAdmin();
  const db = getFirestore();
  const snapshot = await db.collection(COLLECTION_NAME).doc(String(artistId)).get();
  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data() || {};
  const embedding = Array.isArray(data.embedding)
    ? data.embedding.map((value: unknown) => Number(value))
    : [];

  if (embedding.length !== EMBEDDING_DIMENSION) {
    return null;
  }

  return {
    embedding,
    model: typeof data.model === 'string' && data.model ? data.model : 'text-embedding-004'
  };
}

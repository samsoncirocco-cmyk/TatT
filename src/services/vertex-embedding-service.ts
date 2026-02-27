import { GoogleAuth } from 'google-auth-library';
import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { normalizeVector } from '../lib/embedding-normalization';

const MODEL_NAME = 'text-embedding-004';
const LOCATION = 'us-central1';
const EMBEDDING_DIMENSION = 768;
const BATCH_SIZE = 5;
const QUERY_CACHE_COLLECTION = 'query_embedding_cache';
const QUERY_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const googleAuth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

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

function getPredictEndpoint(): string {
  const projectId = process.env.GCP_PROJECT_ID;
  if (!projectId) {
    throw new Error('GCP_PROJECT_ID is required for Vertex AI embedding generation');
  }

  return `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${LOCATION}/publishers/google/models/${MODEL_NAME}:predict`;
}

function getCacheDocId(queryText: string): string {
  return createHash('sha256').update(queryText).digest('hex');
}

function getCachedAtMillis(cachedAt: unknown): number | null {
  if (!cachedAt) return null;
  if (cachedAt instanceof Timestamp) return cachedAt.toMillis();
  if (typeof (cachedAt as any)?.toMillis === 'function') return (cachedAt as any).toMillis();
  return null;
}

function readPredictionEmbedding(prediction: any): number[] {
  const values: unknown = prediction?.embeddings?.values ?? prediction?.values;
  if (!Array.isArray(values)) {
    throw new Error('Vertex AI embedding response missing values array');
  }

  const numericValues = values.map((value) => Number(value));
  if (numericValues.length !== EMBEDDING_DIMENSION) {
    throw new Error(`Expected ${EMBEDDING_DIMENSION} dimensions, received ${numericValues.length}`);
  }

  return normalizeVector(numericValues);
}

async function predictEmbeddings(texts: string[]): Promise<number[][]> {
  if (!texts.length) {
    return [];
  }

  const endpoint = getPredictEndpoint();

  try {
    const client = await googleAuth.getClient();
    const tokenResponse = await client.getAccessToken();
    const accessToken = typeof tokenResponse === 'string' ? tokenResponse : tokenResponse?.token;

    if (!accessToken) {
      throw new Error('Could not acquire Google access token');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        instances: texts.map((content) => ({ content }))
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Vertex API request failed (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const predictions: any[] = Array.isArray(data?.predictions) ? data.predictions : [];
    if (predictions.length !== texts.length) {
      throw new Error(`Expected ${texts.length} predictions, received ${predictions.length}`);
    }

    return predictions.map(readPredictionEmbedding);
  } catch (error) {
    console.error('[VertexAI] Failed to generate embeddings:', error);
    throw new Error(`Vertex embedding generation failed: ${(error as Error).message}`);
  }
}

export async function generateTextEmbedding(text: string): Promise<number[]> {
  const value = String(text || '').trim();
  if (!value) {
    throw new Error('Text is required to generate embeddings');
  }

  const embeddings = await predictEmbeddings([value]);
  return embeddings[0];
}

export async function batchGenerateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  const sanitized = texts.map((text) => String(text || '').trim());
  const outputs: number[][] = [];

  for (let i = 0; i < sanitized.length; i += BATCH_SIZE) {
    const chunk = sanitized.slice(i, i + BATCH_SIZE);
    if (chunk.some((item) => !item)) {
      throw new Error('All text inputs must be non-empty strings');
    }
    const chunkEmbeddings = await predictEmbeddings(chunk);
    outputs.push(...chunkEmbeddings);
  }

  return outputs;
}

export async function getQueryEmbedding(queryText: string): Promise<number[]> {
  const normalizedQuery = String(queryText || '').trim().toLowerCase();
  if (!normalizedQuery) {
    throw new Error('Query text is required');
  }

  ensureFirebaseAdmin();
  const db = getFirestore();
  const cacheDocId = getCacheDocId(normalizedQuery);
  const cacheRef = db.collection(QUERY_CACHE_COLLECTION).doc(cacheDocId);

  try {
    const snapshot = await cacheRef.get();
    if (snapshot.exists) {
      const data = snapshot.data() || {};
      const cachedAtMillis = getCachedAtMillis(data.cachedAt ?? data.createdAt);
      const cachedEmbedding = data.embedding;

      if (
        Array.isArray(cachedEmbedding)
        && cachedEmbedding.length === EMBEDDING_DIMENSION
        && cachedAtMillis
        && (Date.now() - cachedAtMillis) <= QUERY_CACHE_TTL_MS
      ) {
        return cachedEmbedding.map((value: unknown) => Number(value));
      }
    }
  } catch (error) {
    console.warn('[VertexAI] Failed reading query embedding cache:', error);
  }

  const embedding = await generateTextEmbedding(normalizedQuery);

  try {
    await cacheRef.set({
      query: normalizedQuery,
      embedding,
      model: MODEL_NAME,
      cachedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.warn('[VertexAI] Failed writing query embedding cache:', error);
  }

  return embedding;
}

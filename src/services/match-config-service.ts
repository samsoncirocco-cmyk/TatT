import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export interface MatchConfig {
  rrfWeights: {
    graph: number;
    vector: number;
  };
  rrfK: number;
  confidenceThreshold: number;
}

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  rrfWeights: { graph: 0.5, vector: 0.5 },
  rrfK: 60,
  confidenceThreshold: 0.5
};

interface ConfigCacheEntry {
  data: MatchConfig;
  timestamp: number;
}

const CONFIG_CACHE_TTL_MS = 60 * 1000;
let configCache: ConfigCacheEntry | null = null;

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

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, parsed));
}

function mergeConfig(rawData: any): MatchConfig {
  return {
    rrfWeights: {
      graph: clampNumber(rawData?.rrfWeights?.graph, DEFAULT_MATCH_CONFIG.rrfWeights.graph, 0, 1),
      vector: clampNumber(rawData?.rrfWeights?.vector, DEFAULT_MATCH_CONFIG.rrfWeights.vector, 0, 1)
    },
    rrfK: clampNumber(rawData?.rrfK, DEFAULT_MATCH_CONFIG.rrfK, 1, 1000),
    confidenceThreshold: clampNumber(rawData?.confidenceThreshold, DEFAULT_MATCH_CONFIG.confidenceThreshold, 0, 1)
  };
}

export async function getMatchConfig(): Promise<MatchConfig> {
  const now = Date.now();
  if (configCache && (now - configCache.timestamp) < CONFIG_CACHE_TTL_MS) {
    return configCache.data;
  }

  ensureFirebaseAdmin();
  const db = getFirestore();

  try {
    const snapshot = await db.collection('config').doc('matching').get();
    const merged = snapshot.exists ? mergeConfig(snapshot.data()) : DEFAULT_MATCH_CONFIG;
    const weightSum = merged.rrfWeights.graph + merged.rrfWeights.vector;

    const normalized = weightSum > 0
      ? {
        ...merged,
        rrfWeights: {
          graph: merged.rrfWeights.graph / weightSum,
          vector: merged.rrfWeights.vector / weightSum
        }
      }
      : null;

    if (!normalized) {
      console.warn('[MatchConfig] Invalid rrfWeights detected; using defaults');
      configCache = { data: DEFAULT_MATCH_CONFIG, timestamp: now };
      return DEFAULT_MATCH_CONFIG;
    }

    configCache = { data: normalized, timestamp: now };
    return normalized;
  } catch (error) {
    console.warn('[MatchConfig] Failed to fetch config; using defaults:', error);
    configCache = { data: DEFAULT_MATCH_CONFIG, timestamp: now };
    return DEFAULT_MATCH_CONFIG;
  }
}

export function weightedRRF(
  graphResults: Array<{ id: string; rank: number }>,
  vectorResults: Array<{ id: string; rank: number }>,
  config: MatchConfig
): Map<string, number> {
  const scores = new Map<string, number>();
  const k = config.rrfK || DEFAULT_MATCH_CONFIG.rrfK;

  graphResults.forEach((result) => {
    if (!result?.id || !Number.isFinite(result.rank) || result.rank <= 0) return;
    const delta = config.rrfWeights.graph * (1 / (k + result.rank));
    scores.set(result.id, (scores.get(result.id) || 0) + delta);
  });

  vectorResults.forEach((result) => {
    if (!result?.id || !Number.isFinite(result.rank) || result.rank <= 0) return;
    const delta = config.rrfWeights.vector * (1 / (k + result.rank));
    scores.set(result.id, (scores.get(result.id) || 0) + delta);
  });

  return scores;
}

import { FirestoreAdapter } from './FirestoreAdapter';
import type { Design, DesignVersion } from './types';
import { getFirestore } from 'firebase/firestore';
import { app as firebaseApp } from '../../lib/firebase-client';

export type MigrationResult = {
  designsMigrated: number;
  versionsMigrated: number;
  layersMigrated: number;
  errors: string[];
};

const LEGACY_PREFIX = 'tattester_version_history_';
const FORGE_STORAGE_KEY = 'canvas_layers';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function isMigrationComplete(userId: string): boolean {
  if (!isBrowser()) return false;
  return Boolean(localStorage.getItem(`migration_completed_${userId}`));
}

export function hasPendingMigration(): boolean {
  if (!isBrowser()) return false;
  try {
    const keys = Object.keys(localStorage);
    const hasLegacy = keys.some((k) => k.startsWith(LEGACY_PREFIX));
    const hasAnonAdapterData = keys.some(
      (k) => k.startsWith('design_anonymous_') || k.startsWith('versions_anonymous_')
    );
    const hasForgeState = Boolean(
      sessionStorage.getItem(FORGE_STORAGE_KEY) || localStorage.getItem(FORGE_STORAGE_KEY)
    );
    return hasLegacy || hasAnonAdapterData || hasForgeState;
  } catch {
    return false;
  }
}

export async function migrateLocalStorageToFirestore(userId: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    designsMigrated: 0,
    versionsMigrated: 0,
    layersMigrated: 0,
    errors: [],
  };

  if (!isBrowser()) return result;
  if (isMigrationComplete(userId)) return result;
  if (!firebaseApp) throw new Error('[Migration] Firebase app not initialized');

  const firestore = new FirestoreAdapter(getFirestore(firebaseApp));

  const legacyDesignIds = Object.keys(localStorage)
    .filter((k) => k.startsWith(LEGACY_PREFIX))
    .map((k) => k.slice(LEGACY_PREFIX.length))
    .filter(Boolean);

  for (const designId of legacyDesignIds) {
    try {
      const versionsRaw = localStorage.getItem(`${LEGACY_PREFIX}${designId}`);
      if (!versionsRaw) continue;
      const versions = JSON.parse(versionsRaw) as DesignVersion[];
      if (!Array.isArray(versions) || versions.length === 0) continue;

      const first = versions[0] as any;
      const inferredBodyPart = first?.parameters?.bodyPart || first?.metadata?.bodyPart || 'forearm';

      const design: Design = {
        id: designId,
        createdAt: versions[0]?.timestamp || new Date().toISOString(),
        updatedAt: versions[versions.length - 1]?.timestamp || new Date().toISOString(),
        currentVersionId: versions[versions.length - 1]?.id,
        bodyPart: inferredBodyPart,
        canvas: { width: 1024, height: 1024, aspectRatio: 1 },
        isFavorite: false,
      };

      await firestore.saveDesign(userId, design);
      result.designsMigrated += 1;

      for (const version of versions) {
        await firestore.saveVersion(userId, designId, version);
        result.versionsMigrated += 1;

        const layers = Array.isArray(version.layers) ? version.layers : [];
        if (layers.length > 0) {
          await firestore.saveLayers(userId, designId, version.id, layers);
          result.layersMigrated += layers.length;
        }
      }
    } catch (err: any) {
      console.error('[Migration] Failed migrating legacy design:', designId, err);
      result.errors.push(`${designId}: ${err?.message || String(err)}`);
    }
  }

  // Optional: migrate current Forge state (if it exists).
  try {
    const stored = sessionStorage.getItem(FORGE_STORAGE_KEY) || localStorage.getItem(FORGE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as any;
      const state = parsed?.state || parsed;
      const layers = Array.isArray(state?.layers) ? state.layers : [];
      if (layers.length > 0) {
        const designId = `migrated_forge_${Date.now()}`;
        const design: Design = {
          id: designId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          currentVersionId: 'v1',
          bodyPart: state?.canvas?.bodyPart || 'forearm',
          canvas: state?.canvas || { width: 1024, height: 1024, aspectRatio: 1 },
          isFavorite: false,
        };

        const version: DesignVersion = {
          id: 'v1',
          versionNumber: 1,
          timestamp: new Date().toISOString(),
          prompt: state?.promptText || '',
          parameters: state?.parameters || {},
          layers,
          imageUrl: null as any,
        };

        await firestore.saveDesign(userId, design);
        await firestore.saveVersion(userId, designId, version);
        await firestore.saveLayers(userId, designId, version.id, layers);

        result.designsMigrated += 1;
        result.versionsMigrated += 1;
        result.layersMigrated += layers.length;
      }
    }
  } catch (err) {
    console.warn('[Migration] Forge state migration skipped:', err);
  }

  if (result.errors.length === 0 && result.designsMigrated > 0) {
    localStorage.setItem(`migration_completed_${userId}`, new Date().toISOString());
  }

  return result;
}

export function clearMigratedLocalStorage(userId: string): void {
  if (!isBrowser()) return;
  if (!isMigrationComplete(userId)) return;

  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(LEGACY_PREFIX) || key.startsWith('design_anonymous_') || key.startsWith('versions_anonymous_')) {
      localStorage.removeItem(key);
    }
  }
}

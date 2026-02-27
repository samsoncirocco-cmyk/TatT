/**
 * Version History Service
 *
 * Storage-backed implementation using IDesignStorage.
 * Anonymous users persist to LocalStorageAdapter; authenticated users persist to FirestoreAdapter.
 */

import type { IDesignStorage } from './storage/IDesignStorage';
import type { Design, DesignVersion, Layer } from './storage/types';
import { createStorageAdapter } from './storage/StorageFactory';
import { generateLayerId } from '../lib/layerUtils.js';

const MAX_VERSIONS_PER_DESIGN = 50;
const LEGACY_VERSION_PREFIX = 'tattester_version_history_';

function nowIso(): string {
  return new Date().toISOString();
}

function generateVersionId(): string {
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createVersion(data: Partial<DesignVersion>): DesignVersion {
  return {
    id: generateVersionId(),
    versionNumber: 1,
    timestamp: nowIso(),
    ...data,
  } as DesignVersion;
}

function cloneLayerWithNewId(layer: any, newZIndex: number): any {
  return {
    ...layer,
    id: generateLayerId(),
    zIndex: newZIndex,
  };
}

async function ensureDesignExists(storage: IDesignStorage, userId: string, designId: string, hint?: Partial<Design>) {
  const existing = await storage.loadDesign(userId, designId);
  if (existing) return;

  const bodyPart = (hint?.bodyPart as string) || 'forearm';
  const canvas = hint?.canvas || { width: 1024, height: 1024, aspectRatio: 1 };

  const design: Design = {
    id: designId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    currentVersionId: undefined,
    bodyPart,
    canvas,
    isFavorite: false,
  };

  await storage.saveDesign(userId, design);
}

async function loadLegacyVersions(designId: string): Promise<DesignVersion[] | null> {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${LEGACY_VERSION_PREFIX}${designId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DesignVersion[]) : null;
  } catch {
    return null;
  }
}

export class VersionService {
  constructor(private storage: IDesignStorage, private userId: string) {}

  async getVersions(designId: string, limit?: number): Promise<DesignVersion[]> {
    const versions = await this.storage.loadVersions(this.userId, designId, limit);
    if (versions.length > 0) return versions;

    // Legacy fallback for anonymous localStorage histories.
    const legacy = await loadLegacyVersions(designId);
    if (!legacy || legacy.length === 0) return [];

    try {
      await ensureDesignExists(this.storage, this.userId, designId);
      for (const v of legacy) {
        const { layers, ...rest } = v as any;
        await this.storage.saveVersion(this.userId, designId, rest as DesignVersion);
        if (Array.isArray(layers) && layers.length > 0) {
          await this.storage.saveLayers(this.userId, designId, v.id, layers);
        }
      }
      return await this.storage.loadVersions(this.userId, designId, limit);
    } catch (err) {
      console.warn('[VersionService] Failed to migrate legacy versions; returning legacy in-memory.', err);
      return legacy;
    }
  }

  async getVersionById(designId: string, versionId: string): Promise<DesignVersion | null> {
    const version = await this.storage.loadVersion(this.userId, designId, versionId);
    if (!version) return null;
    const layers = await this.storage.loadLayers(this.userId, designId, versionId);
    return { ...version, layers };
  }

  async addVersion(designId: string, versionData: Partial<DesignVersion>): Promise<DesignVersion> {
    await ensureDesignExists(this.storage, this.userId, designId, {
      bodyPart: (versionData as any)?.metadata?.bodyPart,
    });

    const existing = await this.storage.loadVersions(this.userId, designId);
    const nextNumber = existing.length > 0 ? Math.max(...existing.map(v => v.versionNumber || 0)) + 1 : 1;

    const newVersion = createVersion({
      versionNumber: nextNumber,
      ...versionData,
    });

    await this.storage.saveVersion(this.userId, designId, newVersion);
    if (Array.isArray(newVersion.layers)) {
      await this.storage.saveLayers(this.userId, designId, newVersion.id, newVersion.layers);
    }

    // Enforce limit: remove oldest non-favorite if needed.
    const all = await this.storage.loadVersions(this.userId, designId);
    if (all.length > MAX_VERSIONS_PER_DESIGN) {
      const sortedAsc = [...all].sort((a, b) => (a.versionNumber || 0) - (b.versionNumber || 0));
      const candidate = sortedAsc.find(v => !v.isFavorite) || sortedAsc[0];
      if (candidate?.id && candidate.id !== newVersion.id) {
        await this.storage.deleteVersion(this.userId, designId, candidate.id);
      }
    }

    return newVersion;
  }

  async deleteVersion(designId: string, versionId: string): Promise<DesignVersion[]> {
    await this.storage.deleteVersion(this.userId, designId, versionId);
    return this.storage.loadVersions(this.userId, designId);
  }

  async clearHistory(designId: string): Promise<void> {
    await this.storage.deleteDesign(this.userId, designId);
  }

  async branchFromVersion(designId: string, versionId: string): Promise<{ designId: string; version: DesignVersion } | null> {
    const source = await this.getVersionById(designId, versionId);
    if (!source) return null;

    const branchDesignId = `${designId}_branch_${Date.now()}`;
    await ensureDesignExists(this.storage, this.userId, branchDesignId, {
      bodyPart: (source as any)?.metadata?.bodyPart,
    });

    const layers = Array.isArray(source.layers) ? source.layers : [];
    const clonedLayers = layers.map((layer: any, idx: number) => cloneLayerWithNewId(layer, idx));

    const branchedVersion = createVersion({
      ...source,
      id: generateVersionId(),
      versionNumber: 1,
      timestamp: nowIso(),
      layers: clonedLayers,
      branchedFrom: {
        sessionId: designId,
        versionId,
        versionNumber: source.versionNumber,
      },
    });

    await this.storage.saveVersion(this.userId, branchDesignId, branchedVersion);
    await this.storage.saveLayers(this.userId, branchDesignId, branchedVersion.id, clonedLayers as Layer[]);

    return { designId: branchDesignId, version: branchedVersion };
  }

  async compareVersions(designId: string, versionId1: string, versionId2: string) {
    const version1 = await this.getVersionById(designId, versionId1);
    const version2 = await this.getVersionById(designId, versionId2);
    if (!version1 || !version2) return null;

    const differences = {
      prompt: version1.prompt !== version2.prompt,
      enhancedPrompt: version1.enhancedPrompt !== version2.enhancedPrompt,
      parameters: JSON.stringify(version1.parameters) !== JSON.stringify(version2.parameters),
      layerCount: (version1.layers?.length || 0) !== (version2.layers?.length || 0),
      imageUrl: version1.imageUrl !== version2.imageUrl,
    };

    const totalChecks = Object.keys(differences).length;
    const sameCount = Object.values(differences).filter(diff => !diff).length;
    const similarityScore = Math.round((sameCount / totalChecks) * 100);

    return {
      version1,
      version2,
      differences,
      similarityScore,
      timeDifference: new Date(version2.timestamp).getTime() - new Date(version1.timestamp).getTime(),
    };
  }

  async mergeVersions(
    designId: string,
    versionId1: string,
    versionId2: string,
    mergeOptions: any = {}
  ): Promise<DesignVersion | null> {
    const version1 = await this.getVersionById(designId, versionId1);
    const version2 = await this.getVersionById(designId, versionId2);
    if (!version1 || !version2) return null;

    const {
      layersFromVersion1 = [],
      layersFromVersion2 = [],
      prompt = version1.prompt,
      parameters = version1.parameters,
    } = mergeOptions;

    const layers1 = (version1.layers || []).filter((_: any, idx: number) => layersFromVersion1.includes(idx));
    const layers2 = (version2.layers || []).filter((_: any, idx: number) => layersFromVersion2.includes(idx));

    const mergedLayers = [
      ...layers1.map((layer: any, idx: number) => cloneLayerWithNewId(layer, idx)),
      ...layers2.map((layer: any, idx: number) => cloneLayerWithNewId(layer, layers1.length + idx)),
    ];

    return this.addVersion(designId, {
      prompt,
      parameters,
      layers: mergedLayers,
      imageUrl: null,
      mergedFrom: {
        version1: versionId1,
        version2: versionId2,
        mergeOptions,
      },
    });
  }

  async getVersionTimeline(designId: string) {
    const versions = await this.getVersions(designId);
    return versions.map(v => ({
      id: v.id,
      versionNumber: v.versionNumber,
      timestamp: v.timestamp,
      thumbnail: v.imageUrl || (v.layers as any)?.[0]?.imageUrl,
      promptPreview: (v.prompt || '').substring(0, 50) + ((v.prompt || '').length > 50 ? '...' : ''),
      layerCount: v.layers?.length || 0,
      branchedFrom: v.branchedFrom,
      mergedFrom: v.mergedFrom,
    }));
  }

  async toggleVersionFavorite(designId: string, versionId: string): Promise<DesignVersion | null> {
    const version = await this.storage.loadVersion(this.userId, designId, versionId);
    if (!version) return null;
    const updated: DesignVersion = { ...version, isFavorite: !version.isFavorite };
    await this.storage.saveVersion(this.userId, designId, updated);
    return updated;
  }
}

function getEffectiveUserId(user: any): string {
  return user?.uid || 'anonymous';
}

// Backward-compatible module-level helpers used by legacy components/tests.
export async function getVersions(designId: string, user?: any): Promise<DesignVersion[]> {
  const service = new VersionService(createStorageAdapter(user), getEffectiveUserId(user));
  return service.getVersions(designId);
}

export async function addVersion(designId: string, versionData: Partial<DesignVersion>, user?: any): Promise<DesignVersion> {
  const service = new VersionService(createStorageAdapter(user), getEffectiveUserId(user));
  return service.addVersion(designId, versionData);
}

export async function deleteVersion(designId: string, versionId: string, user?: any): Promise<DesignVersion[]> {
  const service = new VersionService(createStorageAdapter(user), getEffectiveUserId(user));
  return service.deleteVersion(designId, versionId);
}

export async function clearSessionHistory(designId: string, user?: any): Promise<void> {
  const service = new VersionService(createStorageAdapter(user), getEffectiveUserId(user));
  return service.clearHistory(designId);
}

export async function getVersionById(designId: string, versionId: string, user?: any): Promise<DesignVersion | null> {
  const service = new VersionService(createStorageAdapter(user), getEffectiveUserId(user));
  return service.getVersionById(designId, versionId);
}

export async function branchFromVersion(designId: string, versionId: string, user?: any) {
  const service = new VersionService(createStorageAdapter(user), getEffectiveUserId(user));
  const result = await service.branchFromVersion(designId, versionId);
  if (!result) return null;
  return { sessionId: result.designId, version: result.version };
}

export async function compareVersions(designId: string, versionId1: string, versionId2: string, user?: any) {
  const service = new VersionService(createStorageAdapter(user), getEffectiveUserId(user));
  return service.compareVersions(designId, versionId1, versionId2);
}

export async function mergeVersions(designId: string, versionId1: string, versionId2: string, mergeOptions: any = {}, user?: any) {
  const service = new VersionService(createStorageAdapter(user), getEffectiveUserId(user));
  return service.mergeVersions(designId, versionId1, versionId2, mergeOptions);
}

export async function getVersionTimeline(designId: string, user?: any) {
  const service = new VersionService(createStorageAdapter(user), getEffectiveUserId(user));
  return service.getVersionTimeline(designId);
}

export async function toggleVersionFavorite(designId: string, versionId: string, user?: any) {
  const service = new VersionService(createStorageAdapter(user), getEffectiveUserId(user));
  return service.toggleVersionFavorite(designId, versionId);
}

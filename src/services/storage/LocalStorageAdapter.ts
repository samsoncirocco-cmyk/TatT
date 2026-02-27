/**
 * LocalStorage Adapter
 *
 * Implements IDesignStorage using localStorage.
 * Wraps existing localStorage patterns from versionService.ts.
 * Suitable for anonymous users and MVP prototyping.
 */

import type { IDesignStorage } from './IDesignStorage';
import type { Design, DesignVersion, DesignMetadata, UserPreferences, Layer } from './types';
import { DEFAULT_USER_PREFERENCES } from './types';
import { safeLocalStorageGet, safeLocalStorageSet } from '../storageService';

/**
 * LocalStorage implementation of IDesignStorage
 */
export class LocalStorageAdapter implements IDesignStorage {
    /**
     * Generate storage key for designs
     */
    private getDesignKey(userId: string, designId: string): string {
        return `design_${userId}_${designId}`;
    }

    /**
     * Generate storage key for versions
     */
    private getVersionsKey(userId: string, designId: string): string {
        return `versions_${userId}_${designId}`;
    }

    /**
     * Generate storage key for preferences
     */
    private getPreferencesKey(userId: string): string {
        return `prefs_${userId}`;
    }

    /**
     * Save design metadata
     */
    async saveDesign(userId: string, design: Design): Promise<void> {
        const key = this.getDesignKey(userId, design.id);
        const result = safeLocalStorageSet(key, design);

        if (!result.success) {
            throw new Error(`Failed to save design: ${result.error}`);
        }
    }

    /**
     * Load design metadata
     */
    async loadDesign(userId: string, designId: string): Promise<Design | null> {
        const key = this.getDesignKey(userId, designId);
        const design = safeLocalStorageGet<Design | null>(key, null);
        return design;
    }

    /**
     * List all designs for a user
     * Scans localStorage keys with prefix
     */
    async listDesigns(userId: string): Promise<DesignMetadata[]> {
        const prefix = `design_${userId}_`;
        const metadata: DesignMetadata[] = [];

        if (typeof localStorage === 'undefined') {
            return metadata;
        }

        try {
            // Scan localStorage keys
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(prefix)) {
                    try {
                        const design = safeLocalStorageGet<Design | null>(key, null);
                        if (design) {
                            // Count versions for this design
                            const versionsKey = this.getVersionsKey(userId, design.id);
                            const versions = safeLocalStorageGet<DesignVersion[]>(versionsKey, []);

                            metadata.push({
                                id: design.id,
                                createdAt: design.createdAt,
                                updatedAt: design.updatedAt,
                                bodyPart: design.bodyPart,
                                isFavorite: design.isFavorite,
                                versionCount: versions.length
                            });
                        }
                    } catch (error) {
                        console.warn(`[LocalStorageAdapter] Failed to parse design key: ${key}`, error);
                    }
                }
            });
        } catch (error) {
            console.error('[LocalStorageAdapter] Error listing designs:', error);
        }

        // Sort by updatedAt descending
        return metadata.sort((a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
    }

    /**
     * Delete design and all its versions
     */
    async deleteDesign(userId: string, designId: string): Promise<void> {
        const designKey = this.getDesignKey(userId, designId);
        const versionsKey = this.getVersionsKey(userId, designId);

        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(designKey);
            localStorage.removeItem(versionsKey);
        }
    }

    /**
     * Save version (includes layers embedded)
     */
    async saveVersion(userId: string, designId: string, version: DesignVersion): Promise<void> {
        const versionsKey = this.getVersionsKey(userId, designId);
        const versions = safeLocalStorageGet<DesignVersion[]>(versionsKey, []);

        // Check if version already exists (update) or is new (append)
        const existingIndex = versions.findIndex(v => v.id === version.id);

        if (existingIndex >= 0) {
            // Update existing version
            versions[existingIndex] = version;
        } else {
            // Add new version
            versions.push(version);
        }

        const result = safeLocalStorageSet(versionsKey, versions);

        if (!result.success) {
            throw new Error(`Failed to save version: ${result.error}`);
        }

        // Update parent design's updatedAt
        const design = await this.loadDesign(userId, designId);
        if (design) {
            design.updatedAt = new Date().toISOString();
            design.currentVersionId = version.id;
            await this.saveDesign(userId, design);
        }
    }

    /**
     * Load all versions for a design
     */
    async loadVersions(userId: string, designId: string, limit?: number): Promise<DesignVersion[]> {
        const versionsKey = this.getVersionsKey(userId, designId);
        let versions = safeLocalStorageGet<DesignVersion[]>(versionsKey, []);

        // Sort by versionNumber descending (newest first)
        versions = versions.sort((a, b) => b.versionNumber - a.versionNumber);

        // Apply limit if specified
        if (limit !== undefined && limit > 0) {
            versions = versions.slice(0, limit);
        }

        return versions;
    }

    /**
     * Load specific version
     */
    async loadVersion(userId: string, designId: string, versionId: string): Promise<DesignVersion | null> {
        const versionsKey = this.getVersionsKey(userId, designId);
        const versions = safeLocalStorageGet<DesignVersion[]>(versionsKey, []);

        const version = versions.find(v => v.id === versionId);
        return version || null;
    }

    /**
     * Delete specific version
     */
    async deleteVersion(userId: string, designId: string, versionId: string): Promise<void> {
        const versionsKey = this.getVersionsKey(userId, designId);
        const versions = safeLocalStorageGet<DesignVersion[]>(versionsKey, []);

        const filtered = versions.filter(v => v.id !== versionId);

        const result = safeLocalStorageSet(versionsKey, filtered);

        if (!result.success) {
            throw new Error(`Failed to delete version: ${result.error}`);
        }
    }

    /**
     * Save layers (embeds in version for localStorage)
     * localStorage has no subcollection concept, so layers are part of version
     */
    async saveLayers(userId: string, designId: string, versionId: string, layers: Layer[]): Promise<void> {
        const version = await this.loadVersion(userId, designId, versionId);

        if (!version) {
            throw new Error(`Version ${versionId} not found`);
        }

        // Embed layers in version
        version.layers = layers;

        await this.saveVersion(userId, designId, version);
    }

    /**
     * Load layers (extracts from version)
     */
    async loadLayers(userId: string, designId: string, versionId: string): Promise<Layer[]> {
        const version = await this.loadVersion(userId, designId, versionId);

        if (!version) {
            return [];
        }

        return version.layers || [];
    }

    /**
     * Save user preferences
     */
    async savePreferences(userId: string, prefs: UserPreferences): Promise<void> {
        const key = this.getPreferencesKey(userId);
        const result = safeLocalStorageSet(key, prefs);

        if (!result.success) {
            throw new Error(`Failed to save preferences: ${result.error}`);
        }
    }

    /**
     * Load user preferences (returns defaults if not found)
     */
    async loadPreferences(userId: string): Promise<UserPreferences> {
        const key = this.getPreferencesKey(userId);
        const prefs = safeLocalStorageGet<UserPreferences | null>(key, null);

        return prefs || { ...DEFAULT_USER_PREFERENCES };
    }
}

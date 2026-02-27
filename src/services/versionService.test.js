/**
 * Version Service Tests
 *
 * Tests for version history management with focus on:
 * - Version merging with unique layer IDs
 * - Layer ID collision prevention
 * - Storage persistence
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    addVersion,
    getVersions,
    getVersionById,
    mergeVersions,
    compareVersions,
    branchFromVersion,
    clearSessionHistory
} from './versionService';

function createStorageMock() {
    const store = new Map();
    return {
        get length() {
            return store.size;
        },
        clear() {
            store.clear();
        },
        getItem(key) {
            return store.has(String(key)) ? store.get(String(key)) : null;
        },
        setItem(key, value) {
            store.set(String(key), String(value));
        },
        removeItem(key) {
            store.delete(String(key));
        },
        key(index) {
            return Array.from(store.keys())[index] || null;
        }
    };
}

describe('versionService', () => {
    const testSessionId = 'test_session_123';

    beforeEach(() => {
        // Vitest/node environment doesn't always provide a full localStorage implementation.
        // Provide minimal mocks for the localStorage-backed adapter.
        globalThis.localStorage = createStorageMock();
        globalThis.sessionStorage = createStorageMock();

        // Clear localStorage before each test
        localStorage.clear();
    });

    afterEach(async () => {
        // Cleanup after each test
        await clearSessionHistory(testSessionId);
    });

    describe('Version Storage and Retrieval', () => {
        it('should store and retrieve versions', async () => {
            const versionData = {
                prompt: 'dragon tattoo',
                parameters: { size: 'large' },
                layers: [
                    { id: 'layer_1', name: 'Background', imageUrl: 'url1', zIndex: 0 }
                ]
            };

            const version = await addVersion(testSessionId, versionData);

            expect(version).toBeTruthy();
            expect(version.id).toBeDefined();
            expect(version.versionNumber).toBe(1);

            const retrieved = await getVersionById(testSessionId, version.id);
            expect(retrieved).toBeTruthy();
            expect(retrieved.prompt).toBe('dragon tattoo');
        });

        it('should increment version numbers', async () => {
            await addVersion(testSessionId, { prompt: 'first' });
            await addVersion(testSessionId, { prompt: 'second' });
            const third = await addVersion(testSessionId, { prompt: 'third' });

            expect(third.versionNumber).toBe(3);
        });

        it('should handle missing session gracefully', async () => {
            const versions = await getVersions('nonexistent_session');
            expect(versions).toEqual([]);
        });
    });

    describe('Version Merging - Layer ID Uniqueness', () => {
        it('should create unique layer IDs when merging versions', async () => {
            // Create two versions with overlapping layer IDs
            const version1Data = {
                prompt: 'version 1',
                layers: [
                    { id: 'layer_shared', name: 'Background', imageUrl: 'url1', zIndex: 0 },
                    { id: 'layer_v1_only', name: 'Subject', imageUrl: 'url2', zIndex: 1 }
                ]
            };

            const version2Data = {
                prompt: 'version 2',
                layers: [
                    { id: 'layer_shared', name: 'Background', imageUrl: 'url1', zIndex: 0 },
                    { id: 'layer_v2_only', name: 'Effect', imageUrl: 'url3', zIndex: 1 }
                ]
            };

            const v1 = await addVersion(testSessionId, version1Data);
            const v2 = await addVersion(testSessionId, version2Data);

            // Merge: select all layers from both versions
            const merged = await mergeVersions(testSessionId, v1.id, v2.id, {
                layersFromVersion1: [0, 1],  // Both layers from v1
                layersFromVersion2: [0, 1]   // Both layers from v2
            });

            expect(merged).toBeTruthy();
            expect(merged.layers).toHaveLength(4);

            // Extract all layer IDs
            const layerIds = merged.layers.map(l => l.id);

            // Verify all IDs are unique (no duplicates)
            const uniqueIds = new Set(layerIds);
            expect(uniqueIds.size).toBe(4);

            // Verify NO layer has the original IDs (all cloned with new IDs)
            expect(layerIds).not.toContain('layer_shared');
            expect(layerIds).not.toContain('layer_v1_only');
            expect(layerIds).not.toContain('layer_v2_only');

            // Verify all new IDs follow the pattern layer_timestamp_random
            layerIds.forEach(id => {
                expect(id).toMatch(/^layer_\d+_[a-z0-9]+$/);
            });
        });

        it('should assign sequential z-indices after merge', async () => {
            const version1Data = {
                layers: [
                    { id: 'l1', zIndex: 5 },
                    { id: 'l2', zIndex: 10 }
                ]
            };

            const version2Data = {
                layers: [
                    { id: 'l3', zIndex: 3 },
                    { id: 'l4', zIndex: 8 }
                ]
            };

            const v1 = await addVersion(testSessionId, version1Data);
            const v2 = await addVersion(testSessionId, version2Data);

            const merged = await mergeVersions(testSessionId, v1.id, v2.id, {
                layersFromVersion1: [0, 1],
                layersFromVersion2: [0, 1]
            });

            // Z-indices should be 0, 1, 2, 3 (sequential)
            expect(merged.layers[0].zIndex).toBe(0);
            expect(merged.layers[1].zIndex).toBe(1);
            expect(merged.layers[2].zIndex).toBe(2);
            expect(merged.layers[3].zIndex).toBe(3);
        });

        it('should preserve layer data during cloning', async () => {
            const version1Data = {
                layers: [
                    {
                        id: 'original',
                        name: 'Dragon',
                        imageUrl: 'https://example.com/dragon.png',
                        type: 'subject',
                        visible: true,
                        opacity: 0.85,
                        blendMode: 'multiply',
                        transform: { x: 100, y: 50, rotation: 45 }
                    }
                ]
            };

            const version2Data = {
                layers: [
                    {
                        id: 'other',
                        name: 'Background',
                        imageUrl: 'https://example.com/bg.png'
                    }
                ]
            };

            const v1 = await addVersion(testSessionId, version1Data);
            const v2 = await addVersion(testSessionId, version2Data);

            const merged = await mergeVersions(testSessionId, v1.id, v2.id, {
                layersFromVersion1: [0],
                layersFromVersion2: [0]
            });

            const clonedDragon = merged.layers[0];

            // All properties preserved except id and zIndex
            expect(clonedDragon.id).not.toBe('original'); // New ID
            expect(clonedDragon.name).toBe('Dragon');
            expect(clonedDragon.imageUrl).toBe('https://example.com/dragon.png');
            expect(clonedDragon.type).toBe('subject');
            expect(clonedDragon.visible).toBe(true);
            expect(clonedDragon.opacity).toBe(0.85);
            expect(clonedDragon.blendMode).toBe('multiply');
            expect(clonedDragon.transform).toEqual({ x: 100, y: 50, rotation: 45 });
        });

        it('should merge metadata correctly', async () => {
            const v1 = await addVersion(testSessionId, {
                prompt: 'dragon',
                layers: [{ id: 'l1' }]
            });

            const v2 = await addVersion(testSessionId, {
                prompt: 'lightning',
                layers: [{ id: 'l2' }]
            });

            const merged = await mergeVersions(testSessionId, v1.id, v2.id, {
                layersFromVersion1: [0],
                layersFromVersion2: [0],
                prompt: 'dragon with lightning',
                parameters: { custom: 'value' }
            });

            expect(merged.prompt).toBe('dragon with lightning');
            expect(merged.parameters.custom).toBe('value');
            expect(merged.mergedFrom).toEqual({
                version1: v1.id,
                version2: v2.id,
                mergeOptions: {
                    layersFromVersion1: [0],
                    layersFromVersion2: [0],
                    prompt: 'dragon with lightning',
                    parameters: { custom: 'value' }
                }
            });
        });

        it('should handle empty layer selections', async () => {
            const v1 = await addVersion(testSessionId, {
                layers: [{ id: 'l1' }, { id: 'l2' }]
            });

            const v2 = await addVersion(testSessionId, {
                layers: [{ id: 'l3' }]
            });

            const merged = await mergeVersions(testSessionId, v1.id, v2.id, {
                layersFromVersion1: [],  // No layers from v1
                layersFromVersion2: [0]  // Only first layer from v2
            });

            expect(merged.layers).toHaveLength(1);
            expect(merged.layers[0].zIndex).toBe(0);
        });
    });

    describe('Version Comparison', () => {
        it('should detect differences between versions', async () => {
            const v1 = await addVersion(testSessionId, {
                prompt: 'dragon',
                parameters: { size: 'large' }
            });

            const v2 = await addVersion(testSessionId, {
                prompt: 'phoenix',
                parameters: { size: 'small' }
            });

            const comparison = await compareVersions(testSessionId, v1.id, v2.id);

            expect(comparison.differences.prompt).toBe(true);
            expect(comparison.differences.parameters).toBe(true);
            expect(comparison.similarityScore).toBeLessThan(100);
        });

        it('should calculate similarity score correctly', async () => {
            const baseData = {
                prompt: 'dragon',
                enhancedPrompt: 'detailed dragon',
                parameters: { size: 'large' },
                layers: [{ id: 'l1' }],
                imageUrl: 'url1'
            };

            const v1 = await addVersion(testSessionId, baseData);
            const v2 = await addVersion(testSessionId, { ...baseData }); // Identical

            const comparison = await compareVersions(testSessionId, v1.id, v2.id);

            expect(comparison.similarityScore).toBe(100);
        });
    });

    describe('Version Branching', () => {
        it('should create branch with new session ID', async () => {
            const original = await addVersion(testSessionId, {
                prompt: 'dragon',
                layers: [{ id: 'layer_1' }]
            });

            const branch = await branchFromVersion(testSessionId, original.id);

            expect(branch).toBeTruthy();
            expect(branch.sessionId).toContain('branch');
            expect(branch.sessionId).not.toBe(testSessionId);
            expect(branch.version.branchedFrom.sessionId).toBe(testSessionId);
            expect(branch.version.branchedFrom.versionId).toBe(original.id);
        });
    });

    describe('Edge Cases', () => {
        it('should handle merge with non-existent versions', async () => {
            const result = await mergeVersions(testSessionId, 'fake_id_1', 'fake_id_2');
            expect(result).toBeNull();
        });

        it('should enforce version limit per session', async () => {
            // Add more than MAX_VERSIONS_PER_DESIGN (50)
            for (let i = 0; i < 55; i++) {
                await addVersion(testSessionId, { prompt: `version ${i}` });
            }

            const versions = await getVersions(testSessionId);
            expect(versions.length).toBeLessThanOrEqual(50);
        });

        it('should handle missing layer arrays in merge', async () => {
            const v1 = await addVersion(testSessionId, { prompt: 'no layers' });
            const v2 = await addVersion(testSessionId, { prompt: 'also no layers' });

            const merged = await mergeVersions(testSessionId, v1.id, v2.id, {
                layersFromVersion1: [0], // Try to access non-existent layer
                layersFromVersion2: [0]
            });

            // Should handle gracefully
            expect(merged.layers).toEqual([]);
        });
    });
});

/**
 * Multi-Layer Service Tests
 */

import { describe, it, expect, vi } from 'vitest';
import {
    inferLayerType,
    generateLayerName,
    shouldUseMultiLayer,
    processGenerationResult
} from './multiLayerService';

describe('multiLayerService', () => {
    describe('inferLayerType', () => {
        it('should return "subject" for first image', () => {
            expect(inferLayerType(0)).toBe('subject');
        });

        it('should return "background" for second image', () => {
            expect(inferLayerType(1)).toBe('background');
        });

        it('should return "effect" for third+ images', () => {
            expect(inferLayerType(2)).toBe('effect');
            expect(inferLayerType(3)).toBe('effect');
        });

        it('should use metadata hints when provided', () => {
            const metadata = {
                layerTypes: ['background', 'subject', 'effect']
            };
            expect(inferLayerType(0, metadata)).toBe('background');
            expect(inferLayerType(1, metadata)).toBe('subject');
            expect(inferLayerType(2, metadata)).toBe('effect');
        });
    });

    describe('generateLayerName', () => {
        it('should generate basic names with index', () => {
            expect(generateLayerName('subject', 0)).toBe('Subject 1');
            expect(generateLayerName('background', 1)).toBe('Background 2');
            expect(generateLayerName('effect', 2)).toBe('Effect 3');
        });

        it('should extract key terms from prompt', () => {
            const prompt = 'dragon with lightning and storm clouds';
            const name = generateLayerName('subject', 0, prompt);
            expect(name).toContain('Subject');
            expect(name).toMatch(/dragon|lightning|storm|clouds/);
        });

        it('should handle empty prompt', () => {
            expect(generateLayerName('subject', 0, '')).toBe('Subject 1');
        });
    });

    describe('shouldUseMultiLayer', () => {
        it('should return true for multiple images', () => {
            const result = {
                images: ['url1', 'url2'],
                metadata: {}
            };
            expect(shouldUseMultiLayer(result)).toBe(true);
        });

        it('should return true for RGBA-ready results', () => {
            const result = {
                images: ['url1'],
                metadata: { rgbaReady: true }
            };
            expect(shouldUseMultiLayer(result)).toBe(true);
        });

        it('should return false for single non-RGBA image', () => {
            const result = {
                images: ['url1'],
                metadata: {}
            };
            expect(shouldUseMultiLayer(result)).toBe(false);
        });

        it('should return false for empty results', () => {
            expect(shouldUseMultiLayer({})).toBe(false);
            expect(shouldUseMultiLayer({ images: [] })).toBe(false);
        });
    });

    describe('processGenerationResult', () => {
        it('should process multiple images into layer specs', async () => {
            const result = {
                images: ['url1', 'url2', 'url3'],
                metadata: {
                    prompt: 'dragon with lightning'
                }
            };

            const layerSpecs = await processGenerationResult(result, {
                separateAlpha: false,
                autoDetectAlpha: false
            });

            expect(layerSpecs).toHaveLength(3);
            expect(layerSpecs[0].type).toBe('subject');
            expect(layerSpecs[1].type).toBe('background');
            expect(layerSpecs[2].type).toBe('effect');
        });

        it('should return empty array for no images', async () => {
            const result = { images: [] };
            const layerSpecs = await processGenerationResult(result);
            expect(layerSpecs).toEqual([]);
        });

        it('should handle missing metadata', async () => {
            const result = {
                images: ['url1']
            };

            const layerSpecs = await processGenerationResult(result, {
                separateAlpha: false,
                autoDetectAlpha: false
            });

            expect(layerSpecs).toHaveLength(1);
            expect(layerSpecs[0].type).toBe('subject');
        });
    });
});

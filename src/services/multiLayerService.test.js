/**
 * Multi-Layer Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    inferLayerType,
    generateLayerName,
    shouldUseMultiLayer,
    processGenerationResult,
    separateRGBAChannels,
    hasAlphaChannel
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

    describe('RGBA Channel Separation - Persistence', () => {
        let mockCanvas;
        let mockContext;
        let mockImage;
        let originalFetch;

        beforeEach(() => {
            // Mock canvas and context
            mockContext = {
                drawImage: vi.fn(),
                getImageData: vi.fn(() => ({
                    data: new Uint8ClampedArray(16), // 2x2 RGBA pixels
                    width: 2,
                    height: 2
                })),
                createImageData: vi.fn((w, h) => ({
                    data: new Uint8ClampedArray(w * h * 4),
                    width: w,
                    height: h
                })),
                putImageData: vi.fn()
            };

            mockCanvas = {
                width: 2,
                height: 2,
                getContext: vi.fn(() => mockContext),
                toDataURL: vi.fn((format) => `data:image/png;base64,mock${format}`)
            };

            // Mock document.createElement for canvas
            global.document = {
                createElement: vi.fn(() => mockCanvas)
            };

            // Mock Image constructor
            mockImage = {
                crossOrigin: null,
                src: null,
                width: 2,
                height: 2,
                onload: null,
                onerror: null
            };
            global.Image = function() {
                return mockImage;
            };

            // Mock fetch for upload API
            originalFetch = global.fetch;
            global.fetch = vi.fn((url, options) => {
                if (url.includes('/upload-layer')) {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({
                            url: `/uploads/layers/${Date.now()}.png`,
                            size: 1024,
                            id: 'mock_id'
                        })
                    });
                }
                return originalFetch(url, options);
            });
        });

        afterEach(() => {
            global.fetch = originalFetch;
        });

        it('should return server URLs (not data URLs or object URLs) for RGB and Alpha layers', async () => {
            const imageUrl = 'https://example.com/test.png';

            // Trigger image load
            const separationPromise = separateRGBAChannels(imageUrl);
            setTimeout(() => mockImage.onload?.(), 0);

            const result = await separationPromise;

            // Verify server URLs (persistent and don't bloat storage)
            expect(result.rgbUrl).toMatch(/\/uploads\/layers\/.*\.png$/);
            expect(result.alphaUrl).toMatch(/\/uploads\/layers\/.*\.png$/);

            // Verify NOT data URLs (which bloat localStorage)
            expect(result.rgbUrl).not.toMatch(/^data:image\/png;base64,/);
            expect(result.alphaUrl).not.toMatch(/^data:image\/png;base64,/);

            // Verify NOT object URLs (which are non-persistent)
            expect(result.rgbUrl).not.toMatch(/^blob:/);
            expect(result.alphaUrl).not.toMatch(/^blob:/);

            // Verify upload was called twice (RGB + Alpha)
            expect(global.fetch).toHaveBeenCalledTimes(2);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/upload-layer'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Authorization': expect.stringContaining('Bearer')
                    })
                })
            );
        });

        it('should return URLs that persist across simulated reloads', async () => {
            const imageUrl = 'https://example.com/test.png';

            const separationPromise = separateRGBAChannels(imageUrl);
            setTimeout(() => mockImage.onload?.(), 0);

            const result = await separationPromise;

            // Server URLs are small strings that persist in localStorage
            const rgbServerUrl = result.rgbUrl;
            const alphaServerUrl = result.alphaUrl;

            // Simulate "storing" and "retrieving" (like localStorage persistence)
            const stored = JSON.stringify({ rgbUrl: rgbServerUrl, alphaUrl: alphaServerUrl });
            const retrieved = JSON.parse(stored);

            // URLs should still be valid after serialization
            expect(retrieved.rgbUrl).toBe(rgbServerUrl);
            expect(retrieved.alphaUrl).toBe(alphaServerUrl);
            expect(retrieved.rgbUrl).toMatch(/\/uploads\/layers\//);

            // URLs should be small (not bloated base64)
            expect(retrieved.rgbUrl.length).toBeLessThan(100); // Server URLs are short
        });

        it('should detect alpha channel presence', async () => {
            const imageUrl = 'https://example.com/transparent.png';

            // Mock image data with some transparent pixels
            mockContext.getImageData = vi.fn(() => ({
                data: new Uint8ClampedArray([
                    255, 0, 0, 255,    // Red, opaque
                    0, 255, 0, 128,    // Green, semi-transparent
                    0, 0, 255, 0,      // Blue, fully transparent
                    0, 0, 0, 255       // Black, opaque
                ]),
                width: 2,
                height: 2
            }));

            const hasAlphaPromise = hasAlphaChannel(imageUrl);
            setTimeout(() => mockImage.onload?.(), 0);

            const result = await hasAlphaPromise;
            expect(result).toBe(true);
        });

        it('should return false for fully opaque images', async () => {
            const imageUrl = 'https://example.com/opaque.png';

            // Mock fully opaque image data
            mockContext.getImageData = vi.fn(() => ({
                data: new Uint8ClampedArray([
                    255, 0, 0, 255,    // All pixels fully opaque (alpha = 255)
                    0, 255, 0, 255,
                    0, 0, 255, 255,
                    0, 0, 0, 255
                ]),
                width: 2,
                height: 2
            }));

            const hasAlphaPromise = hasAlphaChannel(imageUrl);
            setTimeout(() => mockImage.onload?.(), 0);

            const result = await hasAlphaPromise;
            expect(result).toBe(false);
        });
    });
});

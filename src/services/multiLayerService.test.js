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
    hasAlphaChannel,
    addMultipleLayers
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

        it('should return false when image fails to load', async () => {
            const imageUrl = 'https://example.com/broken.png';

            const hasAlphaPromise = hasAlphaChannel(imageUrl);
            setTimeout(() => mockImage.onerror?.(new Error('Network error')), 0);

            const result = await hasAlphaPromise;
            expect(result).toBe(false);
        });

        it('should throw when separateRGBAChannels image fails to load', async () => {
            const imageUrl = 'https://example.com/broken.png';

            const separationPromise = separateRGBAChannels(imageUrl);
            setTimeout(() => mockImage.onerror?.(new Error('Network error')), 0);

            await expect(separationPromise).rejects.toThrow('Failed to separate RGBA channels');
        });

        it('should correctly separate RGB and Alpha pixel data', async () => {
            const imageUrl = 'https://example.com/rgba.png';

            // Mock specific pixel data: R=100, G=150, B=200, A=128
            mockContext.getImageData = vi.fn(() => ({
                data: new Uint8ClampedArray([
                    100, 150, 200, 128,  // Semi-transparent pixel
                    255, 0, 0, 0         // Fully transparent red
                ]),
                width: 2,
                height: 1
            }));

            // Track what putImageData receives
            const putCalls = [];
            mockContext.putImageData = vi.fn((imageData) => {
                putCalls.push(new Uint8ClampedArray(imageData.data));
            });

            mockCanvas.width = 2;
            mockCanvas.height = 1;

            const separationPromise = separateRGBAChannels(imageUrl);
            setTimeout(() => mockImage.onload?.(), 0);

            await separationPromise;

            // First putImageData call = RGB layer
            expect(putCalls[0][0]).toBe(100);  // R preserved
            expect(putCalls[0][1]).toBe(150);  // G preserved
            expect(putCalls[0][2]).toBe(200);  // B preserved
            expect(putCalls[0][3]).toBe(255);  // A forced to 255

            // Second putImageData call = Alpha layer (grayscale)
            expect(putCalls[1][0]).toBe(128);  // R = original alpha
            expect(putCalls[1][1]).toBe(128);  // G = original alpha
            expect(putCalls[1][2]).toBe(128);  // B = original alpha
            expect(putCalls[1][3]).toBe(255);  // A forced to 255
        });

        it('should return width and height from separated result', async () => {
            const imageUrl = 'https://example.com/test.png';

            mockImage.width = 100;
            mockImage.height = 50;

            const separationPromise = separateRGBAChannels(imageUrl);
            setTimeout(() => mockImage.onload?.(), 0);

            const result = await separationPromise;
            expect(result.width).toBe(100);
            expect(result.height).toBe(50);
        });
    });

    describe('inferLayerType - edge cases', () => {
        it('should fall back to subject for out-of-bounds metadata index', () => {
            const metadata = { layerTypes: ['background'] };
            // Index 1 exceeds the metadata array, should fall back to "subject"
            expect(inferLayerType(1, metadata)).toBe('subject');
        });

        it('should handle high index values', () => {
            expect(inferLayerType(99)).toBe('effect');
        });
    });

    describe('generateLayerName - edge cases', () => {
        it('should use "Layer" for unknown type', () => {
            expect(generateLayerName('unknown_type', 0)).toBe('Layer 1');
        });

        it('should handle prompt with only short/stop words', () => {
            // All words <= 3 chars or stop words
            expect(generateLayerName('subject', 0, 'the a an or')).toBe('Subject 1');
        });
    });

    describe('shouldUseMultiLayer - edge cases', () => {
        it('should return false for null input', () => {
            expect(shouldUseMultiLayer(null)).toBe(false);
        });

        it('should return false for undefined input', () => {
            expect(shouldUseMultiLayer(undefined)).toBe(false);
        });
    });

    describe('addMultipleLayers', () => {
        it('should add layers in order: background, subject, effect', async () => {
            const addOrder = [];
            const mockAddLayerFn = vi.fn(async (url, type) => {
                addOrder.push(type);
                return { imageUrl: url, type, name: type, metadata: null };
            });

            const layerSpecs = [
                { imageUrl: 'url1', type: 'effect', name: 'Effect 1', metadata: { source: 'direct' } },
                { imageUrl: 'url2', type: 'subject', name: 'Subject 1', metadata: { source: 'direct' } },
                { imageUrl: 'url3', type: 'background', name: 'BG 1', metadata: { source: 'direct' } }
            ];

            const result = await addMultipleLayers(layerSpecs, mockAddLayerFn);

            // Should be reordered: background first, then subject, then effect
            expect(addOrder).toEqual(['background', 'subject', 'effect']);
            expect(result).toHaveLength(3);
        });

        it('should apply custom names and metadata to created layers', async () => {
            const mockAddLayerFn = vi.fn(async (url, type) => ({
                imageUrl: url,
                type,
                name: 'default',
                metadata: null
            }));

            const layerSpecs = [
                { imageUrl: 'url1', type: 'subject', name: 'Dragon Main', metadata: { source: 'rgba_rgb' } }
            ];

            const result = await addMultipleLayers(layerSpecs, mockAddLayerFn);

            expect(result[0].name).toBe('Dragon Main');
            expect(result[0].metadata).toEqual({ source: 'rgba_rgb' });
        });

        it('should continue adding layers if one fails', async () => {
            let callCount = 0;
            const mockAddLayerFn = vi.fn(async (url, type) => {
                callCount++;
                if (callCount === 1) throw new Error('Failed to add');
                return { imageUrl: url, type, name: type, metadata: null };
            });

            const layerSpecs = [
                { imageUrl: 'url1', type: 'background', name: 'BG' },
                { imageUrl: 'url2', type: 'subject', name: 'Subj' }
            ];

            const result = await addMultipleLayers(layerSpecs, mockAddLayerFn);

            // First fails, second succeeds
            expect(result).toHaveLength(1);
            expect(mockAddLayerFn).toHaveBeenCalledTimes(2);
        });

        it('should handle empty layer specs', async () => {
            const mockAddLayerFn = vi.fn();
            const result = await addMultipleLayers([], mockAddLayerFn);

            expect(result).toEqual([]);
            expect(mockAddLayerFn).not.toHaveBeenCalled();
        });
    });

    describe('processGenerationResult - RGBA branch', () => {
        let mockCanvas;
        let mockContext;
        let mockImage;
        let originalFetch;

        beforeEach(() => {
            mockContext = {
                drawImage: vi.fn(),
                getImageData: vi.fn(() => ({
                    data: new Uint8ClampedArray([
                        255, 0, 0, 128,    // Semi-transparent (has alpha)
                        0, 255, 0, 128,
                        0, 0, 255, 128,
                        0, 0, 0, 128
                    ]),
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
                toDataURL: vi.fn(() => 'data:image/png;base64,mock')
            };

            global.document = {
                createElement: vi.fn(() => mockCanvas)
            };

            mockImage = {
                crossOrigin: null,
                src: null,
                width: 2,
                height: 2,
                onload: null,
                onerror: null
            };
            global.Image = function() {
                const img = { ...mockImage };
                // Auto-trigger onload after src is set
                const originalDescriptor = Object.getOwnPropertyDescriptor(mockImage, 'src');
                Object.defineProperty(img, 'src', {
                    set(val) {
                        img._src = val;
                        setTimeout(() => img.onload?.(), 0);
                    },
                    get() { return img._src; }
                });
                return img;
            };

            originalFetch = global.fetch;
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        url: `/uploads/layers/${Date.now()}.png`,
                        size: 1024,
                        id: 'mock_id'
                    })
                })
            );
        });

        afterEach(() => {
            global.fetch = originalFetch;
        });

        it('should separate RGBA when rgbaReady and separateAlpha are true', async () => {
            const result = {
                images: ['https://example.com/rgba.png'],
                metadata: {
                    rgbaReady: true,
                    prompt: 'dragon design'
                }
            };

            const layerSpecs = await processGenerationResult(result, {
                separateAlpha: true,
                autoDetectAlpha: true
            });

            // Should produce 2 layers: RGB + Alpha mask
            expect(layerSpecs).toHaveLength(2);
            expect(layerSpecs[0].metadata.source).toBe('rgba_rgb');
            expect(layerSpecs[1].metadata.source).toBe('rgba_alpha');
            expect(layerSpecs[1].type).toBe('effect');
            expect(layerSpecs[1].name).toBe('Alpha Mask 1');
        });

        it('should fall back to direct layer when RGBA separation fails', async () => {
            // Make getImageData throw to simulate failure during hasAlphaChannel
            mockContext.getImageData = vi.fn(() => { throw new Error('Canvas tainted'); });

            const result = {
                images: ['https://example.com/tainted.png'],
                metadata: { rgbaReady: true }
            };

            const layerSpecs = await processGenerationResult(result, {
                separateAlpha: true,
                autoDetectAlpha: true
            });

            // Should fall back to adding as direct layer
            expect(layerSpecs).toHaveLength(1);
            expect(layerSpecs[0].metadata.source).toBe('direct');
        });
    });
});

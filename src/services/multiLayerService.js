/**
 * Multi-Layer Service
 *
 * Handles decomposition of multi-image results and RGBA channel separation
 * for advanced tattoo generation workflows.
 */

const PROXY_URL = import.meta.env.VITE_PROXY_URL || 'http://127.0.0.1:3001/api';
const AUTH_TOKEN = import.meta.env.VITE_FRONTEND_AUTH_TOKEN;

/**
 * Upload layer image to backend for persistent storage
 *
 * @param {string} dataUrl - Base64 data URL
 * @param {string} filename - Filename hint
 * @returns {Promise<string>} Persistent URL
 */
async function uploadLayer(dataUrl, filename) {
    try {
        const response = await fetch(`${PROXY_URL}/v1/upload-layer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`
            },
            body: JSON.stringify({
                imageData: dataUrl,
                filename
            })
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        const data = await response.json();

        // Convert relative URL to absolute
        const url = data.url.startsWith('http')
            ? data.url
            : `${PROXY_URL.replace('/api', '')}${data.url}`;

        return url;
    } catch (error) {
        console.error('[MultiLayer] Upload failed:', error);
        throw error;
    }
}

/**
 * Determine layer type based on image index and metadata
 *
 * Strategy:
 * - First image: usually the main subject
 * - Subsequent images: backgrounds, effects, or variations
 * - Can be overridden by metadata hints from the model
 *
 * @param {number} index - Image index in the result array
 * @param {Object} metadata - Generation metadata
 * @returns {string} Layer type: 'subject', 'background', or 'effect'
 */
export function inferLayerType(index, metadata = {}) {
    // Check for explicit layer type hints in metadata
    if (metadata.layerTypes && Array.isArray(metadata.layerTypes)) {
        return metadata.layerTypes[index] || 'subject';
    }

    // Default inference based on index
    if (index === 0) {
        return 'subject'; // Primary image is usually the subject
    } else if (index === 1) {
        return 'background'; // Second image often provides background/context
    } else {
        return 'effect'; // Additional images are effects/overlays
    }
}

/**
 * Generate descriptive layer name based on prompt and type
 *
 * @param {string} type - Layer type
 * @param {number} index - Image index
 * @param {string} prompt - Generation prompt for context
 * @returns {string} Descriptive layer name
 */
export function generateLayerName(type, index, prompt = '') {
    const typeLabels = {
        subject: 'Subject',
        background: 'Background',
        effect: 'Effect'
    };

    // Extract key terms from prompt for more descriptive names
    const terms = extractKeyTerms(prompt);
    const baseName = typeLabels[type] || 'Layer';

    if (terms.length > 0 && index < terms.length) {
        return `${baseName} (${terms[index]})`;
    }

    return `${baseName} ${index + 1}`;
}

/**
 * Extract key visual terms from prompt for layer naming
 *
 * @param {string} prompt - Generation prompt
 * @returns {string[]} Array of key terms
 */
function extractKeyTerms(prompt) {
    if (!prompt || typeof prompt !== 'string') return [];

    // Remove common filler words and extract nouns/adjectives
    const stopWords = ['the', 'a', 'an', 'with', 'and', 'or', 'in', 'on', 'at', 'to', 'for'];
    const words = prompt
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.includes(word));

    // Return first 4 unique terms
    return [...new Set(words)].slice(0, 4);
}

/**
 * Check if an image URL points to an RGBA image
 *
 * Note: This is a heuristic check. True RGBA detection requires loading the image
 * and checking canvas pixel data.
 *
 * @param {string} imageUrl - Image URL
 * @returns {Promise<boolean>} True if image has alpha channel
 */
export async function hasAlphaChannel(imageUrl) {
    try {
        // Create an off-screen canvas to check pixel data
        const img = new Image();
        img.crossOrigin = 'anonymous';

        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = imageUrl;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Check if any pixel has alpha < 255 (transparent/semi-transparent)
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] < 255) {
                return true; // Found transparency
            }
        }

        return false; // Fully opaque
    } catch (error) {
        console.warn('[MultiLayer] Failed to check alpha channel:', error);
        return false; // Assume no alpha on error
    }
}

/**
 * Separate RGBA image into RGB and Alpha layers
 *
 * Creates two separate images:
 * 1. RGB layer: The color data
 * 2. Alpha layer: The transparency mask as a grayscale image
 *
 * @param {string} imageUrl - Source image URL with alpha channel
 * @returns {Promise<Object>} Object with rgbUrl and alphaUrl
 */
export async function separateRGBAChannels(imageUrl) {
    try {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = imageUrl;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Create RGB layer (fully opaque)
        const rgbData = ctx.createImageData(canvas.width, canvas.height);
        for (let i = 0; i < data.length; i += 4) {
            rgbData.data[i] = data[i];         // R
            rgbData.data[i + 1] = data[i + 1]; // G
            rgbData.data[i + 2] = data[i + 2]; // B
            rgbData.data[i + 3] = 255;         // Full opacity
        }

        // Create Alpha layer (grayscale based on alpha channel)
        const alphaData = ctx.createImageData(canvas.width, canvas.height);
        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            alphaData.data[i] = alpha;     // R = alpha
            alphaData.data[i + 1] = alpha; // G = alpha
            alphaData.data[i + 2] = alpha; // B = alpha
            alphaData.data[i + 3] = 255;   // Full opacity
        }

        // Convert to data URLs temporarily
        ctx.putImageData(rgbData, 0, 0);
        const rgbDataUrl = canvas.toDataURL('image/png');

        ctx.putImageData(alphaData, 0, 0);
        const alphaDataUrl = canvas.toDataURL('image/png');

        // Upload to backend for persistent storage (avoids localStorage overflow)
        const timestamp = Date.now();
        const rgbUrl = await uploadLayer(rgbDataUrl, `rgb_${timestamp}.png`);
        const alphaUrl = await uploadLayer(alphaDataUrl, `alpha_${timestamp}.png`);

        return {
            rgbUrl,
            alphaUrl,
            width: canvas.width,
            height: canvas.height
        };
    } catch (error) {
        console.error('[MultiLayer] RGBA separation failed:', error);
        throw new Error('Failed to separate RGBA channels');
    }
}

/**
 * Process generation result and create layer specifications
 *
 * Main entry point for multi-layer handling. Analyzes the generation result
 * and returns an array of layer specifications ready to be added to the canvas.
 *
 * @param {Object} result - Generation result from replicateService
 * @param {Object} options - Processing options
 * @param {boolean} options.separateAlpha - Whether to separate alpha channels
 * @param {boolean} options.autoDetectAlpha - Auto-detect and separate if alpha present
 * @returns {Promise<Array>} Array of layer specifications
 */
export async function processGenerationResult(result, options = {}) {
    const {
        separateAlpha = false,
        autoDetectAlpha = true
    } = options;

    if (!result || !result.images || result.images.length === 0) {
        console.warn('[MultiLayer] No images in generation result');
        return [];
    }

    const layerSpecs = [];
    const metadata = result.metadata || {};
    const prompt = metadata.prompt || result.userInput?.subject || '';

    // Process each image in the result
    for (let i = 0; i < result.images.length; i++) {
        const imageUrl = result.images[i];
        const layerType = inferLayerType(i, metadata);

        // Check if we should process RGBA
        const shouldProcessRGBA = metadata.rgbaReady && (separateAlpha || autoDetectAlpha);

        if (shouldProcessRGBA) {
            try {
                const hasAlpha = await hasAlphaChannel(imageUrl);

                if (hasAlpha && separateAlpha) {
                    // Separate into RGB and Alpha layers
                    console.log(`[MultiLayer] Separating RGBA for image ${i + 1}`);
                    const separated = await separateRGBAChannels(imageUrl);

                    // Add RGB layer
                    layerSpecs.push({
                        imageUrl: separated.rgbUrl,
                        type: layerType,
                        name: generateLayerName(layerType, i, prompt),
                        metadata: {
                            source: 'rgba_rgb',
                            originalIndex: i,
                            width: separated.width,
                            height: separated.height
                        }
                    });

                    // Add Alpha layer as effect
                    layerSpecs.push({
                        imageUrl: separated.alphaUrl,
                        type: 'effect',
                        name: `Alpha Mask ${i + 1}`,
                        metadata: {
                            source: 'rgba_alpha',
                            originalIndex: i,
                            width: separated.width,
                            height: separated.height
                        }
                    });

                    continue; // Skip adding the original composite image
                }
            } catch (error) {
                console.warn(`[MultiLayer] RGBA processing failed for image ${i + 1}:`, error);
                // Fall through to add the original image
            }
        }

        // Add the image as a single layer
        layerSpecs.push({
            imageUrl,
            type: layerType,
            name: generateLayerName(layerType, i, prompt),
            metadata: {
                source: 'direct',
                originalIndex: i,
                hasAlpha: false // We didn't separate it
            }
        });
    }

    console.log(`[MultiLayer] Processed ${result.images.length} images into ${layerSpecs.length} layers`);
    return layerSpecs;
}

/**
 * Batch add layers to canvas using layer management hook
 *
 * Helper function to add multiple layers in the correct order.
 *
 * @param {Array} layerSpecs - Array of layer specifications from processGenerationResult
 * @param {Function} addLayerFn - addLayer function from useLayerManagement hook
 * @returns {Promise<Array>} Array of created layer objects
 */
export async function addMultipleLayers(layerSpecs, addLayerFn) {
    const createdLayers = [];

    // Add layers in order: backgrounds first, then subjects, then effects
    const orderedSpecs = [...layerSpecs].sort((a, b) => {
        const order = { background: 0, subject: 1, effect: 2 };
        return order[a.type] - order[b.type];
    });

    for (const spec of orderedSpecs) {
        try {
            const layer = await addLayerFn(spec.imageUrl, spec.type);

            // Apply custom name if provided
            if (spec.name && layer.name !== spec.name) {
                layer.name = spec.name;
            }

            // Store metadata
            if (spec.metadata) {
                layer.metadata = spec.metadata;
            }

            createdLayers.push(layer);
        } catch (error) {
            console.error('[MultiLayer] Failed to add layer:', error);
        }
    }

    return createdLayers;
}

/**
 * Check if generation result should use multi-layer processing
 *
 * @param {Object} result - Generation result
 * @returns {boolean} True if multi-layer processing is recommended
 */
export function shouldUseMultiLayer(result) {
    if (!result || !result.images) return false;

    // Use multi-layer if:
    // 1. Multiple images returned
    if (result.images.length > 1) return true;

    // 2. Model supports RGBA and it's enabled
    if (result.metadata?.rgbaReady) return true;

    return false;
}

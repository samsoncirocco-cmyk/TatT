/**
 * Vertex AI Service - Unified Interface
 * 
 * Provides access to all Vertex AI services:
 * - Gemini 2.0 Flash: AI Council (FREE - 60 RPM)
 * - Imagen 3: Image generation
 * - Vision API: Layer decomposition
 * - Multimodal Embeddings: Artist matching
 */

import { VertexAI } from '@google-cloud/vertexai';
import { uploadToGCS } from './gcs-service.js';

// Initialize Vertex AI
const projectId = process.env.GCP_PROJECT_ID || 'tatt-pro';
const location = process.env.GCP_REGION || 'us-central1';

const vertexAI = new VertexAI({
    project: projectId,
    location: location
});

// Model configurations
const MODELS = {
    gemini: 'gemini-2.0-flash-exp',
    imagen: 'imagen-3.0-generate-001',
    vision: 'imagetext@001',
    embeddings: 'multimodalembedding@001'
};

/**
 * Gemini AI Council - Prompt Enhancement
 * FREE tier: 60 requests per minute
 * 
 * @param {Object} options - Enhancement options
 * @param {string} options.userIdea - User's tattoo idea
 * @param {string} options.style - Tattoo style
 * @param {string} options.bodyPart - Body placement
 * @param {boolean} options.isStencilMode - Stencil mode flag
 * @returns {Promise<Object>} Enhanced prompts
 */
export async function enhancePromptWithGemini({ userIdea, style, bodyPart, isStencilMode = false }) {
    try {
        const model = vertexAI.getGenerativeModel({ model: MODELS.gemini });

        const systemPrompt = `You are an expert tattoo design consultant. Your role is to enhance user ideas into detailed, professional tattoo prompts.

Style: ${style}
Body Part: ${bodyPart}
Stencil Mode: ${isStencilMode ? 'Yes (line art only)' : 'No (full color)'}

Generate THREE versions of the prompt:
1. SIMPLE: Basic description (1 sentence)
2. DETAILED: Rich description with composition details (2-3 sentences)
3. ULTRA: Comprehensive prompt with anatomical flow, character details, and technical specifications (4-5 sentences)

Also generate a NEGATIVE PROMPT to avoid unwanted elements.

Return as JSON:
{
  "simple": "...",
  "detailed": "...",
  "ultra": "...",
  "negativePrompt": "..."
}`;

        const prompt = `${systemPrompt}\n\nUser Idea: ${userIdea}`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // Parse JSON response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse Gemini response');
        }

        const prompts = JSON.parse(jsonMatch[0]);

        console.log('[Vertex AI Gemini] Prompt enhancement complete');

        return {
            prompts: {
                simple: prompts.simple,
                detailed: prompts.detailed,
                ultra: prompts.ultra
            },
            negativePrompt: prompts.negativePrompt,
            metadata: {
                model: MODELS.gemini,
                userIdea,
                style,
                bodyPart,
                isStencilMode,
                generatedAt: new Date().toISOString()
            }
        };

    } catch (error) {
        console.error('[Vertex AI Gemini] Enhancement failed:', error);
        throw new Error(`Gemini enhancement failed: ${error.message}`);
    }
}

/**
 * Imagen 3 - Image Generation
 * Cost: ~$0.02 per image
 * 
 * @param {Object} options - Generation options
 * @param {string} options.prompt - Enhanced prompt
 * @param {string} options.negativePrompt - Negative prompt
 * @param {number} options.numImages - Number of images (1-4)
 * @param {string} options.aspectRatio - Aspect ratio (1:1, 9:16, 16:9)
 * @returns {Promise<Object>} Generated images
 */
export async function generateWithImagen({ prompt, negativePrompt, numImages = 4, aspectRatio = '1:1' }) {
    try {
        // Note: Imagen 3 API is different from Gemini
        // Using the prediction API endpoint
        const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${MODELS.imagen}:predict`;

        const requestBody = {
            instances: [
                {
                    prompt: prompt
                }
            ],
            parameters: {
                sampleCount: numImages,
                aspectRatio: aspectRatio,
                negativePrompt: negativePrompt,
                safetySetting: 'block_only_high',
                personGeneration: 'allow_adult'
            }
        };

        // Get access token
        const { GoogleAuth } = await import('google-auth-library');
        const auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Imagen API error: ${response.status} - ${error}`);
        }

        const data = await response.json();

        // Extract base64 images from predictions
        const images = data.predictions.map(pred => {
            const base64Image = pred.bytesBase64Encoded;
            return `data:image/png;base64,${base64Image}`;
        });

        console.log(`[Vertex AI Imagen] Generated ${images.length} images`);

        return {
            success: true,
            images: images,
            metadata: {
                model: MODELS.imagen,
                prompt: prompt,
                negativePrompt: negativePrompt,
                numImages: images.length,
                aspectRatio: aspectRatio,
                generatedAt: new Date().toISOString()
            }
        };

    } catch (error) {
        console.error('[Vertex AI Imagen] Generation failed:', error);
        throw new Error(`Imagen generation failed: ${error.message}`);
    }
}

/**
 * Vision API - Layer Decomposition
 * Segments image into subject, background, and effects
 * 
 * @param {string} imageUrl - GCS URL or base64 image
 * @returns {Promise<Object>} Segmented layers
 */
export async function decomposeImageLayers(imageUrl) {
    try {
        // Vision API for image segmentation
        const { ImageAnnotatorClient } = await import('@google-cloud/vision');
        const client = new ImageAnnotatorClient();

        const [result] = await client.objectLocalization(imageUrl);
        const objects = result.localizedObjectAnnotations;

        console.log(`[Vertex AI Vision] Detected ${objects.length} objects`);

        // Group objects into layers
        const layers = {
            subject: [],
            background: [],
            effect: []
        };

        objects.forEach(obj => {
            const confidence = obj.score;
            const name = obj.name.toLowerCase();

            // Classify objects into layers based on name and confidence
            if (confidence > 0.8) {
                if (name.includes('person') || name.includes('animal') || name.includes('face')) {
                    layers.subject.push(obj);
                } else if (name.includes('background') || name.includes('sky') || name.includes('ground')) {
                    layers.background.push(obj);
                } else {
                    layers.effect.push(obj);
                }
            }
        });

        return {
            success: true,
            layers: layers,
            metadata: {
                totalObjects: objects.length,
                subjectCount: layers.subject.length,
                backgroundCount: layers.background.length,
                effectCount: layers.effect.length,
                processedAt: new Date().toISOString()
            }
        };

    } catch (error) {
        console.error('[Vertex AI Vision] Decomposition failed:', error);
        throw new Error(`Vision decomposition failed: ${error.message}`);
    }
}

/**
 * Generate Multimodal Embeddings
 * For artist portfolio matching
 * 
 * @param {string[]} imageUrls - Array of portfolio image URLs
 * @returns {Promise<number[]>} 4096-dimensional embedding vector
 */
export async function generateEmbedding(imageUrls) {
    try {
        const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${MODELS.embeddings}:predict`;

        const hasGcsConfig = Boolean(process.env.GCS_BUCKET_NAME || process.env.GCS_BUCKET);

        function parseDataUrl(dataUrl) {
            const match = dataUrl.match(/^data:(.+?);base64,(.*)$/);
            if (!match) {
                throw new Error('Invalid data URL format');
            }
            return {
                contentType: match[1],
                base64: match[2]
            };
        }

        function extensionFromContentType(contentType) {
            if (!contentType) return 'png';
            if (contentType.includes('jpeg')) return 'jpg';
            if (contentType.includes('png')) return 'png';
            if (contentType.includes('webp')) return 'webp';
            if (contentType.includes('gif')) return 'gif';
            return 'img';
        }

        async function fetchImageBuffer(url) {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status}`);
            }
            const buffer = Buffer.from(await response.arrayBuffer());
            const contentType = response.headers.get('content-type') || 'image/jpeg';
            return { buffer, contentType };
        }

        async function uploadForEmbedding(buffer, contentType, index) {
            if (!hasGcsConfig) return null;
            const ext = extensionFromContentType(contentType);
            const destinationPath = `embeddings/${Date.now()}_${index}.${ext}`;
            const upload = await uploadToGCS(buffer, destinationPath, {
                contentType,
                metadata: {
                    type: 'embedding'
                }
            });
            return upload.gcsPath || null;
        }

        // Convert all URLs to appropriate format
        const instances = await Promise.all(imageUrls.map(async (url, index) => {
            if (url.startsWith('gs://')) {
                return { image: { gcsUri: url } };
            }

            let contentType = 'image/png';
            let base64 = null;
            let buffer = null;

            if (url.startsWith('data:')) {
                const parsed = parseDataUrl(url);
                contentType = parsed.contentType || contentType;
                base64 = parsed.base64;
                buffer = Buffer.from(base64, 'base64');
            } else {
                console.log(`[Vertex AI Embeddings] Fetching ${url.substring(0, 60)}...`);
                const fetched = await fetchImageBuffer(url);
                buffer = fetched.buffer;
                contentType = fetched.contentType || contentType;
                base64 = buffer.toString('base64');
            }

            const gcsUri = await uploadForEmbedding(buffer, contentType, index);
            if (gcsUri) {
                console.log(`[Vertex AI Embeddings] Uploaded image to ${gcsUri}`);
                return { image: { gcsUri } };
            }

            return { image: { bytesBase64Encoded: base64, mimeType: contentType } };
        }));

        const requestBody = { instances };

        const { GoogleAuth } = await import('google-auth-library');
        const auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Embeddings API error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        const embedding = data.predictions[0].imageEmbedding;

        console.log(`[Vertex AI Embeddings] Generated ${embedding.length}-dimensional vector`);

        return embedding;

    } catch (error) {
        console.error('[Vertex AI Embeddings] Generation failed:', error);
        throw new Error(`Embedding generation failed: ${error.message}`);
    }
}

/**
 * Health check for Vertex AI services
 */
export async function checkVertexAIHealth() {
    try {
        const model = vertexAI.getGenerativeModel({ model: MODELS.gemini });
        const result = await model.generateContent('Test');

        return {
            healthy: true,
            project: projectId,
            location: location,
            models: MODELS,
            geminiAvailable: true
        };

    } catch (error) {
        return {
            healthy: false,
            error: error.message,
            project: projectId,
            location: location
        };
    }
}

export default {
    enhancePromptWithGemini,
    generateWithImagen,
    decomposeImageLayers,
    generateEmbedding,
    checkVertexAIHealth,
    MODELS
};

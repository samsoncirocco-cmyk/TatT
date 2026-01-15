/**
 * Vertex AI Integration Wrapper for Council Service
 * 
 * Provides a drop-in replacement for OpenRouter using Vertex AI Gemini 2.0 Flash.
 * This is a FREE alternative (60 RPM) with better context window (1M tokens).
 */

import { enhancePromptWithGemini } from './vertex-ai-service.js';

/**
 * Check if Vertex AI is configured
 */
export function isVertexAIConfigured() {
    const projectId = import.meta.env.VITE_VERTEX_AI_PROJECT_ID || import.meta.env.VITE_GCP_PROJECT_ID;
    const credPath = import.meta.env.GOOGLE_APPLICATION_CREDENTIALS;

    return Boolean(projectId && (credPath || typeof window !== 'undefined'));
}

/**
 * Enhance prompt using Vertex AI Gemini (FREE!)
 * 
 * Drop-in replacement for OpenRouter council enhancement.
 * Uses Gemini 2.0 Flash with 1M token context window.
 */
export async function enhancePromptWithVertexAI({
    userIdea,
    style = 'traditional',
    bodyPart = 'forearm',
    onDiscussionUpdate = null,
    isStencilMode = false
}) {
    console.log('[VertexAI Council] Enhancing prompt with Gemini 2.0 Flash');

    // Simulate discussion updates if callback provided
    if (onDiscussionUpdate) {
        setTimeout(() => onDiscussionUpdate('Gemini AI: Analyzing your tattoo concept...'), 300);
        setTimeout(() => onDiscussionUpdate('Gemini AI: Considering style and placement...'), 800);
        setTimeout(() => onDiscussionUpdate('Gemini AI: Generating detailed prompts...'), 1400);
    }

    try {
        const result = await enhancePromptWithGemini({
            userIdea,
            style,
            bodyPart,
            isStencilMode
        });

        // Format to match council service expected output
        return {
            prompts: result.prompts,
            negativePrompt: result.negativePrompt,
            metadata: {
                ...result.metadata,
                provider: 'vertex-ai',
                model: 'gemini-2.0-flash-exp',
                cost: 0, // FREE!
                enhancementTime: result.metadata.enhancementTime || 0
            }
        };

    } catch (error) {
        console.error('[VertexAI Council] Enhancement failed:', error);
        throw error;
    }
}

export default {
    isVertexAIConfigured,
    enhancePromptWithVertexAI
};

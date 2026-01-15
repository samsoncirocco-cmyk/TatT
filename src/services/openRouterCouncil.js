/**
 * OpenRouter Council Service
 *
 * Uses OpenRouter API to power the LLM Council with real models
 * Supports multiple models for diverse "council member" perspectives
 */

import { COUNCIL_SKILL_PACK } from '../config/councilSkillPack';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Council "members" - different models for different perspectives
const COUNCIL_MEMBERS = {
    creative: {
        model: 'anthropic/claude-3.5-sonnet',
        role: 'Creative Director',
        focus: 'Artistic vision, composition, and aesthetic appeal'
    },
    technical: {
        model: 'openai/gpt-4-turbo',
        role: 'Technical Expert',
        focus: 'Tattoo-specific technical details and feasibility'
    },
    style: {
        model: 'google/gemini-pro-1.5',
        role: 'Style Specialist',
        focus: 'Style authenticity and cultural accuracy'
    }
};

function buildCouncilSystemPrompt({ bodyPart, isStencilMode }) {
    const flowToken = COUNCIL_SKILL_PACK.anatomicalFlow[bodyPart] || '';
    const stencilRule = isStencilMode
        ? 'STENCIL INTEGRITY: prioritize binary line-art and avoid gradients or soft shading.'
        : 'STENCIL INTEGRITY: only apply stencil rules when requested.';

    return [
        'You are a Senior Tattoo Architect on the TatT AI Council.',
        'Your goal is to produce elite, tattoo-ready prompts.',
        `POSITIONAL ANCHORING: ${COUNCIL_SKILL_PACK.positionalInstructions}`,
        `ANATOMICAL FLOW: ${flowToken || 'Use body-part appropriate flow guidance.'}`,
        `AESTHETIC ANCHORS: ${COUNCIL_SKILL_PACK.aestheticAnchors}`,
        stencilRule
    ].join('\n');
}

/**
 * Call OpenRouter API with a specific model
 */
async function callOpenRouter(model, systemPrompt, userPrompt) {
    if (!OPENROUTER_API_KEY) {
        throw new Error('VITE_OPENROUTER_API_KEY not configured');
    }

    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'TatTester - AI Tattoo Design'
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 500
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenRouter API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

/**
 * Generate enhanced prompts using OpenRouter council
 */
export async function enhancePromptWithOpenRouter({
    userIdea,
    style = 'traditional',
    bodyPart = 'forearm',
    onDiscussionUpdate = null,
    isStencilMode = false
}) {
    const startTime = performance.now();
    const councilSystemPrompt = buildCouncilSystemPrompt({ bodyPart, isStencilMode });
    const flowToken = COUNCIL_SKILL_PACK.anatomicalFlow[bodyPart] || '';
    const stencilHint = isStencilMode ? 'Stencil mode: prioritize clean, high-contrast linework.' : '';

    try {
        // Step 1: Creative Director - Generate base enhanced prompt
        if (onDiscussionUpdate) {
            onDiscussionUpdate('Creative Director: Analyzing artistic vision...');
        }

        const creativePrompt = await callOpenRouter(
            COUNCIL_MEMBERS.creative.model,
            `${councilSystemPrompt}\nYou are a Creative Director specializing in tattoo design. Your role is to enhance user ideas into vivid, artistic prompts for AI image generation.`,
            `Enhance this tattoo idea into a detailed prompt for ${style} style tattoo on ${bodyPart}:
      
User idea: "${userIdea}"
Flow guidance: "${flowToken}"
${stencilHint}

Generate THREE versions:
1. SIMPLE (1 sentence): Clean, minimal enhancement
2. DETAILED (2-3 sentences): Rich artistic details
3. ULTRA (4-5 sentences): Photorealistic composition guide

Return as JSON:
{
  "simple": "...",
  "detailed": "...",
  "ultra": "..."
}`
        );

        // Parse creative response
        const creativeResult = JSON.parse(creativePrompt);

        // Step 2: Technical Expert - Refine for tattoo feasibility
        if (onDiscussionUpdate) {
            onDiscussionUpdate('Technical Expert: Refining for tattoo execution...');
        }

        const technicalPrompt = await callOpenRouter(
            COUNCIL_MEMBERS.technical.model,
            `${councilSystemPrompt}\nYou are a Technical Expert in tattoo design. Your role is to ensure prompts are technically feasible and optimized for actual tattooing.`,
            `Review and refine this DETAILED prompt for technical accuracy:

"${creativeResult.detailed}"

Consider:
- Line weight and detail level for ${bodyPart} placement
- Color saturation and contrast
- Skin tone compatibility
- Aging and longevity

Return the refined prompt as plain text (not JSON).`
        );

        // Step 3: Style Specialist - Ensure style authenticity
        if (onDiscussionUpdate) {
            onDiscussionUpdate('Style Specialist: Ensuring style authenticity...');
        }

        const stylePrompt = await callOpenRouter(
            COUNCIL_MEMBERS.style.model,
            `${councilSystemPrompt}\nYou are a Style Specialist with deep knowledge of tattoo styles and cultural traditions. Your role is to ensure style authenticity.`,
            `Review this ULTRA prompt for ${style} style authenticity:

"${creativeResult.ultra}"

Enhance it with:
- Style-specific techniques and characteristics
- Cultural authenticity (if applicable)
- Traditional vs modern interpretations
- Signature elements of ${style} style

Return the enhanced prompt as plain text (not JSON).`
        );

        // Step 4: Generate negative prompt
        const negativePrompt = await callOpenRouter(
            COUNCIL_MEMBERS.technical.model,
            `${councilSystemPrompt}\nYou are a Technical Expert. Generate a negative prompt (things to avoid) for tattoo image generation.`,
            `For this tattoo idea: "${userIdea}"

Generate a negative prompt listing things to AVOID in the image generation. Focus on:
- Technical flaws (blurry, distorted, low quality)
- Inappropriate elements for tattoos
- Style-specific things to avoid

Return as a comma-separated list.`
        );

        const enhancementTime = performance.now() - startTime;

        return {
            prompts: {
                simple: creativeResult.simple,
                detailed: technicalPrompt.trim(),
                ultra: stylePrompt.trim()
            },
            negativePrompt: negativePrompt.trim(),
            metadata: {
                userIdea,
                style,
                bodyPart,
                generatedAt: new Date().toISOString(),
                enhancementTime,
                councilMembers: Object.keys(COUNCIL_MEMBERS).map(key => COUNCIL_MEMBERS[key].role),
                provider: 'openrouter'
            }
        };

    } catch (error) {
        console.error('[OpenRouter Council] Enhancement failed:', error);
        throw error;
    }
}

/**
 * Check if OpenRouter is configured
 */
export function isOpenRouterConfigured() {
    return !!OPENROUTER_API_KEY;
}

/**
 * Get estimated cost for council enhancement
 * (OpenRouter pricing varies by model)
 */
export function getEstimatedCost() {
    // Rough estimate: ~$0.01-0.03 per enhancement
    // Actual cost depends on models used and token count
    return {
        min: 0.01,
        max: 0.03,
        currency: 'USD'
    };
}

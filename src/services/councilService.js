/**
 * LLM Council API Service
 *
 * Integrates with the LLM Council backend to enhance tattoo design prompts.
 * Uses the council's collective intelligence to generate rich, detailed prompts
 * from simple user ideas.
 *
 * Features:
 * - Prompt enhancement (Simple, Detailed, Ultra levels)
 * - Negative prompt generation
 * - Real-time discussion updates (optional)
 * - Style-aware prompt generation
 * - Placement-aware composition suggestions
 */

// Import character database
import { buildCharacterMap, getAllCharacterNames } from '../config/characterDatabase.js';

// Import model selection utilities
import {
  selectModelWithFallback,
  getModelPromptEnhancements
} from '../utils/styleModelMapping.js';

// Council API configuration
const COUNCIL_API_URL = import.meta.env.VITE_COUNCIL_API_URL || 'http://localhost:8001/api';

// Demo mode for testing without council backend
const DEMO_MODE = import.meta.env.VITE_COUNCIL_DEMO_MODE === 'true';

// Build character lookup map on service initialization (one-time cost)
const CHARACTER_MAP = buildCharacterMap();
const CHARACTER_NAMES = getAllCharacterNames();

/**
 * Enhance character descriptions with specific details from database
 * @param {string} userIdea - Raw user input
 * @returns {string} Enhanced description with character details
 */
function enhanceCharacterDescription(userIdea) {
  // Find all character names mentioned in the user's idea
  const sortedNames = Object.keys(CHARACTER_MAP).sort((a, b) => b.length - a.length);
  const matchedCharacters = [];

  for (const characterName of sortedNames) {
    const regex = new RegExp(`\\b${characterName}\\b`, 'gi');
    if (regex.test(userIdea)) {
      matchedCharacters.push({
        name: characterName,
        description: CHARACTER_MAP[characterName]
      });
    }
  }

  // If multiple characters found, format them with clear separation
  if (matchedCharacters.length > 1) {
    const characterDescriptions = matchedCharacters.map((char, index) => {
      const position = index === 0 ? 'FIRST CHARACTER' : index === 1 ? 'SECOND CHARACTER' : `CHARACTER ${index + 1}`;
      return `${position}: ${char.description}`;
    });
    return characterDescriptions.join('. ');
  }

  // Single character or no characters - use original simple replacement
  let enhanced = userIdea;
  for (const characterName of sortedNames) {
    const regex = new RegExp(`\\b${characterName}\\b`, 'gi');
    enhanced = enhanced.replace(regex, CHARACTER_MAP[characterName]);
  }

  return enhanced;
}

/**
 * Mock council responses for demo mode
 */
const MOCK_RESPONSES = {
  simple: (userIdea, style) =>
    `A ${style} style tattoo of ${userIdea} with clean lines and bold composition`,

  detailed: (userIdea, style) => {
    // Check if user input contains any known character names
    const hasCharacters = CHARACTER_NAMES.some(name =>
      new RegExp(`\\b${name}\\b`, 'i').test(userIdea)
    );
    const enhanced = hasCharacters ? enhanceCharacterDescription(userIdea) : userIdea;

    return `A ${style} style tattoo featuring ${enhanced}, rendered with intricate detail and expert shading. ${hasCharacters ? 'Characters depicted with distinctive features, dynamic poses, and recognizable costumes/attributes. ' : ''}The composition emphasizes dynamic movement and visual balance, with careful attention to linework quality and traditional ${style} aesthetic principles. Designed for optimal placement and visual impact.`;
  },

  ultra: (userIdea, style, bodyPart) => {
    // Enhanced character description logic using centralized database
    const hasCharacters = CHARACTER_NAMES.some(name =>
      new RegExp(`\\b${name}\\b`, 'i').test(userIdea)
    );

    // Count how many characters are mentioned to determine composition strategy
    const characterMatches = CHARACTER_NAMES.filter(name =>
      new RegExp(`\\b${name}\\b`, 'i').test(userIdea)
    );
    const characterCount = characterMatches.length;
    const isMultiCharacter = characterCount > 1;

    if (hasCharacters) {
      const compositionGuide = isMultiCharacter
        ? 'CRITICAL: This is a SINGLE UNIFIED TATTOO featuring multiple characters fighting/battling/interacting together in ONE cohesive scene. Characters are engaged in dynamic combat with each other, positioned in confrontational poses showing action and conflict. The composition shows both characters TOGETHER in the same space, creating a dramatic battle scene with energy and movement between them. While each character maintains their unique visual identity and recognizable features, they are part of ONE complete tattoo design, not separate images. Characters face each other or interact directly, with overlapping action lines, energy effects, or environmental elements connecting them. '
        : '';

      return `A photorealistic ${style} style tattoo featuring ${enhanceCharacterDescription(userIdea)}, masterfully composed for ${bodyPart} placement. ${compositionGuide}Character details: dynamic action poses with detailed facial expressions showing intensity and emotion, distinctive clothing and signature accessories rendered with precise linework, anatomically accurate proportions with muscular definition and flowing movement. The composition captures each character's unique fighting style and personality through body language and positioning, with characters clearly interacting and engaged in battle. Background elements frame the action without overwhelming the characters. Technical execution includes: hyper-detailed linework with gradient shading from deep blacks to subtle grays, creating dimensional depth and texture. Dramatic contrast between positive and negative space, flowing composition that wraps naturally around body contours. The style authentically captures traditional ${style} techniques with bold outlines, selective color placement, and atmospheric effects. Lighting and perspective create a three-dimensional effect, with focal points strategically positioned for maximum visual impact. The overall aesthetic balances intricate character detail with clean, readable forms suitable for professional tattooing.`;
    }

    return `A photorealistic ${style} style tattoo of ${userIdea}, masterfully composed for ${bodyPart} placement. The design features hyper-detailed linework with gradient shading from deep blacks to subtle grays, creating dimensional depth and texture. Artistic elements include: dramatic contrast between positive and negative space, flowing composition that wraps naturally around body contours, and carefully balanced visual weight. The style authentically captures traditional ${style} techniques with bold outlines, selective color placement, and atmospheric background elements. Lighting and perspective create a three-dimensional effect, with focal points strategically positioned for maximum visual impact. The overall aesthetic balances intricate character detail with clean, readable forms suitable for professional tattooing.`;
  },

  negative: (userIdea = '') => {
    // For multi-character scenes, don't use "multiple people" in negative prompt
    // Instead focus on preventing merged/conjoined bodies
    const characterMatches = CHARACTER_NAMES.filter(name =>
      new RegExp(`\\b${name}\\b`, 'i').test(userIdea)
    );
    const hasMultipleCharacters = characterMatches.length > 1;

    if (hasMultipleCharacters) {
      return 'blurry, low quality, distorted, watermark, text, signature, unrealistic anatomy, merged bodies, conjoined figures, fused characters, morphed faces, duplicate limbs, cluttered background, oversaturated, low contrast, pixelated, amateur, messy linework, body horror, abstract, deformed proportions';
    }

    return 'blurry, low quality, distorted, watermark, text, signature, cartoon, childish, unrealistic anatomy, multiple people, cluttered background, oversaturated, low contrast, pixelated, amateur, messy linework';
  }
};

/**
 * Enhance a user's tattoo idea using the LLM Council
 *
 * @param {Object} options - Enhancement options
 * @param {string} options.userIdea - The user's basic tattoo idea
 * @param {string} options.style - Tattoo style (traditional, japanese, etc.)
 * @param {string} options.bodyPart - Body placement (forearm, shoulder, etc.)
 * @param {Function} options.onDiscussionUpdate - Optional callback for real-time discussion updates
 * @returns {Promise<Object>} Enhanced prompts at multiple detail levels
 */
export async function enhancePrompt({
  userIdea,
  style = 'traditional',
  bodyPart = 'forearm',
  onDiscussionUpdate = null
}) {
  const startTime = performance.now();
  console.log('[CouncilService] Enhancing prompt:', { userIdea, style, bodyPart });

  // Step 1: Select optimal model (async, can run in parallel with prompt enhancement)
  const modelSelectionPromise = selectModelWithFallback(style, userIdea, bodyPart);

  // Try OpenRouter first if configured
  const USE_OPENROUTER = import.meta.env.VITE_USE_OPENROUTER === 'true';

  if (USE_OPENROUTER && !DEMO_MODE) {
    try {
      const { enhancePromptWithOpenRouter, isOpenRouterConfigured } = await import('./openRouterCouncil.js');

      if (isOpenRouterConfigured()) {
        console.log('[CouncilService] Using OpenRouter council');
        const result = await enhancePromptWithOpenRouter({
          userIdea,
          style,
          bodyPart,
          onDiscussionUpdate
        });

        // Add model selection to result
        const modelSelection = await modelSelectionPromise;
        result.modelSelection = {
          modelId: modelSelection.modelId,
          modelName: modelSelection.modelName,
          reasoning: modelSelection.reasoning,
          estimatedTime: modelSelection.estimatedTime,
          cost: modelSelection.cost,
          isFallback: modelSelection.isFallback || false
        };

        return result;
      } else {
        console.warn('[CouncilService] OpenRouter not configured, falling back to demo mode');
      }
    } catch (error) {
      console.error('[CouncilService] OpenRouter failed, falling back:', error);
    }
  }

  // Demo mode: return mock response
  if (DEMO_MODE) {
    return new Promise((resolve) => {
      // Simulate council discussion
      if (onDiscussionUpdate) {
        setTimeout(() => onDiscussionUpdate('Creative Director: Analyzing style and composition...'), 500);
        setTimeout(() => onDiscussionUpdate('Technical Expert: Considering placement constraints...'), 1200);
        setTimeout(() => onDiscussionUpdate('Style Specialist: Adding artistic refinements...'), 2000);
        setTimeout(() => onDiscussionUpdate('Model Selector: Choosing optimal AI model...'), 2400);
        setTimeout(() => onDiscussionUpdate('Composition Guru: Finalizing visual balance...'), 2800);
      }

      // Return mock enhanced prompts after 3 seconds
      setTimeout(async () => {
        const modelSelection = await modelSelectionPromise;

        resolve({
          prompts: {
            simple: MOCK_RESPONSES.simple(userIdea, style),
            detailed: MOCK_RESPONSES.detailed(userIdea, style),
            ultra: MOCK_RESPONSES.ultra(userIdea, style, bodyPart)
          },
          negativePrompt: MOCK_RESPONSES.negative(userIdea),
          modelSelection: {
            modelId: modelSelection.modelId,
            modelName: modelSelection.modelName,
            reasoning: modelSelection.reasoning,
            estimatedTime: modelSelection.estimatedTime,
            cost: modelSelection.cost,
            isFallback: modelSelection.isFallback || false
          },
          metadata: {
            userIdea,
            style,
            bodyPart,
            generatedAt: new Date().toISOString(),
            enhancementTime: performance.now() - startTime
          }
        });
      }, 3200);
    });
  }

  // Real API call to LLM Council (original backend)
  try {
    // Await model selection (started earlier)
    const modelSelection = await modelSelectionPromise;

    const response = await fetch(`${COUNCIL_API_URL}/prompt-generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_idea: userIdea,
        style_preference: style,
        body_part: bodyPart,
        detail_level: 'all', // Request all levels
        onDiscussionUpdate: onDiscussionUpdate ? 'stream' : 'none'
      })
    });

    if (!response.ok) {
      throw new Error(`Council API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const enhancementTime = performance.now() - startTime;

    console.log('[CouncilService] Enhancement successful:', data);
    console.log(`[CouncilService] Enhancement completed in ${enhancementTime.toFixed(0)}ms`);

    // Apply model-specific prompt enhancements
    const ultraPrompt = data.enhanced_prompts.ultra || data.enhanced_prompts.comprehensive;
    const modelEnhancements = getModelPromptEnhancements(
      modelSelection.modelId,
      ultraPrompt,
      true // Already council-enhanced
    );

    return {
      prompts: {
        simple: data.enhanced_prompts.simple || data.enhanced_prompts.minimal,
        detailed: data.enhanced_prompts.detailed || data.enhanced_prompts.standard,
        ultra: modelEnhancements.enhancedPrompt
      },
      negativePrompt: modelEnhancements.negativePrompt || data.negative_prompt || MOCK_RESPONSES.negative(userIdea),
      modelSelection: {
        modelId: modelSelection.modelId,
        modelName: modelSelection.modelName,
        reasoning: modelSelection.reasoning,
        estimatedTime: modelSelection.estimatedTime,
        cost: modelSelection.cost,
        isFallback: modelSelection.isFallback || false
      },
      metadata: {
        userIdea,
        style,
        bodyPart,
        generatedAt: new Date().toISOString(),
        councilVersion: data.version || 'v1',
        enhancementTime
      }
    };

  } catch (error) {
    console.error('[CouncilService] Enhancement failed:', error);

    // Fallback to basic enhancement if API fails
    console.warn('[CouncilService] Falling back to basic enhancement');

    // Still get model selection even in fallback
    const modelSelection = await modelSelectionPromise;
    const enhancementTime = performance.now() - startTime;

    return {
      prompts: {
        simple: MOCK_RESPONSES.simple(userIdea, style),
        detailed: MOCK_RESPONSES.detailed(userIdea, style),
        ultra: MOCK_RESPONSES.ultra(userIdea, style, bodyPart)
      },
      negativePrompt: MOCK_RESPONSES.negative(userIdea),
      modelSelection: {
        modelId: modelSelection.modelId,
        modelName: modelSelection.modelName,
        reasoning: modelSelection.reasoning,
        estimatedTime: modelSelection.estimatedTime,
        cost: modelSelection.cost,
        isFallback: modelSelection.isFallback || false
      },
      metadata: {
        userIdea,
        style,
        bodyPart,
        generatedAt: new Date().toISOString(),
        fallback: true,
        enhancementTime
      }
    };
  }
}

/**
 * Refine an existing prompt using council feedback
 *
 * @param {Object} options - Refinement options
 * @param {string} options.currentPrompt - Current prompt to refine
 * @param {string} options.refinementRequest - How to refine (e.g., "make it more feminine")
 * @returns {Promise<Object>} Refined prompt and suggestions
 */
export async function refinePrompt({ currentPrompt, refinementRequest }) {
  console.log('[CouncilService] Refining prompt:', { currentPrompt, refinementRequest });

  if (DEMO_MODE) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          refinedPrompt: `${currentPrompt} ${refinementRequest}`,
          suggestions: [
            'Consider adding more flowing elements',
            'Soften the line weight for a delicate feel',
            'Add floral or organic accents'
          ]
        });
      }, 2000);
    });
  }

  try {
    const response = await fetch(`${COUNCIL_API_URL}/prompt-refinement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        current_prompt: currentPrompt,
        refinement_request: refinementRequest
      })
    });

    if (!response.ok) {
      throw new Error(`Council API error: ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    console.error('[CouncilService] Refinement failed:', error);
    throw error;
  }
}

/**
 * Get style-specific recommendations from the council
 *
 * @param {string} style - Tattoo style to get recommendations for
 * @returns {Promise<Object>} Style recommendations and guidelines
 */
export async function getStyleRecommendations(style) {
  console.log('[CouncilService] Getting style recommendations:', style);

  if (DEMO_MODE) {
    return {
      keyCharacteristics: [
        'Bold, clean lines',
        'Limited color palette',
        'Strong contrast'
      ],
      commonElements: [
        'Nautical themes',
        'Vintage Americana',
        'Classic iconography'
      ],
      promptTips: [
        'Emphasize outline quality',
        'Specify traditional color scheme',
        'Reference classic flash art'
      ]
    };
  }

  try {
    const response = await fetch(`${COUNCIL_API_URL}/style-recommendations/${style}`);

    if (!response.ok) {
      throw new Error(`Council API error: ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    console.error('[CouncilService] Style recommendations failed:', error);
    return null;
  }
}

/**
 * Validate a prompt for tattoo generation suitability
 *
 * @param {string} prompt - Prompt to validate
 * @returns {Promise<Object>} Validation result with score and suggestions
 */
export async function validatePrompt(prompt) {
  console.log('[CouncilService] Validating prompt:', prompt);

  if (DEMO_MODE) {
    return {
      score: 85,
      isValid: true,
      suggestions: [
        'Great detail level',
        'Could specify line weight',
        'Consider adding shading direction'
      ]
    };
  }

  try {
    const response = await fetch(`${COUNCIL_API_URL}/prompt-validation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      throw new Error(`Council API error: ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    console.error('[CouncilService] Validation failed:', error);
    return {
      score: 70,
      isValid: true,
      suggestions: ['Validation service unavailable']
    };
  }
}

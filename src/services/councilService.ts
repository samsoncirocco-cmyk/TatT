/**
 * LLM Council API Service (Consolidated)
 *
 * Single entry point for council prompt enhancement with Vertex AI, OpenRouter,
 * and safe fallbacks.
 */

import { buildCharacterMap, getAllCharacterNames } from '../config/characterDatabase.js';
import { selectModelWithFallback, getModelPromptEnhancements } from '../utils/styleModelMapping.js';
import { COUNCIL_SKILL_PACK } from '../config/councilSkillPack';
import { getGcpAccessToken } from '@/lib/google-auth-edge';
import { logEvent } from '@/lib/observability';

const COUNCIL_API_URL = process.env.NEXT_PUBLIC_COUNCIL_API_URL || 'http://localhost:8001/api';
const DEMO_MODE = process.env.NEXT_PUBLIC_COUNCIL_DEMO_MODE === 'true';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_SITE_URL = process.env.OPENROUTER_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://manama-next.vercel.app';

const PROJECT_ID = process.env.NEXT_PUBLIC_VERTEX_AI_PROJECT_ID || process.env.GCP_PROJECT_ID || 'tatt-pro';
const REGION = process.env.GCP_REGION || 'us-central1';
const GEMINI_MODEL = 'gemini-2.0-flash-exp';

const COUNCIL_MEMBERS = {
  creative: {
    model: 'anthropic/claude-3.5-sonnet',
    role: 'Creative Director',
    focus: 'Artistic vision, composition, and aesthetic appeal',
    estimatedCostUsd: 0.03
  },
  technical: {
    model: 'openai/gpt-4-turbo',
    role: 'Technical Expert',
    focus: 'Tattoo-specific technical details and feasibility',
    estimatedCostUsd: 0.03
  },
  style: {
    model: 'google/gemini-pro-1.5',
    role: 'Style Specialist',
    focus: 'Style authenticity and cultural accuracy',
    estimatedCostUsd: 0.02
  }
};

const CHARACTER_MAP = buildCharacterMap();
const CHARACTER_NAMES = getAllCharacterNames();

function parseJsonFromText(text: string) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // Try to extract the first valid JSON object
  }

  const firstBrace = text.indexOf('{');
  if (firstBrace === -1) return null;
  let depth = 0;
  for (let i = firstBrace; i < text.length; i += 1) {
    const char = text[i];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) {
      const candidate = text.slice(firstBrace, i + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        return null;
      }
    }
  }
  return null;
}

function detectStencilMode(userIdea = '', negativePrompt = '') {
  try {
    const combined = `${userIdea} ${negativePrompt}`.toLowerCase();
    return (COUNCIL_SKILL_PACK.stencilKeywords || []).some(keyword => combined.includes(keyword));
  } catch (error) {
    console.warn('[CouncilService] Error detecting stencil mode:', error);
    return false;
  }
}

function detectCharacters(text = '') {
  try {
    return CHARACTER_NAMES.filter(name =>
      new RegExp(`\\b${name}\\b`, 'i').test(text)
    );
  } catch (error) {
    console.warn('[CouncilService] Error detecting characters:', error);
    return [];
  }
}

function addIfMissing(prompt: string, token: string) {
  if (!token || !prompt) return prompt;
  try {
    const promptLower = prompt.toLowerCase();
    const tokenLower = token.toLowerCase();

    if (promptLower.includes(tokenLower)) {
      return prompt;
    }

    return `${prompt}, ${token}`;
  } catch (error) {
    console.warn('[CouncilService] Error in addIfMissing:', error);
    return prompt;
  }
}

function applyCouncilSkillPack(prompts: Record<string, string>, negativePrompt: string, context: any) {
  try {
    if (!prompts || typeof prompts !== 'object') {
      console.warn('[CouncilService] Invalid prompts object, skipping skill pack application');
      return { prompts: prompts || {}, negativePrompt: negativePrompt || '' };
    }

    if (!context || typeof context !== 'object') {
      console.warn('[CouncilService] Invalid context object, using defaults');
      context = { bodyPart: 'forearm', isStencilMode: false, characterMatches: [] };
    }

    const flowToken = COUNCIL_SKILL_PACK.anatomicalFlow[context.bodyPart] || '';
    const spatialKeywords = COUNCIL_SKILL_PACK.spatialKeywords || [];

    const hardenedPrompts = Object.entries(prompts).reduce((acc, [level, prompt]) => {
      if (typeof prompt !== 'string') {
        console.warn(`[CouncilService] Invalid prompt at level ${level}, skipping`);
        acc[level] = prompt;
        return acc;
      }

      let hardened = prompt;
      hardened = addIfMissing(hardened, flowToken);
      hardened = addIfMissing(hardened, COUNCIL_SKILL_PACK.aestheticAnchors);

      const promptCharacters = detectCharacters(hardened);
      const characters = promptCharacters.length > 0 ? promptCharacters : (context.characterMatches || []);

      if (characters.length >= 2) {
        const lower = hardened.toLowerCase();
        const hasPositioning = spatialKeywords.some(keyword => lower.includes(keyword));

        if (!hasPositioning) {
          hardened = `${characters[0]} on the left, ${characters[1]} on the right, ${hardened}`;
          console.log('[CouncilService] Forced positional anchoring for layer-safety');
        }
      }

      acc[level] = hardened;
      return acc;
    }, {} as Record<string, string>);

    let hardenedNegative = negativePrompt || '';

    if (context.isStencilMode) {
      const shield = COUNCIL_SKILL_PACK.negativeShield;
      const lower = hardenedNegative.toLowerCase();

      if (!lower.includes('shading') || !lower.includes('gradients')) {
        hardenedNegative = hardenedNegative
          ? `${shield}, ${hardenedNegative}`
          : shield;
      }
    }

    return { prompts: hardenedPrompts, negativePrompt: hardenedNegative };
  } catch (error) {
    console.error('[CouncilService] Error applying skill pack:', error);
    return { prompts: prompts || {}, negativePrompt: negativePrompt || '' };
  }
}

function enhanceCharacterDescription(userIdea: string) {
  const sortedNames = Object.keys(CHARACTER_MAP).sort((a, b) => b.length - a.length);
  const matchedCharacters: { name: string; description: string }[] = [];

  for (const characterName of sortedNames) {
    const regex = new RegExp(`\\b${characterName}\\b`, 'gi');
    if (regex.test(userIdea)) {
      matchedCharacters.push({
        name: characterName,
        description: CHARACTER_MAP[characterName]
      });
    }
  }

  if (matchedCharacters.length > 1) {
    const characterDescriptions = matchedCharacters.map((char, index) => {
      const position = index === 0 ? 'FIRST CHARACTER' : index === 1 ? 'SECOND CHARACTER' : `CHARACTER ${index + 1}`;
      return `${position}: ${char.description}`;
    });
    return characterDescriptions.join('. ');
  }

  let enhanced = userIdea;
  for (const characterName of sortedNames) {
    const regex = new RegExp(`\\b${characterName}\\b`, 'gi');
    enhanced = enhanced.replace(regex, CHARACTER_MAP[characterName]);
  }

  return enhanced;
}

const MOCK_RESPONSES = {
  simple: (userIdea: string, style: string) =>
    `A ${style} style tattoo of ${userIdea} with clean lines and bold composition`,

  detailed: (userIdea: string, style: string) => {
    const hasCharacters = CHARACTER_NAMES.some(name =>
      new RegExp(`\\b${name}\\b`, 'i').test(userIdea)
    );
    const enhanced = hasCharacters ? enhanceCharacterDescription(userIdea) : userIdea;

    return `A ${style} style tattoo featuring ${enhanced}, rendered with intricate detail and expert shading. ${hasCharacters ? 'Characters depicted with distinctive features, dynamic poses, and recognizable costumes/attributes. ' : ''}The composition emphasizes dynamic movement and visual balance, with careful attention to linework quality and traditional ${style} aesthetic principles. Designed for optimal placement and visual impact.`;
  },

  ultra: (userIdea: string, style: string, bodyPart: string) => {
    const hasCharacters = CHARACTER_NAMES.some(name =>
      new RegExp(`\\b${name}\\b`, 'i').test(userIdea)
    );

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

function buildCouncilSystemPrompt({ bodyPart, isStencilMode }: { bodyPart: string; isStencilMode: boolean }) {
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

async function callOpenRouter(model: string, systemPrompt: string, userPrompt: string) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not configured in environment variables');
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': OPENROUTER_SITE_URL,
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

async function enhancePromptWithOpenRouter({
  userIdea,
  style = 'traditional',
  bodyPart = 'forearm',
  onDiscussionUpdate = null,
  isStencilMode = false,
  requestId
}: any) {
  const startTime = Date.now();
  const councilSystemPrompt = buildCouncilSystemPrompt({ bodyPart, isStencilMode });
  const flowToken = COUNCIL_SKILL_PACK.anatomicalFlow[bodyPart] || '';
  const stencilHint = isStencilMode ? 'Stencil mode: prioritize clean, high-contrast linework.' : '';

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

  const creativeResult = parseJsonFromText(creativePrompt);
  if (!creativeResult) {
    throw new Error('Failed to parse OpenRouter creative response');
  }

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

  const enhancementTime = Date.now() - startTime;
  const estimatedCost = Object.values(COUNCIL_MEMBERS).reduce((sum, member) => sum + member.estimatedCostUsd, 0);

  logEvent('council.result', {
    requestId,
    provider: 'openrouter',
    durationMs: enhancementTime,
    estimatedCostUsd: estimatedCost
  });

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
      councilMembers: Object.keys(COUNCIL_MEMBERS).map(key => COUNCIL_MEMBERS[key as keyof typeof COUNCIL_MEMBERS].role),
      provider: 'openrouter',
      estimatedCostUsd: estimatedCost
    }
  };
}

function isOpenRouterConfigured() {
  return !!OPENROUTER_API_KEY;
}

async function enhancePromptWithVertexAI({
  userIdea,
  style = 'traditional',
  bodyPart = 'forearm',
  onDiscussionUpdate = null,
  isStencilMode = false,
  requestId
}: any) {
  if (onDiscussionUpdate) {
    setTimeout(() => onDiscussionUpdate('Gemini AI: Analyzing your tattoo concept...'), 300);
    setTimeout(() => onDiscussionUpdate('Gemini AI: Considering style and placement...'), 800);
    setTimeout(() => onDiscussionUpdate('Gemini AI: Generating detailed prompts...'), 1400);
  }

  const startTime = Date.now();
  const accessToken = await getGcpAccessToken();
  const endpoint = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${GEMINI_MODEL}:generateContent`;

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

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\nUser Idea: ${userIdea}` }]
      }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No content generated from Gemini');

  const prompts = parseJsonFromText(text);
  if (!prompts) {
    throw new Error('Failed to parse Gemini response');
  }

  const enhancementTime = Date.now() - startTime;

  logEvent('council.result', {
    requestId,
    provider: 'vertex-ai',
    durationMs: enhancementTime,
    estimatedCostUsd: 0
  });

  return {
    prompts: {
      simple: prompts.simple,
      detailed: prompts.detailed,
      ultra: prompts.ultra
    },
    negativePrompt: prompts.negativePrompt,
    metadata: {
      model: GEMINI_MODEL,
      userIdea,
      style,
      bodyPart,
      isStencilMode,
      generatedAt: new Date().toISOString(),
      enhancementTime,
      provider: 'vertex-ai',
      estimatedCostUsd: 0
    }
  };
}

function isVertexAIConfigured() {
  const projectId = process.env.NEXT_PUBLIC_VERTEX_AI_PROJECT_ID || process.env.GCP_PROJECT_ID;
  const credJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || process.env.GCP_SERVICE_ACCOUNT_KEY;
  const credPair = process.env.GCP_SERVICE_ACCOUNT_EMAIL && process.env.GCP_PRIVATE_KEY;
  return Boolean(projectId && (credJson || credPair));
}

export async function enhancePrompt({
  userIdea,
  style = 'traditional',
  bodyPart = 'forearm',
  onDiscussionUpdate = null,
  isStencilMode = null
}: any) {
  const startTime = Date.now();
  const requestId = `council_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const characterMatches = detectCharacters(userIdea);
  const resolvedStencilMode = isStencilMode === null
    ? detectStencilMode(userIdea)
    : Boolean(isStencilMode);

  const modelSelectionPromise = selectModelWithFallback(style, userIdea, bodyPart);

  logEvent('council.request', {
    requestId,
    userIdeaLength: userIdea?.length || 0,
    style,
    bodyPart,
    stencil: resolvedStencilMode
  });

  const USE_VERTEX_AI = process.env.NEXT_PUBLIC_VERTEX_AI_ENABLED !== 'false';
  if (USE_VERTEX_AI && !DEMO_MODE) {
    try {
      if (isVertexAIConfigured()) {
        const result = await enhancePromptWithVertexAI({
          userIdea,
          style,
          bodyPart,
          onDiscussionUpdate,
          isStencilMode: resolvedStencilMode,
          requestId
        });

        const modelSelection = await modelSelectionPromise;
        result.modelSelection = {
          modelId: modelSelection.modelId,
          modelName: modelSelection.modelName,
          reasoning: modelSelection.reasoning,
          estimatedTime: modelSelection.estimatedTime,
          cost: 0,
          isFallback: modelSelection.isFallback || false
        };

        const hardened = applyCouncilSkillPack(
          result.prompts,
          result.negativePrompt,
          { bodyPart, isStencilMode: resolvedStencilMode, characterMatches }
        );

        return { ...result, ...hardened };
      }
    } catch (error) {
      console.error('[CouncilService] Vertex AI failed, trying fallback:', error);
    }
  }

  const USE_OPENROUTER = process.env.NEXT_PUBLIC_USE_OPENROUTER === 'true';
  if (USE_OPENROUTER && !DEMO_MODE) {
    try {
      if (isOpenRouterConfigured()) {
        const result = await enhancePromptWithOpenRouter({
          userIdea,
          style,
          bodyPart,
          onDiscussionUpdate,
          isStencilMode: resolvedStencilMode,
          requestId
        });

        const modelSelection = await modelSelectionPromise;
        result.modelSelection = {
          modelId: modelSelection.modelId,
          modelName: modelSelection.modelName,
          reasoning: modelSelection.reasoning,
          estimatedTime: modelSelection.estimatedTime,
          cost: modelSelection.cost,
          isFallback: modelSelection.isFallback || false
        };

        const hardened = applyCouncilSkillPack(
          result.prompts,
          result.negativePrompt,
          { bodyPart, isStencilMode: resolvedStencilMode, characterMatches }
        );

        return { ...result, ...hardened };
      }
    } catch (error) {
      console.error('[CouncilService] OpenRouter failed, falling back:', error);
    }
  }

  if (DEMO_MODE) {
    return new Promise((resolve) => {
      if (onDiscussionUpdate) {
        setTimeout(() => onDiscussionUpdate('Creative Director: Analyzing style and composition...'), 500);
        setTimeout(() => onDiscussionUpdate('Technical Expert: Considering placement constraints...'), 1200);
        setTimeout(() => onDiscussionUpdate('Style Specialist: Adding artistic refinements...'), 2000);
        setTimeout(() => onDiscussionUpdate('Model Selector: Choosing optimal AI model...'), 2400);
        setTimeout(() => onDiscussionUpdate('Composition Guru: Finalizing visual balance...'), 2800);
      }

      setTimeout(async () => {
        const modelSelection = await modelSelectionPromise;
        const prompts = {
          simple: MOCK_RESPONSES.simple(userIdea, style),
          detailed: MOCK_RESPONSES.detailed(userIdea, style),
          ultra: MOCK_RESPONSES.ultra(userIdea, style, bodyPart)
        };
        const negativePrompt = MOCK_RESPONSES.negative(userIdea);
        const hardened = applyCouncilSkillPack(
          prompts,
          negativePrompt,
          { bodyPart, isStencilMode: resolvedStencilMode, characterMatches }
        );

        resolve({
          prompts: hardened.prompts,
          negativePrompt: hardened.negativePrompt,
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
            enhancementTime: Date.now() - startTime
          }
        });
      }, 3200);
    });
  }

  try {
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
        detail_level: 'all',
        onDiscussionUpdate: onDiscussionUpdate ? 'stream' : 'none'
      })
    });

    if (!response.ok) {
      throw new Error(`Council API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const enhancementTime = Date.now() - startTime;

    const ultraPrompt = data.enhanced_prompts.ultra || data.enhanced_prompts.comprehensive;
    const modelEnhancements = getModelPromptEnhancements(
      modelSelection.modelId,
      ultraPrompt,
      true
    );

    const prompts = {
      simple: data.enhanced_prompts.simple || data.enhanced_prompts.minimal,
      detailed: data.enhanced_prompts.detailed || data.enhanced_prompts.standard,
      ultra: modelEnhancements.enhancedPrompt
    };
    const negativePrompt = modelEnhancements.negativePrompt || data.negative_prompt || MOCK_RESPONSES.negative(userIdea);
    const hardened = applyCouncilSkillPack(
      prompts,
      negativePrompt,
      { bodyPart, isStencilMode: resolvedStencilMode, characterMatches }
    );

    return {
      prompts: hardened.prompts,
      negativePrompt: hardened.negativePrompt,
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

    const modelSelection = await modelSelectionPromise;
    const enhancementTime = Date.now() - startTime;

    const prompts = {
      simple: MOCK_RESPONSES.simple(userIdea, style),
      detailed: MOCK_RESPONSES.detailed(userIdea, style),
      ultra: MOCK_RESPONSES.ultra(userIdea, style, bodyPart)
    };
    const negativePrompt = MOCK_RESPONSES.negative(userIdea);
    const hardened = applyCouncilSkillPack(
      prompts,
      negativePrompt,
      { bodyPart, isStencilMode: resolvedStencilMode, characterMatches }
    );

    logEvent('council.result', {
      requestId,
      provider: 'fallback',
      durationMs: enhancementTime,
      estimatedCostUsd: 0,
      fallback: true
    }, 'warn');

    return {
      prompts: hardened.prompts,
      negativePrompt: hardened.negativePrompt,
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

export async function refinePrompt({ currentPrompt, refinementRequest }: any) {
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

export async function getStyleRecommendations(style: string) {
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

export async function validatePrompt(prompt: string) {
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

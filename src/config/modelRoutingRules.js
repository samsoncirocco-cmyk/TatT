/**
 * Model Routing Rules Configuration
 * 
 * Defines AI model configurations and routing rules for optimal tattoo generation.
 * Maps tattoo styles to specialized models based on their strengths and capabilities.
 */

/**
 * Model Configurations
 * Each model has specific strengths for different tattoo styles
 */
export const MODEL_CONFIGS = {
    imagen3: {
        id: 'imagen3',
        name: 'Imagen 3 (Google)',
        description: 'Best for photorealism and detailed compositions',
        provider: 'vertex-ai',
        strengths: [
            'Photorealistic rendering',
            'Complex compositions',
            'Fine detail preservation',
            'Natural lighting and shadows',
            'Anatomical accuracy'
        ],
        limitations: [
            'Higher cost per generation',
            'Slower generation time',
            'May be too realistic for stylized tattoos'
        ],
        bestFor: ['realism', 'portrait', 'photorealistic'],
        estimatedTime: '15-25 seconds',
        cost: 0.02
    },

    flux_dev: {
        id: 'flux-dev',
        name: 'FLUX.1 Dev',
        description: 'Primary generalist — best linework, prompt adherence, blackwork and anime detail',
        provider: 'replicate',
        strengths: [
            'Best-in-class prompt adherence',
            'Clean confident linework',
            'Blackwork and stencil clarity',
            'Handles named characters and IP well',
            'Strong composition control'
        ],
        limitations: [
            'Slower than Schnell',
            'No negative-prompt input (negatives folded into prompt)'
        ],
        bestFor: ['blackwork', 'traditional', 'geometric', 'default'],
        estimatedTime: '8-15 seconds',
        cost: 0.025
    },

    flux_schnell: {
        id: 'flux-schnell',
        name: 'FLUX.1 Schnell',
        description: 'Speed fallback — same family, sub-2s generation, slightly lower quality',
        provider: 'replicate',
        strengths: [
            'Sub-2 second generation',
            'Same model family as Dev (consistent look)',
            'Cheap',
            'Good for previews and refinement passes'
        ],
        limitations: [
            'Slightly lower detail than Dev',
            'No negative-prompt input'
        ],
        bestFor: ['preview', 'refine'],
        estimatedTime: '1-3 seconds',
        cost: 0.003
    },

    krea_2: {
        id: 'krea2',
        name: 'Krea 2 Medium',
        description: 'Style wildcard — expressive illustration, anime, painterly styles',
        provider: 'replicate',
        strengths: [
            'Expressive illustrative rendering',
            'Anime and painterly styles',
            'Artistic rather than clinical output'
        ],
        limitations: [
            'Less predictable for strict stencil work',
            'No negative-prompt input',
            'Single output per prediction'
        ],
        bestFor: ['anime', 'manga', 'illustrative', 'newSchool'],
        estimatedTime: '5-12 seconds',
        cost: 0.035
    }
};

/**
 * Style to Model Mapping
 * Maps tattoo styles to their optimal model choices
 */
export const STYLE_MODEL_MAPPING = {
    // Traditional styles
    traditional: {
        primary: 'flux_dev',
        fallback: 'flux_schnell',
        reasoning: 'Flux Dev leads on linework, prompt adherence, and tattoo-specific detail'
    },
    neoTraditional: {
        primary: 'flux_dev',
        fallback: 'flux_schnell',
        reasoning: 'Flux Dev leads on linework, prompt adherence, and tattoo-specific detail'
    },
    americana: {
        primary: 'flux_dev',
        fallback: 'flux_schnell',
        reasoning: 'Flux Dev leads on linework, prompt adherence, and tattoo-specific detail'
    },

    // Realism — moved off the Google models. Measured through the real
    // prompt path, Gemini baked banner text into the artwork on 2 of 2
    // designs ("WILDERNESS", "OLD MAN OF THE SEA") despite the standard
    // "avoid text, watermark, signature" instruction; the retiring Imagen
    // endpoint produced none. A customer approving a design with a word in
    // it is a customer wearing that word permanently, so realism joins the
    // rest of the catalog on Flux until a Google route is proven clean.
    realism: {
        primary: 'flux_dev',
        fallback: 'flux_schnell',
        reasoning: 'Flux Dev holds photorealistic detail without baking text into the artwork'
    },
    portrait: {
        primary: 'flux_dev',
        fallback: 'flux_schnell',
        reasoning: 'Flux Dev holds portrait accuracy without baking text into the artwork'
    },
    photorealistic: {
        primary: 'flux_dev',
        fallback: 'flux_schnell',
        reasoning: 'Flux Dev holds photorealistic rendering without baking text into the artwork'
    },

    // Anime/Illustrative
    anime: {
        primary: 'krea_2',
        fallback: 'flux_dev',
        reasoning: 'Krea 2 is tuned for expressive illustration, anime, and painterly styles'
    },
    manga: {
        primary: 'krea_2',
        fallback: 'flux_dev',
        reasoning: 'Krea 2 is tuned for expressive illustration, anime, and painterly styles'
    },
    illustrative: {
        primary: 'krea_2',
        fallback: 'flux_dev',
        reasoning: 'Krea 2 is tuned for expressive illustration, anime, and painterly styles'
    },
    newSchool: {
        primary: 'krea_2',
        fallback: 'flux_dev',
        reasoning: 'Krea 2 is tuned for expressive illustration, anime, and painterly styles'
    },

    // Japanese
    japanese: {
        primary: 'krea_2',
        fallback: 'flux_dev',
        reasoning: 'Krea 2 is tuned for expressive illustration, anime, and painterly styles'
    },
    irezumi: {
        primary: 'flux_dev',
        fallback: 'krea_2',
        reasoning: 'Bold traditional Japanese composition benefits from Flux linework first'
    },

    // Blackwork/Tribal
    blackwork: {
        primary: 'flux_dev',
        fallback: 'flux_schnell',
        reasoning: 'Flux Dev leads on linework, prompt adherence, and tattoo-specific detail'
    },
    tribal: {
        primary: 'flux_dev',
        fallback: 'flux_schnell',
        reasoning: 'Flux Dev leads on linework, prompt adherence, and tattoo-specific detail'
    },
    geometric: {
        primary: 'flux_dev',
        fallback: 'flux_schnell',
        reasoning: 'Flux Dev leads on linework, prompt adherence, and tattoo-specific detail'
    },
    dotwork: {
        primary: 'flux_dev',
        fallback: 'flux_schnell',
        reasoning: 'Flux Dev leads on linework, prompt adherence, and tattoo-specific detail'
    },

    // Default fallback
    default: {
        primary: 'flux_dev',
        fallback: 'flux_schnell',
        reasoning: 'Flux Dev is the general-purpose primary; Schnell keeps the same look when speed matters'
    }
};

/**
 * Model Fallback Chain
 * Defines fallback sequence if primary model is unavailable
 */
export const MODEL_FALLBACK_CHAIN = {
    imagen3: ['flux_dev', 'flux_schnell'],
    flux_dev: ['flux_schnell', 'krea_2'],
    flux_schnell: ['flux_dev', 'krea_2'],
    krea_2: ['flux_dev', 'flux_schnell']
};

/**
 * Model-Specific Prompt Modifiers
 * Additional keywords to optimize prompts for each model
 */
export const MODEL_PROMPT_MODIFIERS = {
    imagen3: {
        positive: 'photorealistic, highly detailed, professional photography, natural lighting, sharp focus, 8k resolution',
        negative: 'cartoon, anime, illustrated, painting, drawing, sketch, low quality, blurry'
    },

    flux_dev: {
        positive: 'clean confident linework, tattoo-ready composition, high contrast, deliberate negative space',
        negative: 'blurry, low quality, muddy shading, messy lines, watermark, text'
    },

    flux_schnell: {
        positive: 'clean linework, high contrast, tattoo-ready composition',
        negative: 'blurry, low quality, muddy shading, messy lines, watermark, text'
    },

    krea_2: {
        positive: 'expressive illustration, painterly rendering, dynamic composition, bold artistic style',
        negative: 'photorealistic, blurry, low quality, distorted anatomy, watermark, text'
    }
};

/**
 * Model-Specific Negative Prompts
 * Tailored negative prompts for each model to avoid common issues.
 * NOTE: the Flux/Krea family has no negative_prompt input — the Replicate
 * provider folds these into the prompt as an "Avoid:" clause instead.
 */
export const MODEL_NEGATIVE_PROMPTS = {
    imagen3: 'cartoon, anime, illustrated, painting, drawing, sketch, low quality, blurry, distorted, watermark, text, signature, unrealistic anatomy, cluttered background, oversaturated, pixelated, amateur',

    flux_dev: 'blurry, low quality, muddy shading, messy lines, distorted, watermark, text, signature, unrealistic anatomy, cluttered background, oversaturated, pixelated, amateur',

    flux_schnell: 'blurry, low quality, muddy shading, messy lines, distorted, watermark, text, signature, unrealistic anatomy, cluttered background, oversaturated, pixelated, amateur',

    krea_2: 'photorealistic, blurry, low quality, distorted anatomy, watermark, text, signature, unrealistic proportions, cluttered background, oversaturated, pixelated, amateur, messy linework'
};

/**
 * Complexity-Based Model Adjustments
 * Adjust model selection based on prompt complexity
 */
export const COMPLEXITY_ADJUSTMENTS = {
    simple: {
        // For simple designs, prefer faster models
        preferFast: true,
        modelPreference: ['flux_schnell', 'flux_dev']
    },
    moderate: {
        // Moderate complexity, use style-appropriate model
        preferFast: false,
        modelPreference: null // Use style-based selection
    },
    complex: {
        // Complex designs may benefit from higher quality models.
        // imagen3 is deliberately absent: it is the one entry whose bestFor
        // list matches realism/portrait/photorealistic, so leaving it here
        // would let a "complex" request re-select Google for exactly the
        // styles moved off it above.
        preferFast: false,
        modelPreference: ['flux_dev', 'krea_2']
    }
};

/**
 * Body Part Considerations
 * Some body parts may benefit from specific models
 */
export const BODY_PART_CONSIDERATIONS = {
    // Large areas can handle more detail
    largeAreas: ['back', 'chest', 'thigh', 'fullSleeve'],
    preferDetailed: true,

    // Small areas need simpler, bolder designs
    smallAreas: ['finger', 'wrist', 'ankle', 'ear'],
    preferBold: true,

    // Medium areas are versatile
    mediumAreas: ['forearm', 'shoulder', 'calf', 'upperArm']
};

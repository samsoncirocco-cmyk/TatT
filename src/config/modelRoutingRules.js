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

    dreamshaper_turbo: {
        id: 'dreamshaper',
        name: 'DreamShaper XL Turbo',
        description: 'Fast generation for illustrative and anime styles',
        provider: 'replicate',
        strengths: [
            'Very fast generation (6 steps)',
            'Excellent for anime/manga',
            'Versatile illustrative style',
            'Cost-effective',
            'Good color vibrancy'
        ],
        limitations: [
            'Less photorealistic',
            'May lack fine detail',
            'Not ideal for traditional flash art'
        ],
        bestFor: ['anime', 'illustrative', 'manga', 'newSchool'],
        estimatedTime: '5-10 seconds',
        cost: 0.001
    },

    tattoo_flash_art: {
        id: 'tattoo',
        name: 'Tattoo Flash Art',
        description: 'Optimized for traditional flash art and bold line work',
        provider: 'replicate',
        strengths: [
            'Traditional tattoo aesthetic',
            'Bold, clean line work',
            'Classic flash art style',
            'Optimized for tattoo stencils',
            'High contrast'
        ],
        limitations: [
            'Limited to traditional styles',
            'Not suitable for photorealism',
            'Specific aesthetic only'
        ],
        bestFor: ['traditional', 'neoTraditional', 'americana'],
        estimatedTime: '10-15 seconds',
        cost: 0.003
    },

    anime_xl: {
        id: 'animeXL',
        name: 'Anime XL (Niji SE)',
        description: 'Specialized for anime and manga characters',
        provider: 'replicate',
        strengths: [
            'Vibrant anime style',
            'Character-focused',
            'Dynamic poses',
            'Excellent for DBZ/anime characters',
            'Bold colors'
        ],
        limitations: [
            'Anime-specific aesthetic',
            'Not suitable for realism',
            'Higher cost than DreamShaper'
        ],
        bestFor: ['anime', 'manga', 'japanese', 'illustrative'],
        estimatedTime: '10-15 seconds',
        cost: 0.03
    },

    blackwork_specialist: {
        id: 'sdxl',
        name: 'Blackwork Specialist (SDXL)',
        description: 'High-contrast blackwork and tribal designs',
        provider: 'replicate',
        strengths: [
            'High contrast rendering',
            'Excellent negative space',
            'Bold black work',
            'Tribal and geometric patterns',
            'General-purpose versatility'
        ],
        limitations: [
            'May add unwanted color',
            'Less specialized than other models'
        ],
        bestFor: ['blackwork', 'tribal', 'geometric', 'dotwork'],
        estimatedTime: '12-18 seconds',
        cost: 0.0055
    }
};

/**
 * Style to Model Mapping
 * Maps tattoo styles to their optimal model choices
 */
export const STYLE_MODEL_MAPPING = {
    // Traditional styles
    traditional: {
        primary: 'tattoo_flash_art',
        fallback: 'blackwork_specialist',
        reasoning: 'Traditional flash art model optimized for bold lines and classic tattoo aesthetic'
    },
    neoTraditional: {
        primary: 'tattoo_flash_art',
        fallback: 'blackwork_specialist',
        reasoning: 'Flash art model handles neo-traditional bold lines and vibrant colors'
    },
    americana: {
        primary: 'tattoo_flash_art',
        fallback: 'blackwork_specialist',
        reasoning: 'Specialized for classic American traditional tattoo style'
    },

    // Realism
    realism: {
        primary: 'imagen3',
        fallback: 'blackwork_specialist',
        reasoning: 'Imagen 3 excels at photorealistic detail and natural lighting'
    },
    portrait: {
        primary: 'imagen3',
        fallback: 'blackwork_specialist',
        reasoning: 'Best photorealistic rendering for portrait accuracy'
    },
    photorealistic: {
        primary: 'imagen3',
        fallback: 'blackwork_specialist',
        reasoning: 'Highest quality photorealistic generation available'
    },

    // Anime/Illustrative
    anime: {
        primary: 'anime_xl',
        fallback: 'dreamshaper_turbo',
        reasoning: 'Specialized anime model for vibrant character designs'
    },
    manga: {
        primary: 'anime_xl',
        fallback: 'dreamshaper_turbo',
        reasoning: 'Optimized for manga-style character rendering'
    },
    illustrative: {
        primary: 'dreamshaper_turbo',
        fallback: 'anime_xl',
        reasoning: 'Fast, versatile illustrative style generation'
    },
    newSchool: {
        primary: 'dreamshaper_turbo',
        fallback: 'anime_xl',
        reasoning: 'Vibrant colors and bold illustrative style'
    },

    // Japanese
    japanese: {
        primary: 'anime_xl',
        fallback: 'blackwork_specialist',
        reasoning: 'Anime XL handles Japanese aesthetic and composition well'
    },
    irezumi: {
        primary: 'anime_xl',
        fallback: 'blackwork_specialist',
        reasoning: 'Traditional Japanese tattoo style with bold composition'
    },

    // Blackwork/Tribal
    blackwork: {
        primary: 'blackwork_specialist',
        fallback: 'tattoo_flash_art',
        reasoning: 'Optimized for high-contrast black ink designs'
    },
    tribal: {
        primary: 'blackwork_specialist',
        fallback: 'tattoo_flash_art',
        reasoning: 'Excellent for bold tribal patterns and negative space'
    },
    geometric: {
        primary: 'blackwork_specialist',
        fallback: 'tattoo_flash_art',
        reasoning: 'Clean lines and precise geometric patterns'
    },
    dotwork: {
        primary: 'blackwork_specialist',
        fallback: 'tattoo_flash_art',
        reasoning: 'High contrast rendering for stippling and dot work'
    },

    // Default fallback
    default: {
        primary: 'blackwork_specialist',
        fallback: 'dreamshaper_turbo',
        reasoning: 'General-purpose SDXL model for versatile generation'
    }
};

/**
 * Model Fallback Chain
 * Defines fallback sequence if primary model is unavailable
 */
export const MODEL_FALLBACK_CHAIN = {
    imagen3: ['blackwork_specialist', 'dreamshaper_turbo'],
    dreamshaper_turbo: ['anime_xl', 'blackwork_specialist'],
    tattoo_flash_art: ['blackwork_specialist', 'dreamshaper_turbo'],
    anime_xl: ['dreamshaper_turbo', 'blackwork_specialist'],
    blackwork_specialist: ['dreamshaper_turbo', 'tattoo_flash_art']
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

    dreamshaper_turbo: {
        positive: 'vibrant colors, dynamic composition, illustrative style, clean lines, artistic rendering',
        negative: 'photorealistic, photograph, blurry, low quality, distorted'
    },

    tattoo_flash_art: {
        positive: 'bold lines, traditional tattoo flash art, high contrast, clean outlines, tattoo stencil style, classic composition',
        negative: 'photorealistic, blurry, soft edges, watercolor, low contrast, messy lines'
    },

    anime_xl: {
        positive: 'anime style, vibrant colors, dynamic pose, manga aesthetic, bold outlines, expressive features',
        negative: 'photorealistic, western cartoon, blurry, low quality, distorted anatomy'
    },

    blackwork_specialist: {
        positive: 'high contrast, bold black ink, strong negative space, geometric precision, clean lines, dramatic shadows',
        negative: 'low contrast, soft edges, blurry, watercolor, pastel colors, washed out'
    }
};

/**
 * Model-Specific Negative Prompts
 * Tailored negative prompts for each model to avoid common issues
 */
export const MODEL_NEGATIVE_PROMPTS = {
    imagen3: 'cartoon, anime, illustrated, painting, drawing, sketch, low quality, blurry, distorted, watermark, text, signature, unrealistic anatomy, cluttered background, oversaturated, pixelated, amateur',

    dreamshaper_turbo: 'photorealistic, photograph, blurry, low quality, distorted, watermark, text, signature, unrealistic anatomy, cluttered background, oversaturated, low contrast, pixelated, amateur, messy linework',

    tattoo_flash_art: 'photorealistic, blurry, soft edges, watercolor, low contrast, messy lines, distorted, watermark, text, signature, unrealistic anatomy, cluttered background, oversaturated, pixelated, amateur',

    anime_xl: 'photorealistic, western cartoon, blurry, low quality, distorted anatomy, watermark, text, signature, unrealistic proportions, cluttered background, oversaturated, low contrast, pixelated, amateur, messy linework',

    blackwork_specialist: 'low contrast, soft edges, blurry, watercolor, pastel colors, washed out, distorted, watermark, text, signature, unrealistic anatomy, cluttered background, oversaturated, pixelated, amateur, messy linework'
};

/**
 * Complexity-Based Model Adjustments
 * Adjust model selection based on prompt complexity
 */
export const COMPLEXITY_ADJUSTMENTS = {
    simple: {
        // For simple designs, prefer faster models
        preferFast: true,
        modelPreference: ['dreamshaper_turbo', 'tattoo_flash_art']
    },
    moderate: {
        // Moderate complexity, use style-appropriate model
        preferFast: false,
        modelPreference: null // Use style-based selection
    },
    complex: {
        // Complex designs may benefit from higher quality models
        preferFast: false,
        modelPreference: ['imagen3', 'anime_xl', 'blackwork_specialist']
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

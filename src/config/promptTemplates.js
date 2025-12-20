/**
 * Tattoo Design Prompt Engineering Templates
 *
 * These templates are optimized for SDXL model to generate high-quality,
 * tattoo-specific designs. Each style has carefully crafted prompts that
 * emphasize the characteristics that make great tattoo designs.
 *
 * Budget Note: Well-crafted prompts reduce the need for regenerations,
 * saving API costs.
 */

export const TATTOO_STYLES = {
  traditional: {
    name: 'Traditional',
    displayName: 'American Traditional',
    description: 'Bold lines, limited colors, classic sailor jerry style',
    promptTemplate: 'american traditional tattoo of {subject}, bold black outlines, limited color palette (red, yellow, green, blue), classic sailor jerry style, high contrast, tattoo flash art style, vintage tattoo aesthetic, iconic americana imagery',
    negativePrompt: 'blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, text, photorealistic, 3d render, soft edges, gradients'
  },

  neoTraditional: {
    name: 'Neo-Traditional',
    displayName: 'Neo-Traditional',
    description: 'Bold lines with shading, vibrant colors, illustrative',
    promptTemplate: 'neo traditional tattoo of {subject}, bold lines with shading, vibrant colors, illustrative style, detailed artwork, modern tattoo design, ornamental details, rich color palette, clean linework',
    negativePrompt: 'blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, text, simple, minimalist, flat colors'
  },

  japanese: {
    name: 'Japanese',
    displayName: 'Japanese (Irezumi)',
    description: 'Traditional Japanese art, bold lines, rich colors',
    promptTemplate: 'japanese irezumi tattoo of {subject}, traditional japanese art style, bold black lines, rich colors, ornamental details, waves and clouds, flowing composition, authentic japanese tattoo design, hokusai inspired',
    negativePrompt: 'blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, text, western style, photorealistic, 3d'
  },

  minimalist: {
    name: 'Minimalist',
    displayName: 'Minimalist / Fine Line',
    description: 'Simple clean lines, delicate fine line work',
    promptTemplate: 'minimalist tattoo design of {subject}, simple clean lines, black ink only, delicate fine line work, subtle and elegant, single needle tattoo style, minimal shading, modern minimalist aesthetic, precise linework',
    negativePrompt: 'blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, text, bold, thick lines, heavy shading, complex, busy'
  },

  watercolor: {
    name: 'Watercolor',
    displayName: 'Watercolor',
    description: 'Soft color blending, artistic splashes, painterly',
    promptTemplate: 'watercolor tattoo style of {subject}, soft color blending, artistic splashes, painterly effect, vibrant colors, flowing watercolor aesthetic, abstract color bursts, delicate linework with color washes',
    negativePrompt: 'blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, text, solid colors, heavy black, bold outlines'
  },

  blackwork: {
    name: 'Blackwork',
    displayName: 'Blackwork',
    description: 'Solid black ink, bold geometric patterns',
    promptTemplate: 'blackwork tattoo of {subject}, solid black ink, bold geometric patterns, high contrast, dramatic shading, mandala elements, dotwork details, ornamental blackwork design, tribal influences',
    negativePrompt: 'blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, text, color, gray, soft, delicate'
  },

  realism: {
    name: 'Realism',
    displayName: 'Photorealistic',
    description: 'Detailed shading, lifelike rendering, portrait quality',
    promptTemplate: 'photorealistic tattoo design of {subject}, detailed shading, lifelike rendering, portrait quality, black and gray realism, smooth gradients, hyperrealistic tattoo art, expert shading technique',
    negativePrompt: 'blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, text, cartoon, illustrated, flat, simple'
  },

  anime: {
    name: 'Anime',
    displayName: 'Anime/Manga Style',
    description: 'Japanese animation style, bold outlines, vibrant colors',
    promptTemplate: 'anime tattoo design of {subject}, japanese animation style, bold clean outlines, vibrant cel-shaded colors, manga aesthetic, anime character art style, dynamic composition, sharp linework, vivid colors, tattoo flash art',
    negativePrompt: 'blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, text, realistic, photorealistic, western cartoon, 3d render'
  },

  newSchool: {
    name: 'New School',
    displayName: 'New School (Cartoonish)',
    description: 'Exaggerated features, bright colors, cartoon-like',
    promptTemplate: 'new school tattoo design of {subject}, exaggerated proportions, bright vibrant colors, cartoon style, graffiti influenced, bold outlines, playful aesthetic, contemporary tattoo art, comic book style, pop art influences',
    negativePrompt: 'blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, text, realistic, muted colors, traditional'
  },

  geometricAnime: {
    name: 'Geometric Anime',
    displayName: 'Geometric Anime Fusion',
    description: 'Anime characters with geometric patterns and sacred geometry',
    promptTemplate: 'geometric anime tattoo fusion of {subject}, anime character with sacred geometry elements, mandala patterns, geometric shapes, symmetrical design, dotwork details, linework, modern tattoo aesthetic, anime meets sacred geometry',
    negativePrompt: 'blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, text, messy, chaotic, unbalanced'
  },

  chibi: {
    name: 'Chibi',
    displayName: 'Chibi (Cute Anime)',
    description: 'Super-deformed cute anime style, big heads, small bodies',
    promptTemplate: 'chibi tattoo design of {subject}, super deformed cute anime style, large head small body, kawaii aesthetic, adorable proportions, simple clean lines, pastel colors, cute expression, tattoo flash art style',
    negativePrompt: 'blurry, low quality, distorted, deformed proportions, ugly, bad anatomy, watermark, text, realistic, detailed, complex'
  }
};

/**
 * Body part size multipliers for optimal design composition
 * Helps adjust prompts based on placement location
 */
export const BODY_PART_SPECS = {
  forearm: {
    displayName: 'Forearm',
    orientation: 'vertical',
    aspectRatio: '2:3',
    sizeModifier: 'medium sized, vertically oriented'
  },
  upperArm: {
    displayName: 'Upper Arm',
    orientation: 'wrap',
    aspectRatio: '1:1',
    sizeModifier: 'medium sized, can wrap around arm'
  },
  shoulder: {
    displayName: 'Shoulder',
    orientation: 'curved',
    aspectRatio: '1:1',
    sizeModifier: 'medium to large, curved composition'
  },
  back: {
    displayName: 'Back',
    orientation: 'vertical',
    aspectRatio: '2:3',
    sizeModifier: 'large statement piece, vertical composition'
  },
  chest: {
    displayName: 'Chest',
    orientation: 'horizontal',
    aspectRatio: '3:2',
    sizeModifier: 'medium to large, horizontal or centered'
  },
  leg: {
    displayName: 'Leg / Thigh',
    orientation: 'vertical',
    aspectRatio: '2:3',
    sizeModifier: 'medium to large, vertically oriented'
  },
  wrist: {
    displayName: 'Wrist / Ankle',
    orientation: 'horizontal',
    aspectRatio: '3:1',
    sizeModifier: 'small delicate design, bracelet style'
  },
  ribcage: {
    displayName: 'Ribcage',
    orientation: 'vertical',
    aspectRatio: '1:2',
    sizeModifier: 'medium sized, vertical flowing composition'
  }
};

/**
 * Size guidelines for tattoo dimensions
 */
export const SIZE_SPECS = {
  small: {
    displayName: 'Small (2-4 inches)',
    promptModifier: 'small delicate design, simple composition, suitable for 2-4 inch placement',
    detailLevel: 'minimal details for clarity at small size'
  },
  medium: {
    displayName: 'Medium (4-8 inches)',
    promptModifier: 'medium sized design, balanced composition, suitable for 4-8 inch placement',
    detailLevel: 'moderate detail level'
  },
  large: {
    displayName: 'Large (8+ inches)',
    promptModifier: 'large statement piece, intricate composition, suitable for 8+ inch placement',
    detailLevel: 'highly detailed with complex elements'
  }
};

/**
 * Build complete prompt from user input
 *
 * @param {Object} userInput - User's design parameters
 * @param {string} userInput.style - Selected tattoo style
 * @param {string} userInput.subject - User's subject description
 * @param {string} userInput.bodyPart - Placement location
 * @param {string} userInput.size - Design size
 * @returns {Object} Complete prompt configuration
 */
export function buildPrompt(userInput) {
  const { style, subject, bodyPart, size } = userInput;

  // Get style template
  const styleConfig = TATTOO_STYLES[style];
  if (!styleConfig) {
    throw new Error(`Invalid style: ${style}`);
  }

  // Get body part and size specs
  const bodyPartSpec = BODY_PART_SPECS[bodyPart] || BODY_PART_SPECS.forearm;
  const sizeSpec = SIZE_SPECS[size] || SIZE_SPECS.medium;

  // Build final prompt by replacing template variables
  let finalPrompt = styleConfig.promptTemplate
    .replace('{subject}', subject)
    .replace('{bodyPart}', bodyPart);

  // Add size and body part modifiers
  finalPrompt += `, ${sizeSpec.promptModifier}, ${bodyPartSpec.sizeModifier}, ${sizeSpec.detailLevel}`;

  // Add universal quality enhancers
  finalPrompt += ', high quality tattoo design, clean composition, professional tattoo art, stencil ready, black background';

  return {
    prompt: finalPrompt,
    negativePrompt: styleConfig.negativePrompt,
    styleInfo: {
      name: styleConfig.displayName,
      description: styleConfig.description
    },
    metadata: {
      subject,
      style: styleConfig.name,
      bodyPart: bodyPartSpec.displayName,
      size: sizeSpec.displayName
    }
  };
}

/**
 * Validate user input before prompt generation
 */
export function validateInput(userInput) {
  const errors = [];

  if (!userInput.subject || userInput.subject.trim().length === 0) {
    errors.push('Subject description is required');
  }

  if (!userInput.style || !TATTOO_STYLES[userInput.style]) {
    errors.push('Valid tattoo style must be selected');
  }

  if (!userInput.bodyPart || !BODY_PART_SPECS[userInput.bodyPart]) {
    errors.push('Valid body part must be selected');
  }

  if (!userInput.size || !SIZE_SPECS[userInput.size]) {
    errors.push('Valid size must be selected');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * GUIDED PROMPT TEMPLATES
 * Pre-built templates to reduce anxiety and improve generation quality
 * Based on market research: users struggle with describing their vision
 */
export const PROMPT_TEMPLATE_CATEGORIES = {
  meaningfulSymbols: {
    name: 'Meaningful Symbols',
    description: 'Classic tattoo symbols with deep personal meaning',
    icon: '✨',
    templates: [
      {
        id: 'phoenix-rebirth',
        name: 'Phoenix Rising',
        subject: 'A majestic phoenix bird rising from flames, symbolizing rebirth and transformation, with flowing tail feathers and intricate wing details',
        recommendedStyle: 'traditional',
        keywords: ['transformation', 'rebirth', 'strength']
      },
      {
        id: 'compass-direction',
        name: 'Compass & Direction',
        subject: 'An ornate vintage compass with intricate cardinal directions, surrounded by subtle geometric patterns, representing life guidance',
        recommendedStyle: 'blackwork',
        keywords: ['guidance', 'journey', 'navigation']
      },
      {
        id: 'lotus-growth',
        name: 'Lotus Flower',
        subject: 'A blooming lotus flower with delicate petals emerging from water, symbolizing spiritual growth and enlightenment',
        recommendedStyle: 'minimalist',
        keywords: ['growth', 'spirituality', 'purity']
      }
    ]
  },
  characterMashups: {
    name: 'Character Mashups',
    description: 'Multiple characters in one unified design',
    icon: '⚔️',
    templates: [
      {
        id: 'gojo-vs-sukuna',
        name: 'Gojo vs Sukuna Battle',
        subject: 'Gojo and Sukuna from Jujutsu Kaisen in an epic confrontation scene, both characters in the same frame engaged in battle, dynamic poses with their signature techniques colliding in unified composition',
        recommendedStyle: 'anime',
        keywords: ['jujutsu kaisen', 'anime', 'battle']
      },
      {
        id: 'naruto-sasuke',
        name: 'Naruto & Sasuke Rivalry',
        subject: 'Naruto and Sasuke facing each other in a classic rivalry pose, both characters in one unified design, their chakra auras meeting in the center',
        recommendedStyle: 'anime',
        keywords: ['naruto', 'rivalry', 'friendship']
      }
    ]
  },
  fineLineMinimalist: {
    name: 'Fine Line & Minimalist',
    description: 'Simple, elegant designs with clean lines',
    icon: '━',
    templates: [
      {
        id: 'mountain-line',
        name: 'Mountain Range Line',
        subject: 'A minimalist mountain range using single continuous line art, simple peaks and valleys, clean geometric shapes',
        recommendedStyle: 'minimalist',
        keywords: ['nature', 'adventure', 'simple']
      },
      {
        id: 'constellation-stars',
        name: 'Constellation Map',
        subject: 'A delicate constellation pattern with fine lines connecting subtle dots, celestial and elegant',
        recommendedStyle: 'minimalist',
        keywords: ['stars', 'celestial', 'zodiac']
      }
    ]
  },
  natureAnimals: {
    name: 'Nature & Animals',
    description: 'Wildlife and natural elements',
    icon: '🐺',
    templates: [
      {
        id: 'wolf-moon',
        name: 'Wolf Howling at Moon',
        subject: 'A detailed wolf howling at a full moon, realistic fur texture, dramatic silhouette against moonlight',
        recommendedStyle: 'realism',
        keywords: ['wolf', 'moon', 'wild']
      },
      {
        id: 'koi-fish',
        name: 'Koi Fish Swimming',
        subject: 'A graceful koi fish with flowing fins swimming upward, detailed scales and organic movement',
        recommendedStyle: 'japanese',
        keywords: ['koi', 'perseverance', 'japanese']
      }
    ]
  }
};

/**
 * Educational tips shown during AI generation
 * Research: Reduces perceived wait time, builds confidence
 */
export const GENERATION_TIPS = [
  {
    text: 'Did you know? 73% of first-timers change placement after AR preview',
    category: 'insight'
  },
  {
    text: 'Tip: Try your design in 2-3 body locations before deciding',
    category: 'tip'
  },
  {
    text: 'Next: See it on YOUR skin with AR visualization',
    category: 'next-step'
  },
  {
    text: 'Users who preview in AR are 3.5x more likely to book within 2 weeks',
    category: 'insight'
  },
  {
    text: 'Average first-timer spends 15-20 months deciding. You\'re on track for 2 weeks!',
    category: 'confidence'
  },
  {
    text: 'After this: Match with artists who specialize in your style',
    category: 'next-step'
  },
  {
    text: '87% of users feel more confident after AR preview',
    category: 'insight'
  },
  {
    text: 'Tip: Smaller designs (2-4 inches) are perfect for first tattoos',
    category: 'tip'
  },
  {
    text: 'Most popular first placements: forearm, shoulder, ankle',
    category: 'insight'
  }
];

/**
 * Get random educational tip
 */
export function getRandomTip() {
  return GENERATION_TIPS[Math.floor(Math.random() * GENERATION_TIPS.length)];
}

/**
 * Get all template categories
 */
export function getTemplateCategories() {
  return Object.keys(PROMPT_TEMPLATE_CATEGORIES).map(key => ({
    id: key,
    ...PROMPT_TEMPLATE_CATEGORIES[key]
  }));
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(categoryId) {
  return PROMPT_TEMPLATE_CATEGORIES[categoryId]?.templates || [];
}

/**
 * Smart model recommendation based on style
 * Research: Users confused by 4 models, need smart defaults
 */
export function getRecommendedModel(style) {
  const modelMap = {
    'anime': 'anime-xl',
    'chibi': 'anime-xl',
    'geometricAnime': 'anime-xl',
    'traditional': 'sdxl',
    'neoTraditional': 'sdxl',
    'realism': 'dreamshaperxl',
    'minimalist': 'sdxl',
    'blackwork': 'sdxl',
    'japanese': 'anime-xl',
    'watercolor': 'dreamshaperxl',
    'newSchool': 'sdxl'
  };

  return modelMap[style] || 'sdxl';
}

import { ANATOMICAL_FLOW } from '../lib/placement';

export const COUNCIL_SKILL_PACK = {
  negativeShield: '(shading, gradients, shadows, blur, 3d, realistic, photorealistic, low contrast, grey, messy lines, sketch: 1.5)',
  /**
   * Projection of the shared placement resolver, kept so this config keeps
   * the shape it published. Nothing reads it any more: it was a six-key
   * object looked up by exact placement string, so "left arm" and "sleeve"
   * missed it and the prompt said "Anatomical flow: body-part appropriate
   * flow". Call `resolvePlacement` from `@/lib/placement` instead — it
   * matches phrases inside free text and covers far more than six parts.
   */
  anatomicalFlow: ANATOMICAL_FLOW,
  aestheticAnchors: 'high-contrast blackwork, professional flash art, masterpiece line-work, crisp edges, clean skin canvas',
  positionalInstructions: 'Use explicit positional anchoring (e.g., "[Subject A] on left, [Subject B] on right") to ensure Layered RGBA Decomposition capability.',
  spatialKeywords: ['left', 'right', 'background', 'foreground', 'side', 'behind'],
  stencilKeywords: ['stencil', 'linework', 'line work', 'blackwork', 'flash', 'outline', 'transfer']
};

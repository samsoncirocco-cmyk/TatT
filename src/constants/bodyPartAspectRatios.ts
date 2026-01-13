/**
 * Body Part Aspect Ratios & Configuration
 * Defines anatomically-accurate aspect ratios for tattoo placement
 */

export type BodyPart =
    | 'forearm'
    | 'chest'
    | 'back'
    | 'thigh'
    | 'shoulder'
    | 'full-sleeve'
    | 'ribs'
    | 'calf';

export interface BodyPartConfig {
    id: BodyPart;
    label: string;
    aspectRatio: number; // width / height
    width: number;       // relative width for aspect ratio calculation
    height: number;      // relative height for aspect ratio calculation
    silhouette: string;  // Silhouette component identifier
    description: string;
    icon: string;        // Emoji or icon identifier
    category: 'arm' | 'torso' | 'leg';
}

export const BODY_PART_CONFIGS: Record<BodyPart, BodyPartConfig> = {
    forearm: {
        id: 'forearm',
        label: 'Forearm',
        aspectRatio: 1 / 3,
        width: 1,
        height: 3,
        silhouette: 'ForearmSilhouette',
        description: 'Vertical placement, ideal for sleeves and bands',
        icon: '💪',
        category: 'arm',
    },
    chest: {
        id: 'chest',
        label: 'Chest',
        aspectRatio: 4 / 5,
        width: 4,
        height: 5,
        silhouette: 'ChestSilhouette',
        description: 'Square-ish canvas, great for centered designs',
        icon: '🫀',
        category: 'torso',
    },
    back: {
        id: 'back',
        label: 'Back',
        aspectRatio: 3 / 4,
        width: 3,
        height: 4,
        silhouette: 'BackSilhouette',
        description: 'Portrait orientation, large canvas area',
        icon: '🔙',
        category: 'torso',
    },
    thigh: {
        id: 'thigh',
        label: 'Thigh',
        aspectRatio: 2 / 3,
        width: 2,
        height: 3,
        silhouette: 'ThighSilhouette',
        description: 'Portrait design, medium-large placement',
        icon: '🦵',
        category: 'leg',
    },
    shoulder: {
        id: 'shoulder',
        label: 'Shoulder',
        aspectRatio: 1 / 1,
        width: 1,
        height: 1,
        silhouette: 'ShoulderSilhouette',
        description: 'Square canvas, circular designs work well',
        icon: '💪',
        category: 'arm',
    },
    'full-sleeve': {
        id: 'full-sleeve',
        label: 'Full Sleeve',
        aspectRatio: 1 / 4,
        width: 1,
        height: 4,
        silhouette: 'FullSleeveSilhouette',
        description: 'Long vertical canvas, from shoulder to wrist',
        icon: '🎨',
        category: 'arm',
    },
    ribs: {
        id: 'ribs',
        label: 'Ribs',
        aspectRatio: 2 / 3,
        width: 2,
        height: 3,
        silhouette: 'RibsSilhouette',
        description: 'Side placement, portrait orientation',
        icon: '🫁',
        category: 'torso',
    },
    calf: {
        id: 'calf',
        label: 'Calf',
        aspectRatio: 1 / 2.5,
        width: 1,
        height: 2.5,
        silhouette: 'CalfSilhouette',
        description: 'Lower leg, vertical placement',
        icon: '🦿',
        category: 'leg',
    },
};

// Helper to get all body parts as array
export const BODY_PARTS = Object.values(BODY_PART_CONFIGS);

// Helper to get body parts by category
export const getBodyPartsByCategory = (category: BodyPartConfig['category']) => {
    return BODY_PARTS.filter(part => part.category === category);
};

// Default body part
export const DEFAULT_BODY_PART: BodyPart = 'forearm';

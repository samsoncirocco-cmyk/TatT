/**
 * Storage Types
 *
 * Shared types for design storage abstraction.
 * Supports both localStorage (anonymous) and Firestore (authenticated).
 */

// Re-export Layer from canvasService to avoid duplication
export type { Layer } from '../canvasService';

/**
 * Design version structure
 * Matches existing versionService.ts schema
 */
export interface DesignVersion {
    id: string;
    versionNumber: number;
    timestamp: string;
    prompt?: string;
    enhancedPrompt?: string;
    parameters?: Record<string, any>;
    imageUrl?: string;
    layers?: import('../canvasService').Layer[];
    branchedFrom?: {
        sessionId?: string;
        versionId?: string;
        versionNumber?: number;
    } | null;
    mergedFrom?: {
        version1?: string;
        version2?: string;
        mergeOptions?: Record<string, any>;
    } | null;
    isFavorite?: boolean;
}

/**
 * Design metadata for Firestore document
 * Represents the top-level design entity
 */
export interface Design {
    id: string;
    createdAt: string;
    updatedAt: string;
    currentVersionId?: string;
    bodyPart: string;
    canvas: {
        width: number;
        height: number;
        aspectRatio: number;
    };
    isFavorite: boolean;
}

/**
 * Lightweight design metadata for list views
 */
export interface DesignMetadata {
    id: string;
    createdAt: string;
    updatedAt: string;
    bodyPart: string;
    isFavorite: boolean;
    versionCount: number;
}

/**
 * User preferences
 */
export interface UserPreferences {
    autoSaveEnabled: boolean;
    maxVersions: number;
    defaultBodyPart: string;
}

/**
 * Default user preferences
 */
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
    autoSaveEnabled: true,
    maxVersions: 50,
    defaultBodyPart: 'forearm'
};

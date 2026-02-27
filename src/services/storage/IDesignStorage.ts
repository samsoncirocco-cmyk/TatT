/**
 * Design Storage Interface
 *
 * Abstraction layer for design persistence.
 * Allows swapping between localStorage (anonymous) and Firestore (authenticated)
 * without changing consumer code.
 */

import type { Design, DesignVersion, DesignMetadata, UserPreferences, Layer } from './types';

/**
 * Storage abstraction interface
 * Implemented by LocalStorageAdapter and FirestoreAdapter
 */
export interface IDesignStorage {
    // Design CRUD
    saveDesign(userId: string, design: Design): Promise<void>;
    loadDesign(userId: string, designId: string): Promise<Design | null>;
    listDesigns(userId: string): Promise<DesignMetadata[]>;
    deleteDesign(userId: string, designId: string): Promise<void>;

    // Version operations
    saveVersion(userId: string, designId: string, version: DesignVersion): Promise<void>;
    loadVersions(userId: string, designId: string, limit?: number): Promise<DesignVersion[]>;
    loadVersion(userId: string, designId: string, versionId: string): Promise<DesignVersion | null>;
    deleteVersion(userId: string, designId: string, versionId: string): Promise<void>;

    // Layer operations (for Firestore subcollection efficiency)
    saveLayers(userId: string, designId: string, versionId: string, layers: Layer[]): Promise<void>;
    loadLayers(userId: string, designId: string, versionId: string): Promise<Layer[]>;

    // User preferences
    savePreferences(userId: string, prefs: UserPreferences): Promise<void>;
    loadPreferences(userId: string): Promise<UserPreferences>;
}

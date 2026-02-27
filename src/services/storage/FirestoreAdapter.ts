/**
 * Firestore Adapter
 *
 * Implements IDesignStorage using Firestore with subcollection architecture.
 * Uses subcollections to avoid the 1MB document limit:
 * - users/{userId}/designs/{designId}
 * - users/{userId}/designs/{designId}/versions/{versionId}
 * - users/{userId}/designs/{designId}/versions/{versionId}/layers/{layerId}
 */

import type {
    Firestore,
    DocumentReference,
    CollectionReference,
    QueryDocumentSnapshot,
    DocumentData
} from 'firebase/firestore';
import {
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    collection,
    query,
    orderBy,
    limit as queryLimit,
    writeBatch,
    serverTimestamp
} from 'firebase/firestore';

import type { IDesignStorage } from './IDesignStorage';
import type { Design, DesignVersion, DesignMetadata, UserPreferences, Layer } from './types';
import { DEFAULT_USER_PREFERENCES } from './types';

/**
 * Firestore implementation of IDesignStorage
 * Uses subcollection architecture for scalability
 */
export class FirestoreAdapter implements IDesignStorage {
    constructor(private db: Firestore) {}

    /**
     * Get design document reference
     */
    private getDesignRef(userId: string, designId: string): DocumentReference {
        return doc(this.db, `users/${userId}/designs/${designId}`);
    }

    /**
     * Get designs collection reference
     */
    private getDesignsCollection(userId: string): CollectionReference {
        return collection(this.db, `users/${userId}/designs`);
    }

    /**
     * Get version document reference
     */
    private getVersionRef(userId: string, designId: string, versionId: string): DocumentReference {
        return doc(this.db, `users/${userId}/designs/${designId}/versions/${versionId}`);
    }

    /**
     * Get versions collection reference
     */
    private getVersionsCollection(userId: string, designId: string): CollectionReference {
        return collection(this.db, `users/${userId}/designs/${designId}/versions`);
    }

    /**
     * Get layers collection reference
     */
    private getLayersCollection(userId: string, designId: string, versionId: string): CollectionReference {
        return collection(this.db, `users/${userId}/designs/${designId}/versions/${versionId}/layers`);
    }

    /**
     * Get preferences document reference
     */
    private getPreferencesRef(userId: string): DocumentReference {
        return doc(this.db, `users/${userId}/preferences/settings`);
    }

    /**
     * Save design metadata (does NOT save versions/layers)
     */
    async saveDesign(userId: string, design: Design): Promise<void> {
        const designRef = this.getDesignRef(userId, design.id);

        const data = {
            ...design,
            updatedAt: serverTimestamp()
        };

        await setDoc(designRef, data, { merge: true });
    }

    /**
     * Load design metadata
     */
    async loadDesign(userId: string, designId: string): Promise<Design | null> {
        const designRef = this.getDesignRef(userId, designId);
        const snapshot = await getDoc(designRef);

        if (!snapshot.exists()) {
            return null;
        }

        const data = snapshot.data();

        // Convert Firestore Timestamp to ISO string
        return {
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
        } as Design;
    }

    /**
     * List all designs for a user
     */
    async listDesigns(userId: string): Promise<DesignMetadata[]> {
        const designsCollection = this.getDesignsCollection(userId);
        const snapshot = await getDocs(designsCollection);

        const metadata: DesignMetadata[] = [];

        for (const docSnapshot of snapshot.docs) {
            const data = docSnapshot.data();

            // Count versions for this design
            const versionsCollection = this.getVersionsCollection(userId, docSnapshot.id);
            const versionsSnapshot = await getDocs(versionsCollection);

            metadata.push({
                id: docSnapshot.id,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
                bodyPart: data.bodyPart,
                isFavorite: data.isFavorite || false,
                versionCount: versionsSnapshot.size
            });
        }

        // Sort by updatedAt descending
        return metadata.sort((a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
    }

    /**
     * Delete design and cascade delete all versions and layers
     * Uses writeBatch for atomicity, handles 500-write batch limit by chunking
     */
    async deleteDesign(userId: string, designId: string): Promise<void> {
        const batch = writeBatch(this.db);
        let batchCount = 0;

        // Helper to commit batch if it reaches limit
        const commitIfNeeded = async () => {
            if (batchCount >= 500) {
                await batch.commit();
                batchCount = 0;
            }
        };

        // Load all versions
        const versionsCollection = this.getVersionsCollection(userId, designId);
        const versionsSnapshot = await getDocs(versionsCollection);

        // Delete all layers for each version
        for (const versionDoc of versionsSnapshot.docs) {
            const layersCollection = this.getLayersCollection(userId, designId, versionDoc.id);
            const layersSnapshot = await getDocs(layersCollection);

            // Delete each layer
            for (const layerDoc of layersSnapshot.docs) {
                batch.delete(layerDoc.ref);
                batchCount++;
                await commitIfNeeded();
            }

            // Delete version
            batch.delete(versionDoc.ref);
            batchCount++;
            await commitIfNeeded();
        }

        // Delete design
        const designRef = this.getDesignRef(userId, designId);
        batch.delete(designRef);
        batchCount++;

        // Final commit
        if (batchCount > 0) {
            await batch.commit();
        }
    }

    /**
     * Save version (strips layers - they go in subcollection)
     */
    async saveVersion(userId: string, designId: string, version: DesignVersion): Promise<void> {
        const versionRef = this.getVersionRef(userId, designId, version.id);

        // Strip layers from version data (they're stored in subcollection)
        const { layers, ...versionData } = version;

        await setDoc(versionRef, versionData, { merge: true });

        // Update parent design's updatedAt
        const designRef = this.getDesignRef(userId, designId);
        await setDoc(
            designRef,
            {
                updatedAt: serverTimestamp(),
                currentVersionId: version.id
            },
            { merge: true }
        );
    }

    /**
     * Load versions (ordered by versionNumber descending)
     * Does NOT auto-load layers (lazy load for performance)
     */
    async loadVersions(userId: string, designId: string, limit?: number): Promise<DesignVersion[]> {
        const versionsCollection = this.getVersionsCollection(userId, designId);

        let q = query(versionsCollection, orderBy('versionNumber', 'desc'));

        if (limit !== undefined && limit > 0) {
            q = query(q, queryLimit(limit));
        }

        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp
            } as DesignVersion;
        });
    }

    /**
     * Load specific version (does NOT auto-load layers)
     */
    async loadVersion(userId: string, designId: string, versionId: string): Promise<DesignVersion | null> {
        const versionRef = this.getVersionRef(userId, designId, versionId);
        const snapshot = await getDoc(versionRef);

        if (!snapshot.exists()) {
            return null;
        }

        const data = snapshot.data();

        return {
            ...data,
            timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp
        } as DesignVersion;
    }

    /**
     * Delete specific version (cascade delete layers)
     */
    async deleteVersion(userId: string, designId: string, versionId: string): Promise<void> {
        const batch = writeBatch(this.db);

        // Delete all layers
        const layersCollection = this.getLayersCollection(userId, designId, versionId);
        const layersSnapshot = await getDocs(layersCollection);

        for (const layerDoc of layersSnapshot.docs) {
            batch.delete(layerDoc.ref);
        }

        // Delete version
        const versionRef = this.getVersionRef(userId, designId, versionId);
        batch.delete(versionRef);

        await batch.commit();
    }

    /**
     * Save layers to subcollection (batch write)
     */
    async saveLayers(userId: string, designId: string, versionId: string, layers: Layer[]): Promise<void> {
        const batch = writeBatch(this.db);
        const layersCollection = this.getLayersCollection(userId, designId, versionId);

        // Batch write all layers
        for (const layer of layers) {
            const layerRef = doc(layersCollection, layer.id);
            batch.set(layerRef, layer);
        }

        await batch.commit();
    }

    /**
     * Load layers from subcollection (ordered by zIndex)
     */
    async loadLayers(userId: string, designId: string, versionId: string): Promise<Layer[]> {
        const layersCollection = this.getLayersCollection(userId, designId, versionId);
        const q = query(layersCollection, orderBy('zIndex', 'asc'));

        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => doc.data() as Layer);
    }

    /**
     * Save user preferences
     */
    async savePreferences(userId: string, prefs: UserPreferences): Promise<void> {
        const prefsRef = this.getPreferencesRef(userId);
        await setDoc(prefsRef, prefs, { merge: true });
    }

    /**
     * Load user preferences (returns defaults if not found)
     */
    async loadPreferences(userId: string): Promise<UserPreferences> {
        const prefsRef = this.getPreferencesRef(userId);
        const snapshot = await getDoc(prefsRef);

        if (!snapshot.exists()) {
            return { ...DEFAULT_USER_PREFERENCES };
        }

        return snapshot.data() as UserPreferences;
    }
}

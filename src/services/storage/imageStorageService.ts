/**
 * Cloud Storage Image Service
 *
 * Handles uploading and retrieving generated tattoo images from Firebase Cloud Storage.
 * Images are stored with permanent URLs and CDN-ready caching metadata.
 *
 * Storage structure:
 * - generated/${userId}/${designId}/${versionId}/design.png
 *
 * Key features:
 * - Immutable image storage with 1-year CDN cache headers
 * - Permanent download URLs (Firebase token-based, not signed URLs)
 * - Upload from external URLs (Replicate/Vertex AI outputs)
 * - Upload from blob data (direct client uploads)
 */

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  getStorage,
  type StorageReference,
} from 'firebase/storage';
import { app } from '../../lib/firebase-client';

// Get Firebase Storage instance
const storage = getStorage(app);

/**
 * Upload generated image from blob/buffer data
 *
 * @param userId - User ID who owns the design
 * @param designId - Design ID
 * @param versionId - Version ID
 * @param imageData - Image data as Blob, ArrayBuffer, or Uint8Array
 * @returns Permanent download URL
 */
export async function uploadGeneratedImage(
  userId: string,
  designId: string,
  versionId: string,
  imageData: Blob | ArrayBuffer | Uint8Array
): Promise<string> {
  try {
    // Construct storage path
    const storagePath = `generated/${userId}/${designId}/${versionId}/design.png`;
    const storageRef = ref(storage, storagePath);

    // Upload with metadata
    const metadata = {
      contentType: 'image/png',
      cacheControl: 'public, max-age=31536000, immutable', // 1 year CDN cache
      customMetadata: {
        userId,
        designId,
        versionId,
        uploadedAt: new Date().toISOString(),
      },
    };

    console.log(`[ImageStorage] Uploading image to ${storagePath}`);
    await uploadBytes(storageRef, imageData, metadata);

    // Get permanent download URL
    const downloadUrl = await getDownloadURL(storageRef);
    console.log(`[ImageStorage] Upload complete. URL: ${downloadUrl.substring(0, 100)}...`);

    return downloadUrl;
  } catch (error) {
    console.error('[ImageStorage] Failed to upload image:', error);
    throw new Error(
      `Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Upload image from external URL
 *
 * Fetches image from external source (e.g., Replicate output URL) and uploads to Cloud Storage.
 * This is the common path: AI services return temporary URLs, we make them permanent.
 *
 * NOTE: This function must run server-side (fetches external URLs).
 *
 * @param userId - User ID who owns the design
 * @param designId - Design ID
 * @param versionId - Version ID
 * @param sourceUrl - External URL to fetch image from
 * @returns Permanent download URL
 */
export async function uploadImageFromUrl(
  userId: string,
  designId: string,
  versionId: string,
  sourceUrl: string
): Promise<string> {
  // Server-side only guard
  if (typeof window !== 'undefined') {
    throw new Error(
      '[ImageStorage] uploadImageFromUrl must run server-side (cannot fetch external URLs from browser)'
    );
  }

  try {
    console.log(`[ImageStorage] Fetching image from external URL: ${sourceUrl.substring(0, 100)}...`);

    // Fetch image from external URL
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    // Convert to blob
    const blob = await response.blob();
    console.log(`[ImageStorage] Fetched ${blob.size} bytes, type: ${blob.type}`);

    // Upload to Cloud Storage
    return await uploadGeneratedImage(userId, designId, versionId, blob);
  } catch (error) {
    console.error('[ImageStorage] Failed to upload image from URL:', error);
    throw new Error(
      `Failed to upload image from URL: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get download URL for an existing image
 *
 * @param userId - User ID who owns the design
 * @param designId - Design ID
 * @param versionId - Version ID
 * @returns Download URL if image exists, null otherwise
 */
export async function getImageUrl(
  userId: string,
  designId: string,
  versionId: string
): Promise<string | null> {
  try {
    const storagePath = `generated/${userId}/${designId}/${versionId}/design.png`;
    const storageRef = ref(storage, storagePath);

    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error: any) {
    // If object doesn't exist, return null (not an error)
    if (error.code === 'storage/object-not-found') {
      console.log(`[ImageStorage] Image not found: ${userId}/${designId}/${versionId}`);
      return null;
    }

    // Other errors should be logged and re-thrown
    console.error('[ImageStorage] Failed to get image URL:', error);
    throw new Error(
      `Failed to get image URL: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Delete an image from Cloud Storage
 *
 * Silently succeeds if image doesn't exist (idempotent operation).
 *
 * @param userId - User ID who owns the design
 * @param designId - Design ID
 * @param versionId - Version ID
 */
export async function deleteImage(
  userId: string,
  designId: string,
  versionId: string
): Promise<void> {
  try {
    const storagePath = `generated/${userId}/${designId}/${versionId}/design.png`;
    const storageRef = ref(storage, storagePath);

    console.log(`[ImageStorage] Deleting image: ${storagePath}`);
    await deleteObject(storageRef);
    console.log(`[ImageStorage] Delete complete`);
  } catch (error: any) {
    // Silently succeed if object doesn't exist
    if (error.code === 'storage/object-not-found') {
      console.log(`[ImageStorage] Image already deleted or never existed: ${userId}/${designId}/${versionId}`);
      return;
    }

    // Other errors should be logged and re-thrown
    console.error('[ImageStorage] Failed to delete image:', error);
    throw new Error(
      `Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Cloud Storage Image Service (Server-Side)
 *
 * Stores generated tattoo images in Google Cloud Storage with CDN-ready caching headers.
 *
 * Storage structure:
 * - generated/${userId}/${designId}/${versionId}/design.png
 *
 * Key features:
 * - Immutable image storage with 1-year CDN cache headers
 * - Permanent URLs (public object URLs, not expiring signed URLs)
 */

import { Storage } from '@google-cloud/storage';

function getBucketName(): string {
  return (
    process.env.GCP_STORAGE_BUCKET ||
    process.env.GCS_BUCKET_NAME ||
    process.env.GCS_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    'tatt-pro-assets'
  );
}

function getProjectId(): string | undefined {
  return process.env.GCP_PROJECT_ID || process.env.GCLOUD_PROJECT;
}

let _storage: Storage | null = null;

function getStorageClient(): Storage {
  if (_storage) return _storage;
  _storage = new Storage({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    projectId: getProjectId(),
  });
  return _storage;
}

async function toBuffer(imageData: Blob | ArrayBuffer | Uint8Array): Promise<Buffer> {
  if (typeof Blob !== 'undefined' && imageData instanceof Blob) {
    const ab = await imageData.arrayBuffer();
    return Buffer.from(ab);
  }
  if (imageData instanceof ArrayBuffer) {
    return Buffer.from(imageData);
  }
  return Buffer.from(imageData);
}

function publicUrl(bucketName: string, objectPath: string): string {
  // For public objects, this is stable.
  return `https://storage.googleapis.com/${bucketName}/${objectPath}`;
}

export async function uploadGeneratedImage(
  userId: string,
  designId: string,
  versionId: string,
  imageData: Blob | ArrayBuffer | Uint8Array
): Promise<string> {
  if (typeof window !== 'undefined') {
    throw new Error('[ImageStorage] uploadGeneratedImage is server-only');
  }

  const bucketName = getBucketName();
  const objectPath = `generated/${userId}/${designId}/${versionId}/design.png`;

  try {
    const buffer = await toBuffer(imageData);
    const storage = getStorageClient();
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(objectPath);

    await file.save(buffer, {
      resumable: false,
      contentType: 'image/png',
      metadata: {
        cacheControl: 'public, max-age=31536000, immutable',
        metadata: {
          userId,
          designId,
          versionId,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    // Permanent URL requirement: make the object public.
    await file.makePublic();

    return publicUrl(bucketName, objectPath);
  } catch (error) {
    console.error('[ImageStorage] Failed to upload image:', error);
    throw new Error(
      `Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function uploadImageFromUrl(
  userId: string,
  designId: string,
  versionId: string,
  sourceUrl: string
): Promise<string> {
  if (typeof window !== 'undefined') {
    throw new Error('[ImageStorage] uploadImageFromUrl is server-only');
  }

  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    const ab = await response.arrayBuffer();
    return uploadGeneratedImage(userId, designId, versionId, ab);
  } catch (error) {
    console.error('[ImageStorage] Failed to upload image from URL:', error);
    throw new Error(
      `Failed to upload image from URL: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function getImageUrl(
  userId: string,
  designId: string,
  versionId: string
): Promise<string | null> {
  if (typeof window !== 'undefined') {
    throw new Error('[ImageStorage] getImageUrl is server-only');
  }

  const bucketName = getBucketName();
  const objectPath = `generated/${userId}/${designId}/${versionId}/design.png`;

  try {
    const storage = getStorageClient();
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(objectPath);

    const [exists] = await file.exists();
    if (!exists) return null;
    return publicUrl(bucketName, objectPath);
  } catch (error) {
    console.error('[ImageStorage] Failed to get image URL:', error);
    throw new Error(
      `Failed to get image URL: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function deleteImage(userId: string, designId: string, versionId: string): Promise<void> {
  if (typeof window !== 'undefined') {
    throw new Error('[ImageStorage] deleteImage is server-only');
  }

  const bucketName = getBucketName();
  const objectPath = `generated/${userId}/${designId}/${versionId}/design.png`;

  try {
    const storage = getStorageClient();
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(objectPath);

    await file.delete({ ignoreNotFound: true });
  } catch (error) {
    console.error('[ImageStorage] Failed to delete image:', error);
    throw new Error(
      `Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}


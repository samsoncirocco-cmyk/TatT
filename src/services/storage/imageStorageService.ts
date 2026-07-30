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

async function retryStorageOperation<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 150));
      }
    }
  }
  throw lastError;
}

export type GeneratedImageRecovery = {
  imageUrl: string;
  actualImageCount: number | null;
};

export async function uploadGeneratedImage(
  userId: string,
  designId: string,
  versionId: string,
  imageData: Blob | ArrayBuffer | Uint8Array,
  generation?: { actualImageCount?: number }
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

    await retryStorageOperation(() =>
      file.save(buffer, {
        resumable: false,
        contentType: 'image/png',
        metadata: {
          cacheControl: 'public, max-age=31536000, immutable',
          metadata: {
            userId,
            designId,
            versionId,
            uploadedAt: new Date().toISOString(),
            ...(typeof generation?.actualImageCount === 'number'
              ? { actualImageCount: String(generation.actualImageCount) }
              : {}),
          },
        },
      })
    );

    // Permanent URL requirement: make the object public. Save and ACL repair
    // retry independently so a successful private stage survives ACL trouble.
    await retryStorageOperation(() => file.makePublic());

    return publicUrl(bucketName, objectPath);
  } catch (error) {
    console.error('[ImageStorage] Failed to upload image:', error);
    throw new Error(
      `Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Recover a deterministically staged generated image. Calling makePublic even
 * when the object exists repairs the partial-success case where save() worked
 * but the ACL update failed, which otherwise produces a public URL that 403s.
 */
export async function recoverGeneratedImage(
  userId: string,
  designId: string,
  versionId: string
): Promise<GeneratedImageRecovery | null> {
  if (typeof window !== 'undefined') {
    throw new Error('[ImageStorage] recoverGeneratedImage is server-only');
  }

  const bucketName = getBucketName();
  const objectPath = `generated/${userId}/${designId}/${versionId}/design.png`;

  try {
    const storage = getStorageClient();
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(objectPath);
    const [exists] = await file.exists();
    if (!exists) return null;

    await retryStorageOperation(() => file.makePublic());
    const [metadata] = await file.getMetadata();
    const imageCountRaw = metadata.metadata?.actualImageCount;
    const parsedImageCount =
      typeof imageCountRaw === 'string' ? Number.parseInt(imageCountRaw, 10) : Number.NaN;

    return {
      imageUrl: publicUrl(bucketName, objectPath),
      actualImageCount:
        Number.isInteger(parsedImageCount) && parsedImageCount > 0 ? parsedImageCount : null,
    };
  } catch (error) {
    console.error('[ImageStorage] Failed to recover image:', error);
    throw new Error(
      `Failed to recover image: ${error instanceof Error ? error.message : 'Unknown error'}`
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

  const recovered = await recoverGeneratedImage(userId, designId, versionId);
  return recovered?.imageUrl ?? null;
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

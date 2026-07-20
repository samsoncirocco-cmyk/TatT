// Route-local GCS upload + usage/quota composition for /api/generate.
// Ported from src/lib/vertex-imagen-client.js (deleted in the contract step):
// the generation module returns images; uploading them to storage is this
// route's job, not the module's (spec: generation-module).
import crypto from 'crypto';
import { Storage } from '@google-cloud/storage';

const VERTEX_COST_PER_IMAGE = Number(process.env.VERTEX_IMAGEN_COST_PER_IMAGE || 0.03);
const VERTEX_DAILY_REQUEST_LIMIT = Number(process.env.VERTEX_DAILY_REQUEST_LIMIT || 0);

const GCS_BUCKET = process.env.GCS_BUCKET;
const GCS_UPLOAD_PREFIX = process.env.GCS_UPLOAD_PREFIX || 'generated';
const SIGNED_URL_TTL_MS = Number(process.env.GCS_SIGNED_URL_TTL_MS || 60 * 60 * 1000);

let storageClient: Storage | undefined;

interface DailyUsage {
  date: string | null;
  requests: number;
  images: number;
  cost: number;
}

const usageState = {
  totalRequests: 0,
  totalImages: 0,
  totalCost: 0,
  lastRequestAt: null as string | null,
  daily: {
    date: null,
    requests: 0,
    images: 0,
    cost: 0
  } as DailyUsage
};

function ensureDailyBucket() {
  const today = new Date().toISOString().split('T')[0];
  if (usageState.daily.date !== today) {
    usageState.daily = {
      date: today,
      requests: 0,
      images: 0,
      cost: 0
    };
  }
}

interface ServiceError extends Error {
  code: string;
  details: unknown;
}

function createServiceError(message: string, code: string, details: unknown = null): ServiceError {
  const error = new Error(message) as ServiceError;
  error.code = code;
  error.details = details;
  return error;
}

function getStorageClient(): Storage {
  if (!storageClient) {
    storageClient = new Storage();
  }
  return storageClient;
}

export function recordUsage(sampleCount: number) {
  ensureDailyBucket();
  usageState.totalRequests += 1;
  usageState.totalImages += sampleCount;
  usageState.totalCost += VERTEX_COST_PER_IMAGE * sampleCount;
  usageState.lastRequestAt = new Date().toISOString();
  usageState.daily.requests += 1;
  usageState.daily.images += sampleCount;
  usageState.daily.cost += VERTEX_COST_PER_IMAGE * sampleCount;
}

export function enforceQuota() {
  ensureDailyBucket();
  if (VERTEX_DAILY_REQUEST_LIMIT > 0 && usageState.daily.requests >= VERTEX_DAILY_REQUEST_LIMIT) {
    throw createServiceError(
      'Vertex AI daily request quota exceeded',
      'VERTEX_QUOTA_EXCEEDED',
      { limit: VERTEX_DAILY_REQUEST_LIMIT }
    );
  }
}

export interface UploadedImage {
  filePath: string;
  url: string;
  size: number;
  contentType: string;
}

export async function uploadGeneratedImage({
  base64,
  mimeType = 'image/png',
  prefix = GCS_UPLOAD_PREFIX,
  metadata = {}
}: {
  base64: string;
  mimeType?: string;
  prefix?: string;
  metadata?: Record<string, string>;
}): Promise<UploadedImage> {
  if (!GCS_BUCKET) {
    throw createServiceError('GCS bucket not configured', 'GCS_NOT_CONFIGURED');
  }

  const buffer = Buffer.from(base64, 'base64');
  const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/webp' ? 'webp' : 'png';
  const fileName = `${prefix}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
  const storage = getStorageClient();
  const bucket = storage.bucket(GCS_BUCKET);
  const file = bucket.file(fileName);

  await file.save(buffer, {
    resumable: false,
    contentType: mimeType,
    metadata: {
      metadata: {
        ...metadata
      }
    }
  });

  const [signedUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + SIGNED_URL_TTL_MS
  });

  return {
    filePath: fileName,
    url: signedUrl,
    size: buffer.length,
    contentType: mimeType
  };
}

// The generation module returns images as data URLs; split them back into
// base64 + mimeType for the GCS upload.
export function decodeDataUrl(dataUrl: string): { base64: string; mimeType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) {
    return { base64: dataUrl, mimeType: 'image/png' };
  }
  return { base64: match[2] || '', mimeType: match[1] || 'image/png' };
}

export async function uploadGeneratedImages(
  images: string[],
  metadata: Record<string, string> = {}
): Promise<{ uploads: UploadedImage[]; urls: string[] }> {
  const uploads = await Promise.all(
    images.map((image) => {
      const { base64, mimeType } = decodeDataUrl(image);
      return uploadGeneratedImage({ base64, mimeType, metadata });
    })
  );

  return {
    uploads,
    urls: uploads.map((upload) => upload.url)
  };
}

export function getUsageSnapshot() {
  ensureDailyBucket();
  return {
    totalRequests: usageState.totalRequests,
    totalImages: usageState.totalImages,
    totalCost: Number(usageState.totalCost.toFixed(4)),
    lastRequestAt: usageState.lastRequestAt,
    daily: {
      ...usageState.daily,
      cost: Number(usageState.daily.cost.toFixed(4))
    },
    costPerImage: VERTEX_COST_PER_IMAGE
  };
}

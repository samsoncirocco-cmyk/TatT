import crypto from 'crypto';
import aiplatform from '@google-cloud/aiplatform';
import { Storage } from '@google-cloud/storage';

const { PredictionServiceClient, helpers } = aiplatform;

const VERTEX_PROJECT_ID = process.env.VERTEX_PROJECT_ID;
const VERTEX_LOCATION = process.env.VERTEX_LOCATION || 'us-central1';
const VERTEX_IMAGEN_MODEL = process.env.VERTEX_IMAGEN_MODEL || 'imagegeneration@006';
const VERTEX_COST_PER_IMAGE = Number(process.env.VERTEX_IMAGEN_COST_PER_IMAGE || 0.03);
const VERTEX_DAILY_REQUEST_LIMIT = Number(process.env.VERTEX_DAILY_REQUEST_LIMIT || 0);

const GCS_BUCKET = process.env.GCS_BUCKET;
const GCS_UPLOAD_PREFIX = process.env.GCS_UPLOAD_PREFIX || 'generated';
const SIGNED_URL_TTL_MS = Number(process.env.GCS_SIGNED_URL_TTL_MS || 60 * 60 * 1000);

let predictionClient;
let storageClient;

const usageState = {
  totalRequests: 0,
  totalImages: 0,
  totalCost: 0,
  lastRequestAt: null,
  daily: {
    date: null,
    requests: 0,
    images: 0,
    cost: 0
  }
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

function createServiceError(message, code, details = null) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

function getPredictionClient() {
  if (!predictionClient) {
    predictionClient = new PredictionServiceClient({
      apiEndpoint: `${VERTEX_LOCATION}-aiplatform.googleapis.com`
    });
  }
  return predictionClient;
}

function getStorageClient() {
  if (!storageClient) {
    storageClient = new Storage();
  }
  return storageClient;
}

function resolveEndpoint() {
  if (!VERTEX_PROJECT_ID) {
    throw createServiceError(
      'Vertex AI project not configured',
      'VERTEX_NOT_CONFIGURED'
    );
  }

  return `projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/${VERTEX_IMAGEN_MODEL}`;
}

function normalizePrediction(predictionValue) {
  const prediction = helpers.fromValue(predictionValue);
  const base64 =
    prediction?.bytesBase64Encoded ||
    prediction?.image?.bytesBase64Encoded ||
    prediction?.image?.imageBytes ||
    prediction?.imageBytes;

  if (!base64) {
    return null;
  }

  const mimeType =
    prediction?.mimeType ||
    prediction?.image?.mimeType ||
    (prediction?.format ? `image/${prediction.format}` : null) ||
    'image/png';

  return {
    base64,
    mimeType
  };
}

async function pollOperation(client, operationName, options = {}) {
  const maxAttempts = options.maxAttempts || 30;
  const intervalMs = options.intervalMs || 2000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const [operation] = await client.operationsClient.getOperation({ name: operationName });
    if (operation?.done) {
      return operation;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw createServiceError('Vertex AI operation timed out', 'VERTEX_TIMEOUT');
}

function recordUsage(sampleCount) {
  ensureDailyBucket();
  usageState.totalRequests += 1;
  usageState.totalImages += sampleCount;
  usageState.totalCost += VERTEX_COST_PER_IMAGE * sampleCount;
  usageState.lastRequestAt = new Date().toISOString();
  usageState.daily.requests += 1;
  usageState.daily.images += sampleCount;
  usageState.daily.cost += VERTEX_COST_PER_IMAGE * sampleCount;
}

function enforceQuota() {
  ensureDailyBucket();
  if (VERTEX_DAILY_REQUEST_LIMIT > 0 && usageState.daily.requests >= VERTEX_DAILY_REQUEST_LIMIT) {
    throw createServiceError(
      'Vertex AI daily request quota exceeded',
      'VERTEX_QUOTA_EXCEEDED',
      { limit: VERTEX_DAILY_REQUEST_LIMIT }
    );
  }
}

async function predictWithRetry(request, retries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = getPredictionClient();
      const [response] = await client.predict(request);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
      const waitMs = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }

  throw createServiceError(
    lastError?.message || 'Vertex AI prediction failed',
    'VERTEX_PREDICT_FAILED',
    { originalError: lastError }
  );
}

export async function generateImagenImages({
  prompt,
  negativePrompt,
  sampleCount = 1,
  aspectRatio = '1:1',
  imageSize,
  safetyFilterLevel = 'block_only_high',
  personGeneration = 'allow_adult',
  outputFormat = 'png',
  seed,
  retries = 3
}) {
  if (!prompt || typeof prompt !== 'string') {
    throw createServiceError('Prompt is required', 'INVALID_PROMPT');
  }

  enforceQuota();

  const endpoint = resolveEndpoint();
  const instances = [
    {
      prompt,
      ...(negativePrompt ? { negativePrompt } : {})
    }
  ];

  const parameters = {
    sampleCount,
    aspectRatio,
    safetyFilterLevel,
    personGeneration,
    outputFormat
  };

  if (imageSize?.width && imageSize?.height) {
    parameters.imageSize = {
      width: imageSize.width,
      height: imageSize.height
    };
  }

  if (typeof seed === 'number') {
    parameters.seed = seed;
  }

  const response = await predictWithRetry(
    {
      endpoint,
      instances: instances.map(instance => helpers.toValue(instance)),
      parameters: helpers.toValue(parameters)
    },
    retries
  );

  let predictions = response?.predictions?.map(normalizePrediction).filter(Boolean) || [];

  if (predictions.length === 0 && response?.name) {
    const operation = await pollOperation(getPredictionClient(), response.name);
    const operationResponse = operation?.response?.value
      ? helpers.fromValue(operation.response.value)
      : null;
    const opPredictions = operationResponse?.predictions || [];
    predictions = opPredictions.map(normalizePrediction).filter(Boolean);
  }

  if (predictions.length === 0) {
    throw createServiceError('Vertex AI returned no images', 'VERTEX_EMPTY_RESPONSE', response);
  }

  recordUsage(predictions.length);

  return predictions;
}

export async function uploadGeneratedImage({ base64, mimeType = 'image/png', prefix = GCS_UPLOAD_PREFIX, metadata = {} }) {
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

export async function generateAndUploadImages(options) {
  const predictions = await generateImagenImages(options);
  const uploads = await Promise.all(
    predictions.map((prediction) =>
      uploadGeneratedImage({
        base64: prediction.base64,
        mimeType: prediction.mimeType,
        metadata: options?.metadata || {}
      })
    )
  );

  return {
    uploads,
    urls: uploads.map(upload => upload.url)
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

/**
 * Layer Decomposition API Route
 *
 * POST /api/v1/layers/decompose
 *
 * Uses Vertex AI Vision object localization to create RGBA layer cutouts.
 * Uploads layer PNGs + thumbnails to GCS (falls back to local storage).
 */

import { Router } from 'express';
import sharp from 'sharp';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { uploadLayer, uploadLayerThumbnail } from '../../services/gcs-service.js';
import { generateLayerId } from '../../lib/layerUtils.js';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_UPLOAD_DIR = path.join(__dirname, '../../../uploads/layers');

async function ensureLocalDir() {
  await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
}

function normalizeName(name) {
  return (name || '').toLowerCase();
}

function classifyObject(name) {
  const lower = normalizeName(name);
  if (lower.includes('person') || lower.includes('face') || lower.includes('animal')) return 'subject';
  if (lower.includes('background') || lower.includes('sky') || lower.includes('ground')) return 'background';
  return 'effect';
}

async function fetchImageBuffer(imageUrl) {
  if (!imageUrl) throw new Error('Missing imageUrl');

  if (imageUrl.startsWith('data:')) {
    const match = imageUrl.match(/^data:(.+?);base64,(.*)$/);
    if (!match) {
      throw new Error('Invalid data URL');
    }
    return Buffer.from(match[2], 'base64');
  }

  if (imageUrl.startsWith('gs://')) {
    const { Storage } = await import('@google-cloud/storage');
    const storage = new Storage({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      projectId: process.env.GCP_PROJECT_ID
    });

    const withoutScheme = imageUrl.replace('gs://', '');
    const [bucketName, ...fileParts] = withoutScheme.split('/');
    const filePath = fileParts.join('/');
    const file = storage.bucket(bucketName).file(filePath);
    const [buffer] = await file.download();
    return buffer;
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function boundingBoxFromVertices(vertices, width, height) {
  const xs = vertices.map(v => v.x || 0);
  const ys = vertices.map(v => v.y || 0);
  const minX = Math.max(0, Math.floor(Math.min(...xs) * width));
  const minY = Math.max(0, Math.floor(Math.min(...ys) * height));
  const maxX = Math.min(width, Math.ceil(Math.max(...xs) * width));
  const maxY = Math.min(height, Math.ceil(Math.max(...ys) * height));

  const boxWidth = Math.max(1, maxX - minX);
  const boxHeight = Math.max(1, maxY - minY);

  return { left: minX, top: minY, width: boxWidth, height: boxHeight };
}

async function saveLocally(buffer, filename) {
  await ensureLocalDir();
  const filepath = path.join(LOCAL_UPLOAD_DIR, filename);
  await fs.writeFile(filepath, buffer);
  return `/uploads/layers/${filename}`;
}

async function uploadLayerWithFallback(buffer, designId, layerType, metadata = {}) {
  try {
    const result = await uploadLayer(buffer, designId, layerType, metadata);
    return result.url;
  } catch (error) {
    const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 12);
    const filename = `${designId}_${layerType}_${hash}.png`;
    return saveLocally(buffer, filename);
  }
}

async function uploadThumbnailWithFallback(buffer, designId, layerType) {
  try {
    const result = await uploadLayerThumbnail(buffer, designId, layerType);
    return result.url;
  } catch (error) {
    const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 12);
    const filename = `${designId}_${layerType}_${hash}_thumb.png`;
    return saveLocally(buffer, filename);
  }
}

router.post('/', async (req, res) => {
  const startTime = Date.now();

  try {
    const { imageUrl, designId, userId } = req.body || {};
    if (!imageUrl || !designId) {
      return res.status(400).json({
        error: 'Missing required fields: imageUrl, designId'
      });
    }

    const imageBuffer = await fetchImageBuffer(imageUrl);
    const sharpImage = sharp(imageBuffer).ensureAlpha();
    const metadata = await sharpImage.metadata();

    if (!metadata.width || !metadata.height) {
      return res.status(400).json({
        error: 'Unable to determine image dimensions'
      });
    }

    const visionClient = new ImageAnnotatorClient();
    const [result] = await visionClient.objectLocalization({
      image: { content: imageBuffer }
    });

    const objects = result.localizedObjectAnnotations || [];
    const sortedObjects = [...objects]
      .filter(obj => obj.score >= 0.6)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const layers = [];

    // Always include background layer as base image
    const backgroundBuffer = await sharpImage.png().toBuffer();
    const backgroundThumb = await sharpImage.resize(64, 64, { fit: 'cover' }).png().toBuffer();
    const backgroundUrl = await uploadLayerWithFallback(backgroundBuffer, designId, 'background', { userId });
    const backgroundThumbUrl = await uploadThumbnailWithFallback(backgroundThumb, designId, 'background');

    layers.push({
      id: generateLayerId(),
      name: 'Background',
      type: 'background',
      imageUrl: backgroundUrl,
      thumbnailUrl: backgroundThumbUrl,
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
      blendMode: 'normal',
      visible: true,
      zIndex: 0
    });

    let zIndex = 1;

    for (const obj of sortedObjects) {
      if (!obj.boundingPoly?.normalizedVertices) continue;
      const box = boundingBoxFromVertices(obj.boundingPoly.normalizedVertices, metadata.width, metadata.height);

      const cropped = await sharpImage.extract({
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height
      }).png().toBuffer();

      const composite = await sharp({
        create: {
          width: metadata.width,
          height: metadata.height,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
      }).composite([{ input: cropped, left: box.left, top: box.top }]).png().toBuffer();

      const thumb = await sharp(composite).resize(64, 64, { fit: 'cover' }).png().toBuffer();

      const layerType = classifyObject(obj.name);
      const layerUrl = await uploadLayerWithFallback(composite, designId, layerType, { userId });
      const thumbUrl = await uploadThumbnailWithFallback(thumb, designId, layerType);

      layers.push({
        id: generateLayerId(),
        name: obj.name || 'Subject',
        type: layerType,
        imageUrl: layerUrl,
        thumbnailUrl: thumbUrl,
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
        blendMode: 'normal',
        visible: true,
        zIndex
      });

      zIndex += 1;
    }

    const durationMs = Date.now() - startTime;

    return res.json({
      layers,
      processingTime: durationMs,
      metadata: {
        detectedObjects: objects.length,
        returnedLayers: layers.length
      }
    });
  } catch (error) {
    console.error('[LayerDecompose] Failed:', error);
    return res.status(500).json({
      error: 'Layer decomposition failed',
      message: error.message
    });
  }
});

export default router;

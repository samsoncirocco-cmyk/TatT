import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { generateLayerId } from '@/lib/layerUtils';
import path from 'path';
import fs from 'fs/promises';
import startCrypto from 'crypto';
import os from 'os';
import { uploadLayer, uploadLayerThumbnail, type GCSUploadResult } from '@/services/gcs-service';
import { generateMask } from '@/lib/segmentation';

export const runtime = 'nodejs';

// Use temp dir for serverless functions
const UPLOAD_DIR = path.join(os.tmpdir(), 'manama-uploads');

async function ensureLocalDir() {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

function normalizeName(name: string) {
    return (name || '').toLowerCase();
}

function classifyObject(name: string) {
    const lower = normalizeName(name);
    if (lower.includes('person') || lower.includes('face') || lower.includes('animal')) return 'subject';
    if (lower.includes('background') || lower.includes('sky') || lower.includes('ground')) return 'background';
    return 'effect';
}

async function fetchImageBuffer(imageUrl: string) {
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
        // @ts-ignore
        const storage = new Storage({
            keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            projectId: process.env.GCP_PROJECT_ID
        });

        const withoutScheme = imageUrl.replace('gs://', '');
        const [bucketName, ...fileParts] = withoutScheme.split('/');
        const filePath = fileParts.join('/');
        const file = storage.bucket(bucketName).file(filePath);
        const [buffer] = await file.download();
        return buffer as Buffer;
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
}

function boundingBoxFromVertices(vertices: any[], width: number, height: number) {
    const xs = vertices.map(v => v.x || 0);
    const ys = vertices.map(v => v.y || 0);
    const minX = Math.max(0, Math.floor(Math.min(...xs) * width));
    const minY = Math.max(0, Math.floor(Math.min(...ys) * height));
    const maxX = Math.min(width, Math.ceil(Math.max(...xs) * width));
    const maxY = Math.min(height, Math.ceil(Math.max(...ys) * height));

    const boxWidth = Math.max(1, maxX - minX);
    const boxHeight = Math.max(1, maxY - minY);

    return { x: minX, y: minY, w: boxWidth, h: boxHeight };
}

async function saveLocally(buffer: Buffer, filename: string) {
    await ensureLocalDir();
    const filepath = path.join(UPLOAD_DIR, filename);
    await fs.writeFile(filepath, buffer);
    return `/uploads/layers/${filename}`;
}

async function uploadLayerWithFallback(buffer: Buffer, designId: string, layerType: string, metadata = {}) {
    try {
        const result = await uploadLayer(buffer, designId, layerType, metadata);
        return result.url;
    } catch (error) {
        console.warn('GCS upload failed, falling back to local temp storage', error);
        const hash = startCrypto.createHash('sha256').update(buffer).digest('hex').slice(0, 12);
        const filename = `${designId}_${layerType}_${hash}.png`;
        return saveLocally(buffer, filename);
    }
}

async function uploadThumbnailWithFallback(buffer: Buffer, designId: string, layerType: string) {
    try {
        const result = await uploadLayerThumbnail(buffer, designId, layerType);
        return result.url;
    } catch (error) {
        const hash = startCrypto.createHash('sha256').update(buffer).digest('hex').slice(0, 12);
        const filename = `${designId}_${layerType}_${hash}_thumb.png`;
        return saveLocally(buffer, filename);
    }
}

export async function POST(req: NextRequest) {
    const startTime = Date.now();

    try {
        const { imageUrl, designId, userId } = await req.json();
        if (!imageUrl || !designId) {
            return NextResponse.json({ error: 'Missing required fields: imageUrl, designId' }, { status: 400 });
        }

        const imageBuffer = await fetchImageBuffer(imageUrl);
        const sharpImage = sharp(imageBuffer).ensureAlpha();
        const metadata = await sharpImage.metadata();

        if (!metadata.width || !metadata.height) {
            return NextResponse.json({ error: 'Unable to determine image dimensions' }, { status: 400 });
        }

        // Vision API for Object Detection
        const visionClient = new ImageAnnotatorClient();
        const [result] = await visionClient.objectLocalization({
            image: { content: imageBuffer }
        });

        const objects = result.localizedObjectAnnotations || [];
        const sortedObjects = [...objects]
            .filter(obj => (obj.score || 0) >= 0.6)
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, 5); // Limit to top 5 objects

        const layers = [];

        // 1. Background Layer (Original Image)
        // In a sophisticated decomposition, we might want to "inpainting" the holes left by objects.
        // For now, we keep the background as the base, and overlay objects.
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

        // Process Objects in Parallel
        const objectPromises = sortedObjects.map(async (obj, index) => {
            if (!obj.boundingPoly?.normalizedVertices) return null;

            const box = boundingBoxFromVertices(obj.boundingPoly.normalizedVertices, metadata.width!, metadata.height!);

            try {
                console.log(`[Decompose] Generating mask for object ${index}: ${obj.name} at [${box.x}, ${box.y}, ${box.w}, ${box.h}]`);

                // Generate Mask via Replicate SAM
                // Note: passing imageBuffer works if Replicate SDK handles it (it typically does by uploading)
                const maskUrl = await generateMask(imageBuffer, box);

                // Download Mask
                const maskResponse = await fetch(maskUrl);
                const maskBuffer = Buffer.from(await maskResponse.arrayBuffer());

                // Composite: Image + Mask (Alpha)
                // 1. Ensure mask is same size as image (SAM usually returns full size)
                // 2. Apply mask to alpha channel

                const maskedImageBuffer = await sharp(imageBuffer)
                    .ensureAlpha()
                    .composite([{
                        input: maskBuffer,
                        blend: 'dest-in' // Keeps image content only where mask is white
                    }])
                    .png()
                    .toBuffer();

                // Crop to bounding box + padding to remove empty space
                // Ideally we get 'tight' bbox from alpha, but using GCV box is a good starting approximation
                // Let's use Sharp's trim() which automatically removes transparent pixels!

                const trimmedImageBuffer = await sharp(maskedImageBuffer)
                    .trim() // Removes transparent border
                    .png()
                    .toBuffer();

                // Get dimensions of trimmed image to place it correctly? 
                // If we use trim(), we lose relative position unless we get trim info.
                // Sharp .trim() doesn't easily return the offset. 
                // Alternative: Extract the GCV box from the masked image.

                const extractedObjectBuffer = await sharp(maskedImageBuffer)
                    .extract({ left: box.x, top: box.y, width: box.w, height: box.h })
                    .png()
                    .toBuffer();

                // Generate thumbnail
                const thumb = await sharp(extractedObjectBuffer)
                    .resize(64, 64, { fit: 'inside' })
                    .png()
                    .toBuffer();

                const layerType = classifyObject(obj.name || '');
                const layerUrl = await uploadLayerWithFallback(extractedObjectBuffer, designId, layerType, { userId });
                const thumbUrl = await uploadThumbnailWithFallback(thumb, designId, layerType);

                return {
                    id: generateLayerId(),
                    name: obj.name || `Object ${index + 1}`,
                    type: layerType,
                    imageUrl: layerUrl,
                    thumbnailUrl: thumbUrl,
                    transform: {
                        x: box.x, // Position based on original coordinates
                        y: box.y,
                        scaleX: 1,
                        scaleY: 1,
                        rotation: 0
                    },
                    blendMode: 'normal',
                    visible: true,
                    zIndex: zIndex + index
                };

            } catch (err) {
                console.error(`[Decompose] Failed to process object ${obj.name}:`, err);
                return null; // Skip this object if masking fails
            }
        });

        const processedLayers = (await Promise.all(objectPromises)).filter(l => l !== null);
        layers.push(...processedLayers);

        const durationMs = Date.now() - startTime;

        return NextResponse.json({
            layers,
            processingTime: durationMs,
            metadata: {
                detectedObjects: objects.length,
                returnedLayers: layers.length
            }
        });

    } catch (error: any) {
        console.error('[LayerDecompose] Failed:', error);
        return NextResponse.json({ error: 'Layer decomposition failed', message: error.message }, { status: 500 });
    }
}

/**
 * Multi-Layer Service (Next.js port)
 *
 * Handles decomposition of multi-image generation results and RGBA channel separation.
 * This is used by the Forge generate flow to prevent localStorage/sessionStorage bloat
 * by uploading derived layers to backend storage.
 */

const PROXY_URL = '/api';
const AUTH_TOKEN =
  process.env.NEXT_PUBLIC_FRONTEND_AUTH_TOKEN || 'dev-token-change-in-production';

type LayerType = 'subject' | 'background' | 'effect';

export interface SeparateRGBAResult {
  rgbUrl: string;
  alphaUrl: string;
  width: number;
  height: number;
}

export interface LayerSpec {
  imageUrl: string;
  type: LayerType;
  name?: string;
  metadata?: Record<string, unknown>;
}

async function uploadLayer(dataUrl: string, filename: string): Promise<string> {
  const response = await fetch(`${PROXY_URL}/v1/upload-layer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AUTH_TOKEN}`
    },
    body: JSON.stringify({
      imageData: dataUrl,
      filename
    })
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Upload failed: ${response.status} ${response.statusText} ${text}`.trim());
  }

  const data = await response.json();
  if (!data?.url) {
    throw new Error('Upload failed: missing url in response');
  }

  return data.url as string;
}

export async function hasAlphaChannel(imageUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(false);

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) return resolve(true);
      }
      resolve(false);
    };

    img.onerror = () => resolve(false);
    img.src = imageUrl;
  });
}

export async function separateRGBAChannels(imageUrl: string): Promise<SeparateRGBAResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to create canvas context');

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // RGB layer (force opaque)
        const rgbData = new Uint8ClampedArray(data);
        for (let i = 3; i < rgbData.length; i += 4) rgbData[i] = 255;
        const rgbImageData = new ImageData(rgbData, canvas.width, canvas.height);
        ctx.putImageData(rgbImageData, 0, 0);
        const rgbDataUrl = canvas.toDataURL('image/png');

        // Alpha layer (grayscale alpha)
        const alphaData = new Uint8ClampedArray(data.length);
        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          alphaData[i] = alpha;
          alphaData[i + 1] = alpha;
          alphaData[i + 2] = alpha;
          alphaData[i + 3] = 255;
        }
        const alphaImageData = new ImageData(alphaData, canvas.width, canvas.height);
        ctx.putImageData(alphaImageData, 0, 0);
        const alphaDataUrl = canvas.toDataURL('image/png');

        const timestamp = Date.now();
        const [rgbUrl, alphaUrl] = await Promise.all([
          uploadLayer(rgbDataUrl, `rgb_${timestamp}.png`),
          uploadLayer(alphaDataUrl, `alpha_${timestamp}.png`)
        ]);

        resolve({
          rgbUrl,
          alphaUrl,
          width: canvas.width,
          height: canvas.height
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

export function inferLayerType(
  index: number,
  metadata?: { layerTypes?: string[] }
): LayerType {
  if (metadata?.layerTypes?.[index]) {
    return metadata.layerTypes[index] as LayerType;
  }
  if (index === 0) return 'subject';
  if (index === 1) return 'background';
  return 'effect';
}

export function generateLayerName(
  type: LayerType,
  index: number,
  prompt: string = ''
): string {
  const typeLabels: Record<LayerType, string> = {
    subject: 'Subject',
    background: 'Background',
    effect: 'Effect'
  };

  const words = (prompt || '')
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3 && !['with', 'and', 'the'].includes(w));

  const baseName = typeLabels[type];
  if (words.length > 0 && index < words.length) {
    const term = words[index].charAt(0).toUpperCase() + words[index].slice(1);
    return `${baseName} (${term})`;
  }
  return `${baseName} ${index + 1}`;
}

export async function processGenerationResult(
  result: any,
  options: { separateAlpha?: boolean; autoDetectAlpha?: boolean } = {}
): Promise<LayerSpec[]> {
  const { separateAlpha = false, autoDetectAlpha = true } = options;

  if (!result?.images?.length) return [];

  const layerSpecs: LayerSpec[] = [];
  const metadata = result.metadata || {};
  const prompt = metadata.prompt || result.userInput?.subject || '';

  for (let i = 0; i < result.images.length; i += 1) {
    const imageUrl: string = result.images[i];
    const layerType = inferLayerType(i, metadata);

    const shouldProcessRGBA = Boolean(metadata.rgbaReady) && (separateAlpha || autoDetectAlpha);

    if (shouldProcessRGBA) {
      try {
        const hasAlpha = await hasAlphaChannel(imageUrl);
        if (hasAlpha && separateAlpha) {
          const separated = await separateRGBAChannels(imageUrl);

          layerSpecs.push({
            imageUrl: separated.rgbUrl,
            type: layerType,
            name: generateLayerName(layerType, i, prompt),
            metadata: {
              source: 'rgba_rgb',
              originalIndex: i,
              width: separated.width,
              height: separated.height
            }
          });

          layerSpecs.push({
            imageUrl: separated.alphaUrl,
            type: 'effect',
            name: `Alpha Mask ${i + 1}`,
            metadata: {
              source: 'rgba_alpha',
              originalIndex: i,
              width: separated.width,
              height: separated.height
            }
          });

          continue;
        }
      } catch (error) {
        console.warn(`[MultiLayer] RGBA processing failed for image ${i + 1}:`, error);
      }
    }

    layerSpecs.push({
      imageUrl,
      type: layerType,
      name: generateLayerName(layerType, i, prompt),
      metadata: {
        source: 'direct',
        originalIndex: i,
        hasAlpha: false
      }
    });
  }

  return layerSpecs;
}

export async function addMultipleLayers(layerSpecs: LayerSpec[], addLayerFn: any) {
  const createdLayers: any[] = [];
  const orderedSpecs = [...layerSpecs].sort((a, b) => {
    const order: Record<LayerType, number> = { background: 0, subject: 1, effect: 2 };
    return order[a.type] - order[b.type];
  });

  for (const spec of orderedSpecs) {
    try {
      const layer = await addLayerFn(spec.imageUrl, spec.type);
      if (spec.name && layer?.name !== spec.name) {
        layer.name = spec.name;
      }
      if (spec.metadata) {
        layer.metadata = spec.metadata;
      }
      createdLayers.push(layer);
    } catch (error) {
      console.error('[MultiLayer] Failed to add layer:', error);
    }
  }

  return createdLayers;
}

export function shouldUseMultiLayer(result: any) {
  if (!result?.images) return false;
  if (result.images.length > 1) return true;
  if (result.metadata?.rgbaReady) return true;
  return false;
}


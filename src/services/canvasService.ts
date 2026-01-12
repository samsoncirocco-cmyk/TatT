/**
 * Canvas Service - Layer Management
 * 
 * Core service for managing canvas layers, rendering, and operations
 */

/**
 * Layer data structure
 */
export interface Layer {
    id: string;
    name: string;
    type: 'subject' | 'background' | 'effect';
    imageUrl: string;
    transform: {
        x: number;
        y: number;
        scaleX: number;
        scaleY: number;
        rotation: number;
    };
    blendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
    visible: boolean;
    zIndex: number;
    thumbnail?: string;
}

/**
 * Generate unique layer ID
 */
export function generateLayerId(): string {
    return `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate auto layer name based on type and existing layers
 */
export function generateLayerName(type: Layer['type'], existingLayers: Layer[]): string {
    const sameType = existingLayers.filter(l => l.type === type);
    const count = sameType.length + 1;

    const typeNames = {
        subject: 'Subject',
        background: 'Background',
        effect: 'Effect'
    };

    return `${typeNames[type]} ${count}`;
}

/**
 * Create a new layer
 */
export function createLayer(
    imageUrl: string,
    type: Layer['type'] = 'subject',
    existingLayers: Layer[] = []
): Layer {
    const maxZIndex = existingLayers.length > 0
        ? Math.max(...existingLayers.map(l => l.zIndex))
        : 0;

    return {
        id: generateLayerId(),
        name: generateLayerName(type, existingLayers),
        type,
        imageUrl,
        transform: {
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            rotation: 0
        },
        blendMode: 'normal',
        visible: true,
        zIndex: maxZIndex + 1
    };
}

/**
 * Reorder layers by updating z-index values
 */
export function reorderLayers(layers: Layer[], fromIndex: number, toIndex: number): Layer[] {
    const reordered = [...layers];
    const [movedLayer] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, movedLayer);

    // Update z-index values based on new order
    return reordered.map((layer, index) => ({
        ...layer,
        zIndex: index
    }));
}

/**
 * Toggle layer visibility
 */
export function toggleLayerVisibility(layers: Layer[], layerId: string): Layer[] {
    return layers.map(layer =>
        layer.id === layerId
            ? { ...layer, visible: !layer.visible }
            : layer
    );
}

/**
 * Update layer name
 */
export function updateLayerName(layers: Layer[], layerId: string, newName: string): Layer[] {
    return layers.map(layer =>
        layer.id === layerId
            ? { ...layer, name: newName }
            : layer
    );
}

/**
 * Update layer image URL
 */
export function updateLayerImage(layers: Layer[], layerId: string, imageUrl: string): Layer[] {
    return layers.map(layer =>
        layer.id === layerId
            ? { ...layer, imageUrl }
            : layer
    );
}

/**
 * Remove layer
 */
export function removeLayer(layers: Layer[], layerId: string): Layer[] {
    const filtered = layers.filter(layer => layer.id !== layerId);

    // Re-index remaining layers
    return filtered.map((layer, index) => ({
        ...layer,
        zIndex: index
    }));
}

/**
 * Bring layer to front
 */
export function bringToFront(layers: Layer[], layerId: string): Layer[] {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return layers;

    const maxZIndex = Math.max(...layers.map(l => l.zIndex));

    return layers.map(l =>
        l.id === layerId
            ? { ...l, zIndex: maxZIndex + 1 }
            : l
    );
}

/**
 * Send layer to back
 */
export function sendToBack(layers: Layer[], layerId: string): Layer[] {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return layers;

    const minZIndex = Math.min(...layers.map(l => l.zIndex));

    return layers.map(l =>
        l.id === layerId
            ? { ...l, zIndex: minZIndex - 1 }
            : l
    );
}

/**
 * Get layers sorted by z-index (for rendering)
 */
export function getLayersByZIndex(layers: Layer[]): Layer[] {
    return [...layers].sort((a, b) => a.zIndex - b.zIndex);
}

/**
 * Generate thumbnail from image URL
 */
export async function generateThumbnail(imageUrl: string, size: number = 64): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }

            // Calculate thumbnail dimensions maintaining aspect ratio
            const aspectRatio = img.width / img.height;
            let thumbWidth = size;
            let thumbHeight = size;

            if (aspectRatio > 1) {
                thumbHeight = size / aspectRatio;
            } else {
                thumbWidth = size * aspectRatio;
            }

            canvas.width = size;
            canvas.height = size;

            // Center the image
            const x = (size - thumbWidth) / 2;
            const y = (size - thumbHeight) / 2;

            ctx.drawImage(img, x, y, thumbWidth, thumbHeight);
            resolve(canvas.toDataURL());
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageUrl;
    });
}

/**
 * Update layer transform properties
 */
export function updateLayerTransform(
    layers: Layer[],
    layerId: string,
    transform: Partial<Layer['transform']>
): Layer[] {
    return layers.map(layer =>
        layer.id === layerId
            ? { ...layer, transform: { ...layer.transform, ...transform } }
            : layer
    );
}

/**
 * Flip layer horizontally
 */
export function flipLayerHorizontal(layers: Layer[], layerId: string): Layer[] {
    return layers.map(layer =>
        layer.id === layerId
            ? {
                ...layer,
                transform: {
                    ...layer.transform,
                    scaleX: layer.transform.scaleX * -1
                }
            }
            : layer
    );
}

/**
 * Flip layer vertically
 */
export function flipLayerVertical(layers: Layer[], layerId: string): Layer[] {
    return layers.map(layer =>
        layer.id === layerId
            ? {
                ...layer,
                transform: {
                    ...layer.transform,
                    scaleY: layer.transform.scaleY * -1
                }
            }
            : layer
    );
}

/**
 * Update layer blend mode
 */
export function updateLayerBlendMode(
    layers: Layer[],
    layerId: string,
    blendMode: Layer['blendMode']
): Layer[] {
    return layers.map(layer =>
        layer.id === layerId
            ? { ...layer, blendMode }
            : layer
    );
}

/**
 * Apply canvas blend mode using CSS composite operations
 * Maps our blend mode names to CSS globalCompositeOperation values
 */
export function getCompositeOperation(blendMode: Layer['blendMode']): GlobalCompositeOperation {
    const blendModeMap: Record<Layer['blendMode'], GlobalCompositeOperation> = {
        'normal': 'source-over',
        'multiply': 'multiply',
        'screen': 'screen',
        'overlay': 'overlay'
    };

    return blendModeMap[blendMode] || 'source-over';
}

/**
 * Composite all layers into a single canvas
 * Respects visibility, z-index, blend modes, and transforms
 */
export async function compositeLayers(
    layers: Layer[],
    canvasWidth: number,
    canvasHeight: number
): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Failed to get canvas context');
    }

    // Sort by z-index
    const sortedLayers = getLayersByZIndex(layers);

    // Render each visible layer
    for (const layer of sortedLayers) {
        if (!layer.visible) continue;

        try {
            const img = await loadImage(layer.imageUrl);

            ctx.save();

            // Set blend mode
            ctx.globalCompositeOperation = getCompositeOperation(layer.blendMode);

            // Apply transforms
            ctx.translate(
                canvasWidth / 2 + layer.transform.x,
                canvasHeight / 2 + layer.transform.y
            );
            ctx.rotate((layer.transform.rotation * Math.PI) / 180);
            ctx.scale(layer.transform.scaleX, layer.transform.scaleY);

            // Draw image centered
            ctx.drawImage(
                img,
                -img.width / 2,
                -img.height / 2,
                img.width,
                img.height
            );

            ctx.restore();
        } catch (error) {
            console.error(`Failed to render layer ${layer.id}:`, error);
        }
    }

    return canvas;
}

/**
 * Load image from URL
 */
function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        img.src = url;
    });
}

/**
 * Export composited layers as PNG blob
 */
export async function exportAsPNG(
    layers: Layer[],
    canvasWidth: number,
    canvasHeight: number,
    quality: number = 1.0
): Promise<Blob> {
    const canvas = await compositeLayers(layers, canvasWidth, canvasHeight);

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create blob'));
                }
            },
            'image/png',
            quality
        );
    });
}

/**
 * Export as AR-ready transparent PNG (optimized for AR overlay)
 */
export async function exportAsARAsset(
    layers: Layer[],
    canvasWidth: number,
    canvasHeight: number
): Promise<Blob> {
    // AR assets should be 1024x1024 for performance
    const AR_SIZE = 1024;
    const scaleFactor = AR_SIZE / Math.max(canvasWidth, canvasHeight);

    const canvas = await compositeLayers(
        layers,
        Math.round(canvasWidth * scaleFactor),
        Math.round(canvasHeight * scaleFactor)
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create AR asset blob'));
                }
            },
            'image/png',
            0.9 // Slightly compressed for AR performance
        );
    });
}

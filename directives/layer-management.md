# Layer Management

## Goal
Generate, manipulate, and merge multi-layer RGBA tattoo designs for complex compositions (e.g., base + shading + highlights, or foreground + background + effects).

## When to Use
- User wants multi-layer design for advanced editing
- Complex design requires separate outline, fill, and shading layers
- API endpoints:
  - `POST /api/v1/layers/decompose` — Split existing image into layers
  - `POST /api/v1/upload-layer` — Upload single layer
  - `POST /api/v1/storage/upload` — Store merged layers to GCS
- Trigger: User enables "Advanced Mode" or requests layer export

## Prerequisites
- Generated tattoo design (PNG or JPEG)
- Google Cloud Vision API credentials (for segmentation)
- Google Cloud Storage bucket (for layer storage)
- Canvas manipulation library (Konva.js, loaded client-side)

## Steps

### 1. Generate Multi-Layer Design (Vertex Imagen)
**Location:** `src/lib/vertex-imagen-client.ts`

**Layer Types:**
- **Base (Outline):** Black lines only, transparent background
- **Fill:** Solid colors, no outlines
- **Shading:** Grayscale gradients for depth
- **Highlights:** White/light accents for shine

**Generation Approach:**
- **Option A:** Single prompt with layer separation instructions
  - Prompt: "Generate 4 layers: 1) outline only, 2) base colors, 3) shading, 4) highlights"
  - Model: Vertex Imagen 3 (supports RGBA output)
- **Option B:** Sequential generation with masking
  - Step 1: Generate full design
  - Step 2: Use Vision API to extract outlines → Layer 1
  - Step 3: Generate colors masked to outlines → Layer 2
  - Step 4: Generate shading masked to colors → Layer 3

**Output:** 4 separate PNG files with alpha channel

### 2. Decompose Existing Image into Layers
**Location:** `src/services/layerDecompositionService.js`

**Segmentation API Call:**
```typescript
import { ImageAnnotatorClient } from '@google-cloud/vision';

const client = new ImageAnnotatorClient();
const [result] = await client.labelDetection(imageBuffer);

// Use object detection + color analysis
const layers = await segmentLayers(result, {
  separateOutlines: true,
  separateColors: true,
  separateShading: true
});
```

**Segmentation Logic:**
1. **Edge Detection:** Use Sobel filter to find outlines
2. **Color Clustering:** Use K-means to group similar colors
3. **Depth Analysis:** Use luminance to separate shading layers
4. **Alpha Extraction:** Generate transparency mask for each layer

**Output:** Array of layer objects:
```json
[
  {
    "id": "layer_outline",
    "name": "Outline",
    "type": "outline",
    "imageData": "data:image/png;base64,...",
    "opacity": 1.0,
    "blendMode": "normal",
    "visible": true,
    "locked": false
  },
  {
    "id": "layer_fill",
    "name": "Base Colors",
    "type": "fill",
    "imageData": "data:image/png;base64,...",
    "opacity": 1.0,
    "blendMode": "normal",
    "visible": true,
    "locked": false
  }
]
```

### 3. Client-Side Layer Manipulation
**Location:** `src/features/generate/components/ForgeCanvas.tsx` (Konva.js canvas)

**Operations:**
- **Reorder:** Drag layers in stack to change z-index
- **Toggle visibility:** Show/hide individual layers
- **Adjust opacity:** 0-100% transparency slider
- **Blend modes:** Normal, multiply, screen, overlay
- **Transform:** Scale, rotate, translate individual layers
- **Merge:** Combine multiple layers into single layer
- **Delete:** Remove layer from stack

**State Management:**
```typescript
// Zustand store: src/stores/useForgeStore.ts
interface ForgeStore {
  layers: Layer[];
  activeLayerId: string | null;
  addLayer: (layer: Layer) => void;
  removeLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  reorderLayers: (startIndex: number, endIndex: number) => void;
  mergeVisibleLayers: () => Layer;
}
```

### 4. Upload Layers to Storage
**Location:** `src/services/multiLayerService.js` → `uploadLayers()`

**Upload Flow:**
1. Serialize each layer to PNG (with alpha channel)
2. Generate unique filename: `{designId}_layer_{index}_{timestamp}.png`
3. Upload to GCS bucket: `gs://tatt-pro-layers/`
4. Store metadata in Firestore:
   ```json
   {
     "designId": "design_abc",
     "layers": [
       {
         "id": "layer_outline",
         "url": "https://storage.googleapis.com/.../layer_0.png",
         "type": "outline",
         "order": 0,
         "metadata": { "opacity": 1.0, "blendMode": "normal" }
       }
     ],
     "createdAt": "2026-02-08T12:34:56Z",
     "userId": "user_xyz"
   }
   ```

### 5. Merge Layers (Server-Side)
**Location:** `src/services/multiLayerService.js` → `mergeLayers()`

**Merging Logic:**
```typescript
import sharp from 'sharp';

async function mergeLayers(layers: Layer[]): Promise<Buffer> {
  let base = sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4, // RGBA
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    }
  });

  for (const layer of layers.sort((a, b) => a.order - b.order)) {
    if (!layer.visible) continue;

    const layerBuffer = await fetchLayerImage(layer.url);
    const processedLayer = await sharp(layerBuffer)
      .modulate({ brightness: 1.0 - (1.0 - layer.opacity) })
      .toBuffer();

    base = base.composite([{
      input: processedLayer,
      blend: layer.blendMode as any,
      top: 0,
      left: 0
    }]);
  }

  return base.png().toBuffer();
}
```

### 6. Export Merged Design
**Location:** `src/app/api/v1/storage/upload/route.ts`

**Export Options:**
- **PNG:** Lossless, with alpha channel (for stencils)
- **JPEG:** Lossy, no transparency (for artist reference)
- **PSD:** Photoshop format with layers intact (future enhancement)

**Response:**
```json
{
  "mergedUrl": "https://storage.googleapis.com/.../merged_abc.png",
  "layers": [
    {
      "id": "layer_outline",
      "url": "https://storage.googleapis.com/.../layer_0.png"
    }
  ],
  "metadata": {
    "width": 1024,
    "height": 1024,
    "layerCount": 4,
    "fileSize": 567890,
    "format": "png"
  }
}
```

## Expected Output
- **Layered design:** 2-5 separate RGBA layers
- **Layer size:** 1024x1024 px (or custom dimensions)
- **File size:** 100KB - 500KB per layer (PNG with compression)
- **Processing time:** 5-10 seconds for decomposition, 2-3 seconds for merge

## Edge Cases

### Source Image Doesn't Segment Cleanly
- **Issue:** Poor contrast, complex textures make segmentation fail
- **Solution:** Offer manual layer painting (user draws on canvas)
- **Alternative:** Use AI-assisted selection tools (magic wand, lasso)

### Layer Count Exceeds Limit
- **Limit:** Max 10 layers per design (performance constraint)
- **Solution:** Prompt user to merge layers before adding more
- **UI Message:** "Maximum 10 layers reached. Merge some layers to continue."

### Layer Upload Fails (Network Error)
- **Fallback:** Retry with exponential backoff (3 attempts)
- **Alternative:** Save layers locally (IndexedDB) for later upload
- **UI Message:** "Upload failed. Layers saved locally—retry when online."

### Merge Operation Times Out
- **Issue:** Large layers (>2048px) slow down Sharp processing
- **Solution:** Downscale to 1024px before merging, upscale final output
- **Alternative:** Offload to serverless function with higher timeout

### Blend Mode Not Supported by Sharp
- **Limitation:** Sharp only supports basic blend modes (over, in, out, atop, etc.)
- **Solution:** Use Canvas API (node-canvas) for complex blends (screen, overlay, etc.)
- **Trade-off:** Slower but more accurate

### Layer Order Conflicts
- **Issue:** User reorders layers but doesn't update z-index
- **Solution:** Auto-update `order` field based on array index
- **Validation:** Server-side check ensures `order` is contiguous (0, 1, 2, ...)

## Performance Optimization

### Lazy Loading
- Load layer images only when visible in viewport
- Use low-res thumbnails (256x256) for layer preview panel
- Full-res images loaded on demand (when editing)

### Caching
- Cache merged output for 5 minutes (avoid re-merge on page refresh)
- Cache layer thumbnails in browser (localStorage)

### Parallel Processing
- Upload layers to GCS in parallel (Promise.all)
- Generate thumbnails concurrently with full-res upload

### Compression
- Use PNG compression level 9 (smallest file size)
- Consider WebP format for better compression (if browser supports)

## Cost Monitoring

| Operation | Cost | Notes |
|-----------|------|-------|
| Vision API (segmentation) | ~$0.0015/image | Detect objects + labels |
| GCS Storage | ~$0.02/GB/month | 1000 layers = ~200MB = $0.004/month |
| GCS Egress | ~$0.12/GB | First 1GB free per month |
| Sharp Processing | Free | Local compute (serverless) |

**Average Layer Workflow:** ~$0.002 per design (negligible)

## Related Directives
- `generate-tattoo.md` — Generate base design before layering
- `stencil-export.md` — Export merged layers as printable stencil
- `api-endpoints.md` — API reference for layer endpoints

## Future Enhancements
- **AI Layer Suggestions:** Automatically suggest layer splits based on design type
- **Layer Effects:** Add blur, glow, drop shadow to individual layers
- **Version History:** Save layer states for undo/redo (snapshots every 5 actions)
- **Collaborative Editing:** Real-time layer sync across multiple users (WebSockets)

# Layer Management

## Goal
Manage multi-layer tattoo compositions on the Forge canvas, including RGBA channel separation, layer decomposition via Vision API, and persistent storage.

## When to Use
- After generating images with `sampleCount > 1` or RGBA-capable models
- User manually adds/removes/reorders layers on the canvas
- Decomposing a complex image into separate object layers

## Prerequisites
- Zustand store (`useForgeStore`) initialized
- For decomposition: GCP Vision API credentials, GCS bucket
- For upload: `/api/v1/upload-layer` or `/api/v1/storage/upload` endpoint available

## Steps

### Adding Layers from Generation

1. **Check multi-layer eligibility** — `shouldUseMultiLayer(result)` returns true if:
   - Multiple images in the result, OR
   - `metadata.rgbaReady` is set

2. **Process generation result** — `processGenerationResult(result, options)`:
   - For each image, `inferLayerType(index, metadata)` assigns: `subject` (index 0), `background` (index 1), `effect` (index 2+).
   - `generateLayerName(type, index, prompt)` creates descriptive names by extracting key terms from the prompt.

3. **RGBA separation** (if `separateAlpha` or `autoDetectAlpha`):
   - `hasAlphaChannel(imageUrl)` checks for any pixel with alpha < 255.
   - `separateRGBAChannels(imageUrl)` splits into:
     - RGB layer (fully opaque color data)
     - Alpha mask layer (grayscale transparency map)
   - Both layers uploaded via `uploadLayer()` to `/api/v1/upload-layer`.

4. **Batch add** — `addMultipleLayers(layerSpecs, addLayerFn)` adds layers in order: backgrounds → subjects → effects.

### Vision API Decomposition

5. **Decompose endpoint** — `/api/v1/layers/decompose` accepts `imageUrl` and `designId`:
   - Fetches image (supports data URLs, `gs://` paths, HTTP URLs).
   - Runs Google Cloud Vision `objectLocalization` to detect objects (score ≥ 0.6, top 5).
   - For each detected object:
     - Generates segmentation mask via Replicate SAM (`src/lib/segmentation.ts`).
     - Composites mask with source image using Sharp `dest-in` blend.
     - Extracts bounding box region.
     - Uploads to GCS with fallback to local temp storage.
   - Returns layer array with positions, types, and URLs.

### Canvas Operations

6. **Layer data structure** (`canvasService.ts`):
   ```typescript
   interface Layer {
     id: string;           // Unique ID from generateLayerId()
     name: string;         // Auto-generated or user-defined
     type: 'subject' | 'background' | 'effect';
     imageRef: string;     // Reference to forgeImageRegistry
     transform: { x, y, scaleX, scaleY, rotation };
     blendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
     visible: boolean;
     zIndex: number;
   }
   ```

7. **Hook interface** — `useLayerManagement()` exposes:
   - CRUD: `addLayer`, `deleteLayer`, `duplicateLayer`, `clearLayers`, `replaceLayers`
   - Transform: `updateTransform`, `flipHorizontal`, `flipVertical`
   - Order: `reorder`, `moveToFront`, `moveToBack`
   - State: `toggleVisibility`, `rename`, `updateBlendMode`, `updateImage`
   - History: `undo`, `redo`, `clearHistory`
   - Selection: `selectLayer`, `selectedLayerId`

8. **Rendering** — `ForgeCanvas.tsx` renders layers via react-konva in zIndex order.

## Expected Output (Decomposition)
```json
{
  "layers": [
    { "id": "lyr_abc", "name": "Background", "type": "background", "imageUrl": "https://...", "zIndex": 0 },
    { "id": "lyr_def", "name": "Dragon", "type": "subject", "imageUrl": "https://...", "zIndex": 1 }
  ],
  "processingTime": 2400,
  "metadata": { "detectedObjects": 3, "returnedLayers": 2 }
}
```

## Edge Cases
- **GCS upload failure**: Falls back to local temp directory (`os.tmpdir()/manama-uploads/`).
- **SAM mask generation failure**: Skips that object layer (logged, not fatal).
- **No objects detected**: Returns only the background layer.
- **Canvas memory limits**: Mobile devices may fail with images > 4096px — resize before processing.
- **Image registry**: Layers reference images via `forgeImageRegistry.ts` for memory-efficient URL resolution.

## Cost
- **Vision API object detection**: ~$1.50 per 1000 images
- **Replicate SAM segmentation**: ~$0.01 per mask
- **GCS storage**: ~$0.02/GB/month
- **Client-side operations**: $0

import Replicate from 'replicate';
import { generateMaskWithVertex } from './segmentation-vertex';

// Initialize Replicate client
const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

// SAM Model ID (Segment Anything Model)
const SAM_MODEL = "cjwbw/segment-anything:07788b48270c1953bb4d28929e3776ac7639537f71e1641f9d2757529452b414";

/**
 * Generate a segmentation mask for a specific region in an image using SAM.
 *
 * @param imageSource URL of the source image, or a Buffer, or a data URI string
 * @param box Bounding box [x, y, w, h] of the object to segment
 * @returns URL of the generated binary mask image (can be a data URI)
 */
export async function generateMask(imageSource: string | Buffer, box: { x: number, y: number, w: number, h: number }): Promise<string> {
    try {
        // SAM typically expects prompt in format [x_min, y_min, x_max, y_max] or similar specific format depending on the replicate implementation.
        // The 'facebook/segment-anything' model on Replicate often takes 'input_box' as [x1, y1, x2, y2].
        // Let's verify the box format. The function receives x, y, w, h.
        // x, y are usually top-left.
        const x1 = Math.floor(box.x);
        const y1 = Math.floor(box.y);
        const x2 = Math.floor(box.x + box.w);
        const y2 = Math.floor(box.y + box.h);

        // Construct input payload for Replicate (if used)
        const replicateInput = {
            image: imageSource,
            box_prompt: `[${x1},${y1},${x2},${y2}]`, // String format often used in this wrapper
            multimask_output: false
        };

        // 2. Generate Mask
        // Priority: Vertex AI (if configured) -> Replicate (Backup)
        let maskUrl: string | null = null;
        let base64Image = '';

        if (Buffer.isBuffer(imageSource)) {
            base64Image = imageSource.toString('base64');
        } else if (typeof imageSource === 'string' && imageSource.startsWith('data:')) {
            base64Image = imageSource.split(',')[1];
        }

        // Try Vertex AI first (The "Correct" Architecture)
        if (base64Image && process.env.VERTEX_SEGMENTATION_ENDPOINT_ID) {
            try {
                console.log('[Segmentation] Attempting Vertex AI Segmentation...');
                // Calculate box array [x1, y1, x2, y2]
                const boxArray = [Math.floor(box.x), Math.floor(box.y), Math.floor(box.x + box.w), Math.floor(box.y + box.h)];
                const vertexMask = await generateMaskWithVertex(base64Image, boxArray);
                if (vertexMask) {
                    maskUrl = `data:image/png;base64,${vertexMask}`;
                    return maskUrl;
                }
            } catch (e) {
                console.warn('[Segmentation] Vertex AI failed, falling back to Replicate', e);
            }
        }

        // Fallback to Replicate (Development/Current)
        console.log('[Segmentation] Using Replicate SAM...');
        const output = await replicate.run(
            SAM_MODEL,
            { input: replicateInput }
        );

        if (Array.isArray(output) && output.length > 0) {
            return output[0] as string;
        } else if (typeof output === 'string') {
            return output;
        }

        throw new Error('Unexpected output format from SAM');

    } catch (error: any) {
        console.error('[Segmentation] Error generating mask:', error);
        throw error;
    }
}

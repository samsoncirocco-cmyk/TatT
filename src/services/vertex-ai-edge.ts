import { getGcpAccessToken } from '@/lib/google-auth-edge';

const PROJECT_ID = process.env.GCP_PROJECT_ID || 'tatt-pro';
const REGION = process.env.GCP_REGION || 'us-central1';

const MODELS = {
    gemini: 'gemini-2.0-flash-exp',
    imagen: 'imagen-3.0-generate-001',
    embeddings: 'multimodalembedding@001'
};

/**
 * Imagen 3 via REST API (Edge Compatible)
 */
export async function generateWithImagen({ prompt, negativePrompt, numImages = 4, aspectRatio = '1:1' }: any) {
    const accessToken = await getGcpAccessToken();
    const endpoint = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${MODELS.imagen}:predict`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            instances: [{ prompt }],
            parameters: {
                sampleCount: numImages,
                aspectRatio,
                negativePrompt,
                safetySetting: 'block_only_high',
                personGeneration: 'allow_adult'
            }
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Imagen API Error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const images = data.predictions?.map((pred: any) =>
        `data:image/png;base64,${pred.bytesBase64Encoded}`
    ) || [];

    return {
        success: true,
        images,
        metadata: {
            model: MODELS.imagen,
            generatedAt: new Date().toISOString()
        }
    };
}

/**
 * Embeddings via REST API (Edge Compatible)
 */
export async function generateEmbedding(imageUrls: string[]): Promise<number[]> {
    const accessToken = await getGcpAccessToken();
    const endpoint = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${MODELS.embeddings}:predict`;

    // Process first image only for MVP if array
    // Multimodal embedding endpoint typically takes one image or text
    const imageUrl = imageUrls[0];

    // For Edge, we prefer passing the URL if public/GCS, or we need to fetch and base64 it.
    // Assuming URLs are accessible or data URLs.

    let imagePart = {};
    if (imageUrl.startsWith('data:')) {
        const base64 = imageUrl.split(',')[1];
        imagePart = { bytesBase64Encoded: base64 };
    } else {
        // Fetch it
        const imgResp = await fetch(imageUrl);
        const arrayBuf = await imgResp.arrayBuffer();
        const base64 = Buffer.from(arrayBuf).toString('base64');
        imagePart = { bytesBase64Encoded: base64 };
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            instances: [{ image: imagePart }]
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Embeddings API Error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const embedding = data.predictions?.[0]?.imageEmbedding;

    return embedding || [];
}

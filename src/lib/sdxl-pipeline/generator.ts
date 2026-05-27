/**
 * Image generator — ports agents/generator.py to TypeScript.
 *
 * Runs SDXL/Illustrious via fofr/any-comfyui-workflow on Replicate, one
 * prediction per subprompt, in parallel (max 3). Returns image URLs in input
 * order.
 */

import type { SubPrompt } from './promptBuilder';

const MODEL = 'fofr/any-comfyui-workflow';
const MAX_PARALLEL = 3;
const TERMINAL = new Set(['succeeded', 'failed', 'canceled']);

let versionIdCache: string | null = null;

function getToken(): string {
    const t = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY;
    if (!t) {
        throw new Error('Missing REPLICATE_API_TOKEN env var');
    }
    return t;
}

async function getVersionId(): Promise<string> {
    if (versionIdCache) return versionIdCache;
    const r = await fetch(`https://api.replicate.com/v1/models/${MODEL}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        signal: AbortSignal.timeout(30_000),
    });
    if (!r.ok) throw new Error(`Replicate model lookup failed: ${r.status}`);
    const data = (await r.json()) as { latest_version?: { id?: string } };
    const id = data.latest_version?.id;
    if (!id) throw new Error('Replicate model has no latest_version.id');
    versionIdCache = id;
    return id;
}

interface ComfyNode {
    class_type: string;
    inputs: Record<string, unknown>;
}

export function buildWorkflow(
    prompt: string,
    negative: string,
    loraUrl: string | null,
    seed: number,
    loraStrength = 0.9
): Record<string, ComfyNode> {
    const clipRef: [string, number] = loraUrl ? ['10', 1] : ['4', 1];
    const modelRef: [string, number] = loraUrl ? ['10', 0] : ['4', 0];
    const workflow: Record<string, ComfyNode> = {
        '4': {
            class_type: 'CheckpointLoaderSimple',
            inputs: { ckpt_name: 'illustriousXL_v01.safetensors' },
        },
        '5': {
            class_type: 'EmptyLatentImage',
            inputs: { width: 1024, height: 1024, batch_size: 1 },
        },
        '6': { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: clipRef } },
        '7': { class_type: 'CLIPTextEncode', inputs: { text: negative, clip: clipRef } },
        '3': {
            class_type: 'KSampler',
            inputs: {
                seed,
                steps: 28,
                cfg: 7.0,
                sampler_name: 'euler',
                scheduler: 'normal',
                denoise: 1.0,
                model: modelRef,
                positive: ['6', 0],
                negative: ['7', 0],
                latent_image: ['5', 0],
            },
        },
        '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] } },
        '9': { class_type: 'SaveImage', inputs: { filename_prefix: 'tatt', images: ['8', 0] } },
    };
    if (loraUrl) {
        workflow['10'] = {
            class_type: 'LoraLoader',
            inputs: {
                lora_name: loraUrl,
                strength_model: loraStrength,
                strength_clip: loraStrength,
                model: ['4', 0],
                clip: ['4', 1],
            },
        };
    }
    return workflow;
}

interface Prediction {
    status?: string;
    output?: string | string[] | null;
    error?: unknown;
    logs?: string;
    urls?: { get?: string };
}

async function pollPrediction(prediction: Prediction, maxWaitMs = 600_000): Promise<Prediction> {
    if (prediction.status && TERMINAL.has(prediction.status)) return prediction;
    const getUrl = prediction.urls?.get;
    if (!getUrl) return prediction;
    const deadline = Date.now() + maxWaitMs;
    while (Date.now() < deadline) {
        await new Promise((res) => setTimeout(res, 2000));
        try {
            const r = await fetch(getUrl, {
                headers: { Authorization: `Bearer ${getToken()}` },
                signal: AbortSignal.timeout(30_000),
            });
            if (!r.ok) continue;
            prediction = (await r.json()) as Prediction;
            if (prediction.status && TERMINAL.has(prediction.status)) return prediction;
        } catch {
            // transient — retry
        }
    }
    return prediction;
}

async function replicatePredict(
    input: Record<string, unknown>,
    max429Retries = 3
): Promise<Prediction> {
    const url = 'https://api.replicate.com/v1/predictions';
    const version = await getVersionId();
    const body = JSON.stringify({ version, input });
    for (let attempt = 0; attempt <= max429Retries; attempt++) {
        const r = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                Prefer: 'wait',
            },
            body,
            signal: AbortSignal.timeout(600_000),
        });
        if (r.status === 429 && attempt < max429Retries) {
            let retry = 2;
            try {
                const j = (await r.json()) as { retry_after?: number };
                retry = j.retry_after ?? 2;
            } catch {
                // ignore
            }
            await new Promise((res) => setTimeout(res, (retry + 1) * 1000));
            continue;
        }
        if (!r.ok) {
            throw new Error(`Replicate ${r.status}: ${await r.text()}`);
        }
        return pollPrediction((await r.json()) as Prediction);
    }
    throw new Error('exhausted 429 retries');
}

async function generateOne(idx: number, total: number, sub: SubPrompt): Promise<string> {
    const seed = (Date.now() + idx) % 1_000_000;
    const workflow = buildWorkflow(
        sub.positive,
        sub.negative ?? '',
        sub.lora_url ?? null,
        seed,
        sub.lora_strength ?? 0.9
    );
    const result = await replicatePredict({
        workflow_json: JSON.stringify(workflow),
        output_format: 'png',
        randomise_seeds: false,
        return_temp_files: false,
    });
    if (result.status !== 'succeeded') {
        const tail = (result.logs ?? '').slice(-400);
        throw new Error(
            `subprompt ${idx + 1}/${total} failed: status=${result.status} error=${JSON.stringify(
                result.error
            )} logs_tail=${JSON.stringify(tail)}`
        );
    }
    const output = result.output;
    let url: string | null = null;
    if (Array.isArray(output) && output.length > 0) url = output[0];
    else if (typeof output === 'string') url = output;
    if (!url) {
        throw new Error(
            `subprompt ${idx + 1}/${total}: no image url in output=${JSON.stringify(output)}`
        );
    }
    return url;
}

/**
 * Run all subprompts in parallel (max 3 concurrent), return URLs in input order.
 */
export async function generate(subprompts: SubPrompt[]): Promise<string[]> {
    const n = subprompts.length;
    if (n === 0) return [];

    const results: (string | null)[] = new Array(n).fill(null);
    let nextIdx = 0;

    const worker = async (): Promise<void> => {
        while (true) {
            const i = nextIdx++;
            if (i >= n) return;
            results[i] = await generateOne(i, n, subprompts[i]);
        }
    };

    const workers = Array.from({ length: Math.min(MAX_PARALLEL, n) }, () => worker());
    await Promise.all(workers);

    return results.map((r, i) => {
        if (r === null) throw new Error(`subprompt ${i + 1}/${n} produced no result`);
        return r;
    });
}

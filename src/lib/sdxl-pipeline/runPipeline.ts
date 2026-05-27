/**
 * SDXL/Illustrious pipeline orchestrator.
 *
 * Chains: buildPrompt (OpenRouter / Claude Sonnet 4.6, tool-use)
 *      -> generate (Replicate ComfyUI workflow, parallel SDXL/Illustrious)
 *      -> composite (sharp side-by-side stitch + R2 upload)
 *
 * Returns the final R2 composite URL plus the intermediate artifacts.
 */

import { buildPrompt, type SubPrompt } from './promptBuilder';
import { generate } from './generator';
import { composite } from './compositor';

export interface PipelineResult {
    compositeUrl: string;
    subprompts: SubPrompt[];
    generationUrls: string[];
    totalMs: number;
}

export async function runSdxlPipeline(userInput: string): Promise<PipelineResult> {
    const t0 = Date.now();
    const plan = await buildPrompt(userInput);
    const subprompts = plan.subprompts;
    if (!subprompts || subprompts.length === 0) {
        throw new Error('Prompt builder returned no subprompts');
    }
    const generationUrls = await generate(subprompts);
    const compositeUrl = await composite(generationUrls);
    return {
        compositeUrl,
        subprompts,
        generationUrls,
        totalMs: Date.now() - t0,
    };
}

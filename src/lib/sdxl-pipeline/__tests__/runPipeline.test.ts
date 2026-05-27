/**
 * Integration test for the SDXL pipeline orchestrator. Mocks fetch and the
 * compositor's R2 upload so it never hits real APIs.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the compositor module so we don't touch sharp / AWS SDK in this test.
vi.mock('@/lib/sdxl-pipeline/compositor', () => ({
    composite: vi.fn(async (urls: string[]) => `https://r2.example/composite-${urls.length}.png`),
}));

import { runSdxlPipeline } from '@/lib/sdxl-pipeline/runPipeline';
import { composite } from '@/lib/sdxl-pipeline/compositor';

describe('runSdxlPipeline orchestration', () => {
    const origFetch = global.fetch;

    beforeEach(() => {
        process.env.OPENROUTER_API_KEY = 'test-openrouter';
        process.env.REPLICATE_API_TOKEN = 'test-replicate';
    });

    afterEach(() => {
        global.fetch = origFetch;
        vi.clearAllMocks();
    });

    it('runs prompt builder -> generator -> compositor in order', async () => {
        const callLog: string[] = [];

        global.fetch = vi.fn(async (input: RequestInfo | URL) => {
            const url = typeof input === 'string' ? input : input.toString();

            if (url.includes('openrouter.ai')) {
                callLog.push('prompt');
                return new Response(
                    JSON.stringify({
                        choices: [
                            {
                                message: {
                                    tool_calls: [
                                        {
                                            function: {
                                                name: 'emit_prompt_plan',
                                                arguments: JSON.stringify({
                                                    split: false,
                                                    reasoning: 'test',
                                                    subprompts: [
                                                        {
                                                            character: null,
                                                            lora_url: null,
                                                            lora_strength: null,
                                                            positive: 'dragon, tattoo design',
                                                            negative: 'blurry',
                                                        },
                                                    ],
                                                }),
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                );
            }

            if (url.includes('api.replicate.com/v1/models/')) {
                callLog.push('model-lookup');
                return new Response(
                    JSON.stringify({ latest_version: { id: 'v-test-123' } }),
                    { status: 200 }
                );
            }

            if (url.includes('api.replicate.com/v1/predictions')) {
                callLog.push('generate');
                return new Response(
                    JSON.stringify({
                        status: 'succeeded',
                        output: ['https://replicate.example/img.png'],
                    }),
                    { status: 200 }
                );
            }

            throw new Error(`Unexpected fetch: ${url}`);
        }) as unknown as typeof fetch;

        const result = await runSdxlPipeline('a dragon');

        // Prompt happens before generate; compositor (mocked) runs last.
        expect(callLog[0]).toBe('prompt');
        expect(callLog).toContain('generate');
        expect(callLog.indexOf('prompt')).toBeLessThan(callLog.indexOf('generate'));
        expect(composite).toHaveBeenCalledWith(['https://replicate.example/img.png']);
        expect(result.compositeUrl).toBe('https://r2.example/composite-1.png');
        expect(result.subprompts).toHaveLength(1);
        expect(result.generationUrls).toEqual(['https://replicate.example/img.png']);
        expect(typeof result.totalMs).toBe('number');
    });
});

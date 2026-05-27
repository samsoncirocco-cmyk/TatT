/**
 * Prompt builder — ports agents/prompt_builder.py to TypeScript.
 *
 * Calls OpenRouter (Claude Sonnet 4.6) with forced tool use to convert a
 * natural-language tattoo request into structured booru-tag subprompts for the
 * SDXL/Illustrious generator. Falls back to a deterministic stub when
 * OPENROUTER_API_KEY is not configured.
 */

import { LORA_CATALOG, type LoraCatalog, catalogSummary } from './catalog';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4.6';

const TATTOO_STYLE =
    'tattoo design, traditional tattoo flash, linework, bold black outlines, ' +
    'flat colors, limited palette, thick outlines, high contrast, no photorealism, ' +
    'no busy background, solid black background';
const QUALITY = 'masterpiece, best quality, ultra detailed, highres, sharp focus';
const NEGATIVE =
    'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, ' +
    'fewer digits, cropped, worst quality, low quality, jpeg artifacts, signature, ' +
    'watermark, blurry, photorealistic';

export interface SubPrompt {
    character: string | null;
    lora_url: string | null;
    lora_strength: number | null;
    positive: string;
    negative: string;
}

export interface PromptPlan {
    split: boolean;
    reasoning: string;
    subprompts: SubPrompt[];
    _source?: string;
}

const TOOL_SCHEMA = {
    type: 'function',
    function: {
        name: 'emit_prompt_plan',
        description: 'Emit the final structured prompt plan for the generator agent.',
        parameters: {
            type: 'object',
            properties: {
                split: {
                    type: 'boolean',
                    description:
                        'True if multiple images should be generated (one per character).',
                },
                reasoning: {
                    type: 'string',
                    description:
                        'One sentence explaining the split decision and character selection.',
                },
                subprompts: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            character: {
                                type: ['string', 'null'],
                                description: 'Catalog key for the character, or null if none.',
                            },
                            lora_url: {
                                type: ['string', 'null'],
                                description: 'Direct URL to the LoRA file, or null.',
                            },
                            lora_strength: { type: ['number', 'null'] },
                            positive: {
                                type: 'string',
                                description:
                                    'Full positive booru-tag prompt including style + quality tags.',
                            },
                            negative: { type: 'string', description: 'Full negative prompt.' },
                        },
                        required: [
                            'character',
                            'lora_url',
                            'lora_strength',
                            'positive',
                            'negative',
                        ],
                    },
                },
            },
            required: ['split', 'reasoning', 'subprompts'],
        },
    },
} as const;

function systemPrompt(catalog: LoraCatalog): string {
    return `You convert natural-language tattoo requests into structured booru-tag prompts for an SDXL/Illustrious image generator.

CHARACTER CATALOG (only these named characters have curated triggers; everything else is generic):
${catalogSummary(catalog)}

RULES:
1. Decide split: set split=true if the request names MORE THAN ONE character from the catalog OR uses "vs"/"fighting"/"and" between two characters. Otherwise split=false.
2. For split=true, emit ONE subprompt per character, each isolated with "1boy, solo, <character trigger>, ...". Do NOT put two characters in the same prompt — they will be composited later.
3. For split=false single-character, use "1boy, solo, <character trigger>, <action/pose>, ...".
4. For split=false no-character (objects, animals, etc.), describe the subject in booru tags, no "1boy/1girl".
5. Booru-tag style only: lowercase, comma-separated, no full sentences.
6. ALWAYS append these style tags at the end of every positive prompt: ${TATTOO_STYLE}
7. ALWAYS append quality tags at the very end: ${QUALITY}
8. ALWAYS use this exact negative prompt, optionally adding character-specific negative_hints from the catalog: ${NEGATIVE}
9. For characters in the catalog, copy their \`trigger\` verbatim into the positive prompt and merge their \`negative_hints\` into the negative.
10. For characters with lora_needed=false, set lora_url=null and lora_strength=null. For lora_needed=true, set lora_url to the catalog \`url\` (may be null if not yet mirrored) and lora_strength to \`default_strength\`.
11. character field MUST be the catalog key (e.g. "killua-zoldyck") or null if no catalog character is used.

Call the emit_prompt_plan tool exactly once. Do not output anything else.`;
}

const ALIASES: Record<string, string> = {
    killua: 'killua-zoldyck',
    goku: 'goku',
    vegeta: 'vegeta',
    naruto: 'naruto',
    luffy: 'luffy',
    saitama: 'saitama',
    levi: 'levi-ackerman',
    tanjiro: 'tanjiro',
    gojo: 'gojo-satoru',
    ichigo: 'ichigo',
};

function fallbackPlan(userInput: string, catalog: LoraCatalog): PromptPlan {
    const text = userInput.toLowerCase();
    const matched: string[] = [];
    for (const [alias, key] of Object.entries(ALIASES)) {
        if (text.includes(alias) && catalog.loras[key] && !matched.includes(key)) {
            matched.push(key);
        }
    }

    const makeSub = (charKey: string | null, extra: string): SubPrompt => {
        if (charKey === null) {
            return {
                character: null,
                lora_url: null,
                lora_strength: null,
                positive: `${extra}, ${TATTOO_STYLE}, ${QUALITY}`,
                negative: NEGATIVE,
            };
        }
        const entry = catalog.loras[charKey];
        const positive = `1boy, solo, ${entry.trigger}, ${extra}, ${TATTOO_STYLE}, ${QUALITY}`;
        const negative = entry.negative_hints ? `${NEGATIVE}, ${entry.negative_hints}` : NEGATIVE;
        return {
            character: charKey,
            lora_url: entry.lora_needed ? entry.url : null,
            lora_strength: entry.lora_needed ? entry.default_strength : null,
            positive,
            negative,
        };
    };

    const extra = 'dynamic pose, action';
    if (matched.length === 0) {
        return {
            split: false,
            reasoning: 'Fallback: no catalog character detected; rendering subject as generic tattoo.',
            subprompts: [makeSub(null, userInput)],
        };
    }
    if (matched.length === 1) {
        return {
            split: false,
            reasoning: 'Fallback: single catalog character detected.',
            subprompts: [makeSub(matched[0], extra)],
        };
    }
    return {
        split: true,
        reasoning: 'Fallback: multiple catalog characters detected; splitting one per image.',
        subprompts: matched.map((k) => makeSub(k, extra)),
    };
}

export async function buildPrompt(
    userInput: string,
    catalog: LoraCatalog = LORA_CATALOG
): Promise<PromptPlan> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        const plan = fallbackPlan(userInput, catalog);
        plan._source = 'fallback-no-api-key';
        return plan;
    }

    const body = {
        model: MODEL,
        max_tokens: 2048,
        tools: [TOOL_SCHEMA],
        tool_choice: { type: 'function', function: { name: 'emit_prompt_plan' } },
        messages: [
            { role: 'system', content: systemPrompt(catalog) },
            { role: 'user', content: userInput },
        ],
    };

    let data: unknown;
    try {
        const r = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://github.com/samsoncirocco-cmyk/tatt',
                'X-Title': 'TatT SDXL Pipeline',
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(60_000),
        });
        if (!r.ok) {
            const plan = fallbackPlan(userInput, catalog);
            plan._source = `fallback-openrouter-http-${r.status}`;
            return plan;
        }
        data = await r.json();
    } catch (e) {
        const plan = fallbackPlan(userInput, catalog);
        plan._source = `fallback-openrouter-fetch-error: ${(e as Error).name}`;
        return plan;
    }

    try {
        const d = data as {
            choices?: Array<{
                message?: {
                    tool_calls?: Array<{
                        function?: { name?: string; arguments?: string };
                    }>;
                };
            }>;
        };
        const toolCalls = d.choices?.[0]?.message?.tool_calls ?? [];
        for (const call of toolCalls) {
            const fn = call.function;
            if (fn?.name === 'emit_prompt_plan' && fn.arguments) {
                const plan = JSON.parse(fn.arguments) as PromptPlan;
                plan._source = `openrouter:${MODEL}`;
                return plan;
            }
        }
    } catch (e) {
        const plan = fallbackPlan(userInput, catalog);
        plan._source = `fallback-bad-response-shape: ${(e as Error).message}`;
        return plan;
    }

    const plan = fallbackPlan(userInput, catalog);
    plan._source = 'fallback-no-tool-call-in-response';
    return plan;
}

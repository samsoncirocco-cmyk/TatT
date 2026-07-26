import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkBudget, recordSpend } from '@/lib/budget-tracker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REPLICATE_API_URL = 'https://api.replicate.com/v1';

// Official models are invoked by slug ("owner/name") with no version hash;
// validate the shape since the slug lands in the upstream URL path.
const MODEL_SLUG_PATTERN = /^[\w.-]+\/[\w.-]+$/;

// This route is a generic pass-through to any Replicate model, so unlike
// /api/generate and /api/v1/generate (both pinned to Vertex Imagen3 at a
// known per-image cost) it can't know a run's real price. Use a flat,
// conservative per-image estimate — the priciest model in the Forge client's
// own catalog (src/features/generate/services/replicateService.js's
// AI_MODELS: flux-dev 2.5c, flux-schnell 0.3c, krea2 3.5c) — so the shared
// budget cap is never silently under-charged.
const REPLICATE_PREDICTION_COST_CENTS = 4;

export async function POST(req: NextRequest) {
    const authError = await verifyApiAuth(req);
    if (authError) return authError;

    const rateResult = await rateLimit(req, 'generation');
    if (!rateResult.allowed) {
        return rateLimitResponse(rateResult);
    }

    const budgetResult = await checkBudget();
    if (!budgetResult.allowed) {
        return NextResponse.json(
            { error: 'Budget limit reached', spentCents: budgetResult.spentCents },
            { status: 402 }
        );
    }

    const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

    if (!REPLICATE_API_TOKEN) {
        return NextResponse.json({ error: 'REPLICATE_API_TOKEN not configured' }, { status: 500 });
    }

    try {
        const body = await req.json();
        console.log('[Proxy] Creating prediction...');

        // Slug-based bodies ({ model, input }) hit the official-model endpoint;
        // legacy bodies ({ version, input }) keep the hash-pinned endpoint.
        const { model, ...rest } = body;
        let endpoint = `${REPLICATE_API_URL}/predictions`;
        if (typeof model === 'string') {
            if (!MODEL_SLUG_PATTERN.test(model)) {
                return NextResponse.json({ error: `Invalid model slug: ${model}` }, { status: 400 });
            }
            endpoint = `${REPLICATE_API_URL}/models/${model}/predictions`;
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${REPLICATE_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(rest)
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        // Real money was just committed — Replicate runs (and bills) this
        // prediction regardless of whether the client ever polls for the
        // result. num_outputs scales the flat per-image estimate the same
        // way /api/generate and /api/v1/generate scale their known Vertex
        // cost by image count.
        const numOutputs = Number((rest as { input?: { num_outputs?: unknown } })?.input?.num_outputs) || 1;
        await recordSpend(REPLICATE_PREDICTION_COST_CENTS * numOutputs);

        console.log('[Proxy] Prediction created:', data.id);
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[Proxy] Prediction error:', error);
        return NextResponse.json({ error: 'Failed to create prediction', details: error.message }, { status: 500 });
    }
}

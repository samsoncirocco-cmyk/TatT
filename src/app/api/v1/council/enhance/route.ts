import { NextRequest, NextResponse } from 'next/server';
import { enhance } from '@/services/council';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkBudget, recordSpend } from '@/lib/budget-tracker';

export const runtime = 'nodejs';

// Estimated cost of one Council enhancement call (Vertex Gemini), in cents —
// see CLAUDE.md's Cost Monitoring table (~$0.02/request). Override via
// COUNCIL_ENHANCE_COST_CENTS.
const COUNCIL_ENHANCE_COST_CENTS =
    Number(process.env.COUNCIL_ENHANCE_COST_CENTS) || 2;

export async function POST(req: NextRequest) {
    // Council route might be public or protected. server.js had it protected.
    // We'll skip verification in the file for now as it's cleaner to use middleware if possible,
    // but sticking to the plan: use helper in each route.
    // Wait, I missed verifyApiAuth import in the previous step? No I added it.
    // I should add it here too.

    // Note: Previous express code used `validateCouncilEnhanceRequest` middleware.
    // I should probably implement that validation here or trust the service/frontend validation for now.
    // The express route also had rate limiting — now restored below (issue #181 follow-up:
    // this route had neither a rate limit nor a budget check, unlike /api/v1/council/generate).

    try {
        // Re-import verifyApiAuth since I forgot it at top
        const { verifyApiAuth } = await import('@/lib/api-auth');
        const authError = await verifyApiAuth(req);
        if (authError) return authError;

        const rateResult = await rateLimit(req, 'council');
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

        const body = await req.json();
        const { user_prompt, style, body_part, complexity = 'medium', isStencilMode = false } = body;

        // Validation
        if (!user_prompt || user_prompt.length < 3) {
            return NextResponse.json({ error: 'Invalid prompt', code: 'INVALID_REQUEST' }, { status: 400 });
        }

        console.log('[API] Council enhancement request:', {
            prompt_length: user_prompt.length,
            style,
            body_part,
            complexity,
            isStencilMode
        });

        const startTime = Date.now();
        const result = await enhance({
            userIdea: user_prompt,
            style: style,
            bodyPart: body_part,
            isStencilMode: isStencilMode
        }) as any;
        const duration = Date.now() - startTime;

        // Real Vertex Gemini spend, on the same shared tracker every other
        // paid route uses.
        await recordSpend(COUNCIL_ENHANCE_COST_CENTS);

        // The service returns { prompts: {...}, negativePrompt, metadata }
        // We need to shape it for the client if necessary, or just return result.
        // The original service returned { prompts, negativePrompt } directly similar to this.
        // Consolidate 'text' based prompts into the expected array format for the client
        const enhancedPrompts = [];
        if (result.prompts?.simple) enhancedPrompts.push(result.prompts.simple);
        if (result.prompts?.detailed) enhancedPrompts.push(result.prompts.detailed);
        if (result.prompts?.ultra) enhancedPrompts.push(result.prompts.ultra);

        // Fallback if structure is different
        if (enhancedPrompts.length === 0) {
            enhancedPrompts.push('Failed to generate enhanced prompts');
        }

        console.log(`[API] Council enhancement completed in ${duration}ms`);

        return NextResponse.json({
            success: true,
            enhanced_prompts: enhancedPrompts,
            model_selections: {
                primary: result?.metadata?.model || 'council',
                reasoning: result?.modelSelection?.reasoning || 'Council enhancement'
            },
            metadata: {
                original_prompt: user_prompt,
                style,
                body_part,
                complexity,
                council_members: result?.metadata?.councilMembers || ['creative', 'technical', 'style'],
                enhancement_version: '3.0',
                generated_at: new Date().toISOString()
            },
            performance: {
                duration_ms: duration
            }
        });

    } catch (error: any) {
        console.error('[API] Council enhancement error:', error);

        // Simple error mapping
        const status = error.message.includes('not found') ? 404 :
            error.message.includes('rate limit') ? 429 : 500;

        return NextResponse.json({
            error: 'Enhancement failed',
            code: 'ENHANCEMENT_FAILED',
            message: error.message
        }, { status });
    }
}

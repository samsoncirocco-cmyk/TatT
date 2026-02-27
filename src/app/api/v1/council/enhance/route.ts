import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { enhancePromptWithGemini } from '@/services/vertex-ai-edge';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { createRequestLogger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const reqLogger = createRequestLogger('council');

    const authError = verifyApiAuth(req);
    if (authError) return authError;

    const rateResult = await checkRateLimit(req, 'council');
    if (!rateResult.allowed) {
        return rateLimitResponse(rateResult);
    }

    try {
        const body = await req.json();
        const { user_prompt, style, body_part, complexity = 'medium', isStencilMode = false } = body;

        // Validation
        if (!user_prompt || user_prompt.length < 3) {
            return NextResponse.json({ error: 'Invalid prompt', code: 'INVALID_REQUEST' }, { status: 400 });
        }

        // Log council start
        reqLogger.start('council.started', {
            prompt_length: user_prompt.length,
            style: style || null,
            body_part: body_part || null,
            complexity,
            is_stencil_mode: isStencilMode,
        });

        const startTime = Date.now();
        const result = await enhancePromptWithGemini({
            userIdea: user_prompt,
            style: style,
            bodyPart: body_part,
            isStencilMode: isStencilMode
        });
        const duration = Date.now() - startTime;

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

        // Log council completion
        reqLogger.complete('council.completed', {
            enhanced_prompt_length: enhancedPrompts[0]?.length || 0,
            prompt_count: enhancedPrompts.length,
        });

        return NextResponse.json({
            success: true,
            enhanced_prompts: enhancedPrompts,
            model_selections: {
                primary: 'gemini-2.0-flash-exp', // Using the model defined in service
                reasoning: 'Standard enhancement'
            },
            metadata: {
                original_prompt: user_prompt,
                style,
                body_part,
                complexity,
                council_members: ['technical', 'artistic', 'cultural'],
                enhancement_version: '2.0',
                generated_at: new Date().toISOString()
            },
            performance: {
                duration_ms: duration
            }
        });

    } catch (error: any) {
        // Log council failure
        reqLogger.error('council.failed', error);

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

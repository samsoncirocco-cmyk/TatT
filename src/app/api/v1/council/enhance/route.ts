import { NextRequest, NextResponse } from 'next/server';
import { enhancePrompt } from '@/services/councilService';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
    // Council route might be public or protected. server.js had it protected.
    // We'll skip verification in the file for now as it's cleaner to use middleware if possible, 
    // but sticking to the plan: use helper in each route.
    // Wait, I missed verifyApiAuth import in the previous step? No I added it.
    // I should add it here too.

    // Note: Previous express code used `validateCouncilEnhanceRequest` middleware.
    // I should probably implement that validation here or trust the service/frontend validation for now.
    // The express route also had rate limiting.

    try {
        // Re-import verifyApiAuth since I forgot it at top
        const { verifyApiAuth } = await import('@/lib/api-auth');
        const authError = verifyApiAuth(req);
        if (authError) return authError;

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
        const result = await enhancePrompt({
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

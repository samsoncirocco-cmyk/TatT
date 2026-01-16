import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const { design_id, body_part, depth_map, placement_config = {} } = await req.json();

        console.log('[API] AR visualization request:', { design_id, body_part, hasDepthMap: !!depth_map });

        // Validation
        const supportedParts = ['arm', 'leg', 'back', 'chest', 'shoulder', 'forearm', 'calf', 'thigh'];
        if (!supportedParts.includes(body_part)) {
            return NextResponse.json({
                error: 'Unsupported body part',
                code: 'UNSUPPORTED_BODY_PART',
                hint: 'Supported: arm, leg, back, chest, shoulder, forearm, calf, thigh'
            }, { status: 422 });
        }

        const startTime = Date.now();

        // Mock visualization generation
        const hasDepthSensor = !!depth_map;
        const placementAccuracy = hasDepthSensor ? 0.95 : 0.75; // ±2cm with depth, ±5cm without

        const visualization = {
            visualization_url: `https://storage.example.com/ar-previews/${design_id}_${body_part}.png`,
            placement_accuracy: placementAccuracy,
            accuracy_cm: hasDepthSensor ? 2 : 5,
            metadata: {
                design_id,
                body_part,
                depth_aware: hasDepthSensor,
                placement_config: placement_config,
                generated_at: new Date().toISOString(),
                fallback_mode: !hasDepthSensor
            },
            performance: {
                duration_ms: Date.now() - startTime
            }
        };

        console.log(`[API] AR visualization completed in ${visualization.performance.duration_ms}ms`);

        return NextResponse.json({
            success: true,
            ...visualization
        });

    } catch (error: any) {
        console.error('[API] AR visualization error:', error);
        return NextResponse.json({ error: 'AR visualization failed', message: error.message }, { status: 500 });
    }
}

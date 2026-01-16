import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import { queueStencilExport } from '@/services/emailQueueService.js';
// @ts-ignore
import { startTimer, endTimer } from '@/utils/performanceMonitor.js';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const OP_NAME = 'Stencil Export';
    // Mock timer if module missing
    const start = Date.now();

    try {
        const body = await req.json();
        const {
            design_id,
            dimensions,
            format = 'pdf',
            include_metadata = true,
            artist_info = {},
            force_queue = false
        } = body;

        console.log('[API] Stencil export request:', {
            design_id,
            dimensions,
            format,
            include_metadata
        });

        if (force_queue) {
            console.log('[API] Service unavailable (simulated), queuing export...');
            const queueId = queueStencilExport ? queueStencilExport(body) : 'mock-queue-id';

            return NextResponse.json({
                success: true,
                queued: true,
                queue_id: queueId,
                message: 'Stencil export service is currently busy. Your request has been queued.',
                hint: 'Estimated time: 2-5 minutes'
            }, { status: 202 });
        }

        // Mock stencil generation
        const stencilData = {
            stencil_url: `https://storage.example.com/stencils/${design_id}_${dimensions.width}x${dimensions.height}.${format}`,
            metadata: {
                design_id,
                dimensions: {
                    width: dimensions.width,
                    height: dimensions.height,
                    unit: 'inches'
                },
                format,
                dpi: 300,
                color_mode: 'grayscale',
                calibration: {
                    markers: true,
                    grid: true,
                    ruler: true
                },
                artist_info: artist_info,
                generated_at: new Date().toISOString(),
                version: '1.0',
                overlay: include_metadata ? { qr_code: true } : undefined
            }
        };

        const duration = Date.now() - start;

        return NextResponse.json({
            success: true,
            ...stencilData,
            performance: {
                duration_ms: Math.round(duration)
            }
        });

    } catch (error: any) {
        console.error('[API] Stencil export error:', error);
        return NextResponse.json({ error: 'Stencil export failed', message: error.message }, { status: 500 });
    }
}

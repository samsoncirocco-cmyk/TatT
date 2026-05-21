import { NextRequest, NextResponse } from 'next/server';
import {
    queueStencilExport,
    type StencilExportRequest,
} from '@/services/emailQueueService';

export const runtime = 'nodejs';

type StencilExportBody = StencilExportRequest & {
    force_queue?: boolean;
};

export async function POST(req: NextRequest) {
    const start = Date.now();

    try {
        const body = (await req.json()) as StencilExportBody;
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
            const queueId = queueStencilExport(body);

            return NextResponse.json({
                success: true,
                queued: true,
                queue_id: queueId,
                message: 'Stencil export service is currently busy. Your request has been queued.',
                hint: 'Estimated time: 2-5 minutes'
            }, { status: 202 });
        }

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
                artist_info,
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

    } catch (error) {
        console.error('[API] Stencil export error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: 'Stencil export failed', message },
            { status: 500 },
        );
    }
}

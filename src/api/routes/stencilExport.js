/**
 * Stencil Export API Route
 * 
 * POST /api/v1/stencil/export
 * Provides professional stencil export with metadata
 */

import { Router } from 'express';
import { validateStencilExportRequest } from '../middleware/validation.js';
import { startTimer, endTimer } from '../../utils/performanceMonitor.js';
import { queueStencilExport } from '../../services/emailQueueService.js';

const router = Router();

/**
 * POST /api/v1/stencil/export
 * 
 * Generate professional stencil PDF with calibration markers
 * Rate limit: 30 requests/hour per IP
 * 
 * Request body:
 * - design_id: string (required)
 * - dimensions: { width: number, height: number } (required, inches, width: 0-24, height: 0-36)
 * - format: string (optional, one of: pdf, png, svg, default: pdf)
 * - include_metadata: boolean (optional, default: true)
 * - artist_info: object (optional, { name, instagram, studio })
 * - force_queue: boolean (optional, simulate service unavailability)
 * 
 * Response:
 * - 200: { success: true, stencil_url: string, metadata: {...} }
 * - 202: { success: true, queued: true, queue_id: string, message: string }
 * - 400: { error: string, code: string, details: [...] }
 * - 422: { error: string, code: string }
 * - 500: { error: string, code: string }
 */
router.post('/', validateStencilExportRequest, async (req, res) => {
    const OP_NAME = 'Stencil Export';
    startTimer(OP_NAME);

    try {
        const {
            design_id,
            dimensions,
            format = 'pdf',
            include_metadata = true,
            artist_info = {},
            force_queue = false // For testing service unavailability
        } = req.body;

        console.log('[API] Stencil export request:', {
            design_id,
            dimensions,
            format,
            include_metadata
        });

        // Simulate service unavailability if force_queue is true
        if (force_queue) {
            console.log('[API] Service unavailable (simulated), queuing export...');
            const queueId = queueStencilExport(req.body);
            endTimer(OP_NAME, 10000, { queued: true });

            return res.status(202).json({
                success: true,
                queued: true,
                queue_id: queueId,
                message: 'Stencil export service is currently busy. Your request has been queued and you will receive an email when it is ready.',
                hint: 'Estimated time: 2-5 minutes'
            });
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
                version: '1.0'
            }
        };

        // Add metadata overlay info if requested
        if (include_metadata) {
            stencilData.metadata.overlay = {
                qr_code: true,
                design_info: true,
                artist_credit: !!artist_info.name,
                timestamp: true
            };
        }

        const duration = endTimer(OP_NAME, 10000, { design_id });

        res.json({
            success: true,
            ...stencilData,
            performance: {
                duration_ms: Math.round(duration)
            }
        });

    } catch (error) {
        console.error('[API] Stencil export error:', error);
        endTimer(OP_NAME);

        // Offer queuing on server-side failures (Service Unavailability)
        if (error.code === 'ECONNREFUSED' || error.message.includes('unavailable')) {
            const queueId = queueStencilExport(req.body);
            return res.status(202).json({
                success: true,
                queued: true,
                queue_id: queueId,
                message: 'Stencil export service is currently unavailable. Your request has been queued and you will receive an email when it is ready.',
                hint: 'We will notify you at user@example.com when the export is complete.'
            });
        }

        // Handle specific error types
        if (error.message.includes('unsuitable design')) {
            return res.status(422).json({
                error: 'Unsuitable design for stencil',
                code: 'UNSUITABLE_DESIGN',
                message: error.message,
                hint: 'Design must have clear lines and sufficient contrast for stencil printing'
            });
        }

        if (error.message.includes('invalid dimensions')) {
            return res.status(400).json({
                error: 'Invalid dimensions',
                code: 'INVALID_DIMENSIONS',
                message: error.message,
                hint: 'Dimensions must be positive and within reasonable bounds (width: 0-24", height: 0-36")'
            });
        }

        if (error.message.includes('design not found')) {
            return res.status(404).json({
                error: 'Design not found',
                code: 'DESIGN_NOT_FOUND',
                message: error.message
            });
        }

        // Generic error response
        res.status(500).json({
            error: 'Stencil export failed',
            code: 'EXPORT_FAILED',
            message: error.message,
            hint: 'Please try again or contact support if the issue persists'
        });
    }
});

export default router;

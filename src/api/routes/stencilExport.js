/**
 * Stencil Export API Route
 * 
 * POST /api/v1/stencil/export
 * Provides professional stencil export with metadata
 */

import { Router } from 'express';
import { validateStencilExportRequest } from '../middleware/validation.js';

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
 * 
 * Response:
 * - 200: { success: true, stencil_url: string, metadata: {...} }
 * - 400: { error: string, code: string, details: [...] }
 * - 422: { error: string, code: string }
 * - 500: { error: string, code: string }
 */
router.post('/', validateStencilExportRequest, async (req, res) => {
    try {
        const {
            design_id,
            dimensions,
            format = 'pdf',
            include_metadata = true,
            artist_info = {}
        } = req.body;

        console.log('[API] Stencil export request:', {
            design_id,
            dimensions,
            format,
            include_metadata
        });

        // For MVP, return a mock response
        // In production, this would:
        // 1. Load the design from storage
        // 2. Validate design is suitable for stencil (line quality, contrast)
        // 3. Generate stencil with calibration markers
        // 4. Add metadata overlay if requested
        // 5. Export to requested format
        // 6. Upload to storage and return URL

        const startTime = Date.now();

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
            },
            performance: {
                duration_ms: Date.now() - startTime
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

        console.log(`[API] Stencil export completed in ${stencilData.performance.duration_ms}ms`);

        res.json({
            success: true,
            ...stencilData
        });

    } catch (error) {
        console.error('[API] Stencil export error:', error);

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

        if (error.message.includes('format not supported')) {
            return res.status(422).json({
                error: 'Format not supported',
                code: 'UNSUPPORTED_FORMAT',
                message: error.message,
                hint: 'Supported formats: pdf, png, svg'
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

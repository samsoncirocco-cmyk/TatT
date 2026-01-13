/**
 * Layer Upload API Route
 *
 * Handles uploading separated RGBA layers to persistent storage
 * Returns stable URLs instead of bloating localStorage with base64
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Upload directory (persistent across server restarts)
const UPLOAD_DIR = path.join(__dirname, '../../../uploads/layers');

// Ensure upload directory exists
async function ensureUploadDir() {
    try {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
    } catch (error) {
        console.error('[LayerUpload] Failed to create upload directory:', error);
    }
}

// Initialize on import
ensureUploadDir();

/**
 * POST /api/v1/upload-layer
 *
 * Upload a layer image (RGB or Alpha mask) and get back a persistent URL
 *
 * Request body:
 * {
 *   imageData: string,  // Base64 data URL or raw base64
 *   filename: string    // Optional filename hint
 * }
 *
 * Response:
 * {
 *   url: string,        // Persistent URL for the uploaded image
 *   size: number,       // File size in bytes
 *   id: string          // Unique file ID
 * }
 */
router.post('/', async (req, res) => {
    try {
        const { imageData } = req.body;

        if (!imageData) {
            return res.status(400).json({
                error: 'Missing imageData in request body'
            });
        }

        // Extract base64 data (handle both raw base64 and data URLs)
        let base64Data;
        let mimeType = 'image/png'; // Default

        if (imageData.startsWith('data:')) {
            // Data URL format: data:image/png;base64,iVBORw0KGgo...
            const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
            if (!matches) {
                return res.status(400).json({
                    error: 'Invalid data URL format'
                });
            }
            mimeType = matches[1];
            base64Data = matches[2];
        } else {
            base64Data = imageData;
        }

        // Generate unique filename (ignore client-provided filename for safety)
        const hash = crypto.createHash('sha256').update(base64Data).digest('hex');
        const fileId = `${hash.substring(0, 16)}_${Date.now()}`;
        const extension = mimeType.split('/')[1] || 'png';
        const allowedExtensions = new Set(['png', 'jpg', 'jpeg', 'webp']);
        const safeExtension = allowedExtensions.has(extension) ? extension : 'png';
        const generatedFilename = `layer_${fileId}.${safeExtension}`;

        // Convert base64 to buffer
        const buffer = Buffer.from(base64Data, 'base64');

        // Save to disk
        const filepath = path.join(UPLOAD_DIR, generatedFilename);
        await fs.writeFile(filepath, buffer);

        // Construct public URL
        const publicUrl = `/uploads/layers/${generatedFilename}`;

        console.log(`[LayerUpload] Saved layer: ${generatedFilename} (${buffer.length} bytes)`);

        res.json({
            url: publicUrl,
            size: buffer.length,
            id: fileId
        });

    } catch (error) {
        console.error('[LayerUpload] Upload failed:', error);
        res.status(500).json({
            error: 'Failed to upload layer',
            details: error.message
        });
    }
});

/**
 * DELETE /api/v1/upload-layer/:filename
 *
 * Delete a previously uploaded layer (cleanup)
 */
router.delete('/:filename', async (req, res) => {
    try {
        const { filename } = req.params;

        // Security: prevent directory traversal
        if (filename.includes('..') || filename.includes('/')) {
            return res.status(400).json({
                error: 'Invalid filename'
            });
        }

        const filepath = path.join(UPLOAD_DIR, filename);

        // Check if file exists
        try {
            await fs.access(filepath);
        } catch {
            return res.status(404).json({
                error: 'File not found'
            });
        }

        // Delete file
        await fs.unlink(filepath);

        console.log(`[LayerUpload] Deleted layer: ${filename}`);

        res.json({
            success: true,
            message: 'Layer deleted'
        });

    } catch (error) {
        console.error('[LayerUpload] Delete failed:', error);
        res.status(500).json({
            error: 'Failed to delete layer',
            details: error.message
        });
    }
});

/**
 * Cleanup old layers (called periodically)
 * Removes layers older than 7 days
 */
export async function cleanupOldLayers() {
    try {
        const files = await fs.readdir(UPLOAD_DIR);
        const now = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

        let deletedCount = 0;

        for (const file of files) {
            const filepath = path.join(UPLOAD_DIR, file);
            const stats = await fs.stat(filepath);

            if (now - stats.mtimeMs > maxAge) {
                await fs.unlink(filepath);
                deletedCount++;
            }
        }

        if (deletedCount > 0) {
            console.log(`[LayerUpload] Cleaned up ${deletedCount} old layer(s)`);
        }

    } catch (error) {
        console.error('[LayerUpload] Cleanup failed:', error);
    }
}

export default router;

/**
 * Storage API Routes
 *
 * POST /api/v1/storage/upload
 * POST /api/v1/storage/get-signed-url
 */

import { Router } from 'express';
import crypto from 'crypto';
import { uploadToGCS, getSignedUrl } from '../../services/gcs-service.js';

const router = Router();

router.post('/upload', async (req, res) => {
  try {
    const { fileData, contentType = 'image/png', destinationPath } = req.body || {};

    if (!fileData) {
      return res.status(400).json({ error: 'Missing fileData' });
    }

    let buffer;
    if (fileData.startsWith('data:')) {
      const match = fileData.match(/^data:(.+?);base64,(.*)$/);
      if (!match) {
        return res.status(400).json({ error: 'Invalid data URL' });
      }
      buffer = Buffer.from(match[2], 'base64');
    } else {
      buffer = Buffer.from(fileData, 'base64');
    }

    const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 12);
    const path = destinationPath || `uploads/${Date.now()}_${hash}.png`;

    const result = await uploadToGCS(buffer, path, {
      contentType
    });

    return res.json({
      success: true,
      url: result.url,
      gcsPath: result.gcsPath,
      path: result.path
    });
  } catch (error) {
    console.error('[Storage] Upload failed:', error);
    return res.status(500).json({
      error: 'Upload failed',
      message: error.message
    });
  }
});

router.post('/get-signed-url', async (req, res) => {
  try {
    const { filePath, expirySeconds, action = 'read' } = req.body || {};

    if (!filePath) {
      return res.status(400).json({ error: 'Missing filePath' });
    }

    const url = await getSignedUrl(filePath, expirySeconds, action);

    return res.json({
      success: true,
      url,
      filePath,
      action
    });
  } catch (error) {
    console.error('[Storage] Signed URL failed:', error);
    return res.status(500).json({
      error: 'Signed URL failed',
      message: error.message
    });
  }
});

export default router;

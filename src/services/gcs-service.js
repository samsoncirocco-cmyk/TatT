/**
 * Google Cloud Storage Service
 * 
 * Handles all interactions with Google Cloud Storage for TatT Pro:
 * - Upload designs, layers, stencils, and portfolio images
 * - Generate signed URLs for secure, temporary access
 * - Delete files when no longer needed
 * - Manage folder structure and naming conventions
 */

import { Storage } from '@google-cloud/storage';

// Initialize Google Cloud Storage
const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  projectId: process.env.GCP_PROJECT_ID
});

const bucketName = process.env.GCS_BUCKET_NAME || process.env.GCS_BUCKET || 'tatt-pro-assets';
const bucket = storage.bucket(bucketName);
const signedUrlExpiry = parseInt(process.env.VITE_GCS_SIGNED_URL_EXPIRY || '3600', 10);

/**
 * Upload file to Google Cloud Storage
 * 
 * @param {Buffer|string} fileData - File data (Buffer) or local file path (string)
 * @param {string} destinationPath - Path in bucket (e.g., 'designs/abc123.png')
 * @param {Object} options - Upload options
 * @param {string} options.contentType - MIME type (default: 'image/png')
 * @param {Object} options.metadata - Custom metadata
 * @param {boolean} options.public - Make file publicly accessible (default: false)
 * @returns {Promise<Object>} Upload result with GCS path and signed URL
 */
export async function uploadToGCS(fileData, destinationPath, options = {}) {
  try {
    const {
      contentType = 'image/png',
      metadata = {},
      public: isPublic = false
    } = options;

    const file = bucket.file(destinationPath);

    // Upload file
    if (typeof fileData === 'string') {
      // Local file path
      await bucket.upload(fileData, {
        destination: destinationPath,
        metadata: {
          contentType,
          metadata: {
            uploadedAt: new Date().toISOString(),
            ...metadata
          }
        },
        public: isPublic
      });
    } else {
      // Buffer or stream
      await file.save(fileData, {
        metadata: {
          contentType,
          metadata: {
            uploadedAt: new Date().toISOString(),
            ...metadata
          }
        },
        public: isPublic
      });
    }

    console.log(`[GCS] Uploaded: gs://${bucketName}/${destinationPath}`);

    // Generate signed URL (unless public)
    const url = isPublic
      ? `https://storage.googleapis.com/${bucketName}/${destinationPath}`
      : await getSignedUrl(destinationPath);

    return {
      success: true,
      gcsPath: `gs://${bucketName}/${destinationPath}`,
      url,
      bucket: bucketName,
      path: destinationPath,
      public: isPublic
    };

  } catch (error) {
    console.error('[GCS] Upload failed:', error);
    throw new Error(`Failed to upload to GCS: ${error.message}`);
  }
}

/**
 * Generate signed URL for existing file
 * 
 * @param {string} filePath - Path in bucket
 * @param {number} expirySeconds - URL expiry in seconds (default: 1 hour)
 * @param {string} action - Action type: 'read' or 'write' (default: 'read')
 * @returns {Promise<string>} Signed URL
 */
export async function getSignedUrl(filePath, expirySeconds = signedUrlExpiry, action = 'read') {
  try {
    const file = bucket.file(filePath);

    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action,
      expires: Date.now() + expirySeconds * 1000
    });

    return signedUrl;

  } catch (error) {
    console.error('[GCS] Signed URL generation failed:', error);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
}

/**
 * Delete file from Google Cloud Storage
 * 
 * @param {string} filePath - Path in bucket
 * @returns {Promise<boolean>} True if deleted successfully
 */
export async function deleteFromGCS(filePath) {
  try {
    await bucket.file(filePath).delete();
    console.log(`[GCS] Deleted: gs://${bucketName}/${filePath}`);
    return true;

  } catch (error) {
    // Ignore "not found" errors
    if (error.code === 404) {
      console.warn(`[GCS] File not found (already deleted?): ${filePath}`);
      return true;
    }

    console.error('[GCS] Delete failed:', error);
    throw new Error(`Failed to delete from GCS: ${error.message}`);
  }
}

/**
 * Check if file exists in GCS
 * 
 * @param {string} filePath - Path in bucket
 * @returns {Promise<boolean>} True if file exists
 */
export async function fileExists(filePath) {
  try {
    const [exists] = await bucket.file(filePath).exists();
    return exists;
  } catch (error) {
    console.error('[GCS] Exists check failed:', error);
    return false;
  }
}

/**
 * Get file metadata
 * 
 * @param {string} filePath - Path in bucket
 * @returns {Promise<Object>} File metadata
 */
export async function getFileMetadata(filePath) {
  try {
    const [metadata] = await bucket.file(filePath).getMetadata();
    return metadata;
  } catch (error) {
    console.error('[GCS] Metadata fetch failed:', error);
    throw new Error(`Failed to get file metadata: ${error.message}`);
  }
}

/**
 * Upload design image to GCS
 * 
 * @param {Buffer} imageBuffer - Image data
 * @param {string} designId - Design UUID
 * @param {Object} metadata - Design metadata
 * @returns {Promise<Object>} Upload result with signed URL
 */
export async function uploadDesign(imageBuffer, designId, metadata = {}) {
  const timestamp = Date.now();
  const destinationPath = `designs/${designId}_${timestamp}.png`;

  return uploadToGCS(imageBuffer, destinationPath, {
    contentType: 'image/png',
    metadata: {
      designId,
      userId: metadata.userId,
      style: metadata.style,
      bodyPart: metadata.bodyPart,
      type: 'design'
    }
  });
}

/**
 * Upload layer PNG to GCS
 * 
 * @param {Buffer} imageBuffer - RGBA PNG data
 * @param {string} designId - Design UUID
 * @param {string} layerType - Layer type: 'subject', 'background', 'effect'
 * @param {Object} metadata - Layer metadata
 * @returns {Promise<Object>} Upload result with signed URL
 */
export async function uploadLayer(imageBuffer, designId, layerType, metadata = {}) {
  const timestamp = Date.now();
  const destinationPath = `layers/${designId}_${layerType}_${timestamp}.png`;

  return uploadToGCS(imageBuffer, destinationPath, {
    contentType: 'image/png',
    metadata: {
      designId,
      layerType,
      userId: metadata.userId,
      type: 'layer'
    }
  });
}

/**
 * Upload layer thumbnail to GCS
 * 
 * @param {Buffer} thumbnailBuffer - 64x64px thumbnail
 * @param {string} designId - Design UUID
 * @param {string} layerType - Layer type
 * @returns {Promise<Object>} Upload result with signed URL
 */
export async function uploadLayerThumbnail(thumbnailBuffer, designId, layerType) {
  const timestamp = Date.now();
  const destinationPath = `layers/${designId}_${layerType}_${timestamp}_thumb.png`;

  return uploadToGCS(thumbnailBuffer, destinationPath, {
    contentType: 'image/png',
    metadata: {
      designId,
      layerType,
      type: 'thumbnail'
    }
  });
}

/**
 * Upload stencil export to GCS (300 DPI)
 * 
 * @param {Buffer} stencilBuffer - High-res stencil PNG
 * @param {string} designId - Design UUID
 * @param {Object} metadata - Stencil metadata
 * @returns {Promise<Object>} Upload result with signed URL
 */
export async function uploadStencil(stencilBuffer, designId, metadata = {}) {
  const timestamp = Date.now();
  const destinationPath = `stencils/${designId}_${timestamp}_300dpi.png`;

  return uploadToGCS(stencilBuffer, destinationPath, {
    contentType: 'image/png',
    metadata: {
      designId,
      userId: metadata.userId,
      dpi: '300',
      type: 'stencil'
    }
  });
}

/**
 * Upload portfolio image to GCS
 * 
 * @param {Buffer} imageBuffer - Portfolio image
 * @param {string} artistId - Artist UUID
 * @param {number} index - Image index
 * @returns {Promise<Object>} Upload result with signed URL
 */
export async function uploadPortfolio(imageBuffer, artistId, index) {
  const destinationPath = `portfolios/${artistId}_${index}.jpg`;

  return uploadToGCS(imageBuffer, destinationPath, {
    contentType: 'image/jpeg',
    metadata: {
      artistId,
      index: index.toString(),
      type: 'portfolio'
    }
  });
}

/**
 * List files in a folder
 * 
 * @param {string} prefix - Folder prefix (e.g., 'designs/')
 * @param {number} maxResults - Maximum results to return
 * @returns {Promise<Array>} Array of file objects
 */
export async function listFiles(prefix, maxResults = 100) {
  try {
    const [files] = await bucket.getFiles({
      prefix,
      maxResults
    });

    return files.map(file => ({
      name: file.name,
      size: parseInt(file.metadata.size, 10),
      contentType: file.metadata.contentType,
      created: file.metadata.timeCreated,
      updated: file.metadata.updated,
      metadata: file.metadata.metadata || {}
    }));

  } catch (error) {
    console.error('[GCS] List files failed:', error);
    throw new Error(`Failed to list files: ${error.message}`);
  }
}

/**
 * Batch delete files
 * 
 * @param {string[]} filePaths - Array of file paths to delete
 * @returns {Promise<Object>} Delete results
 */
export async function batchDelete(filePaths) {
  const results = {
    deleted: [],
    failed: []
  };

  for (const filePath of filePaths) {
    try {
      await deleteFromGCS(filePath);
      results.deleted.push(filePath);
    } catch (error) {
      results.failed.push({ filePath, error: error.message });
    }
  }

  return results;
}

/**
 * Health check for GCS connection
 * 
 * @returns {Promise<Object>} Health status
 */
export async function checkGCSHealth() {
  try {
    // Try to get bucket metadata
    const [metadata] = await bucket.getMetadata();
    
    return {
      healthy: true,
      bucket: bucketName,
      location: metadata.location,
      storageClass: metadata.storageClass,
      created: metadata.timeCreated
    };

  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      bucket: bucketName
    };
  }
}

export default {
  uploadToGCS,
  getSignedUrl,
  deleteFromGCS,
  fileExists,
  getFileMetadata,
  uploadDesign,
  uploadLayer,
  uploadLayerThumbnail,
  uploadStencil,
  uploadPortfolio,
  listFiles,
  batchDelete,
  checkGCSHealth
};

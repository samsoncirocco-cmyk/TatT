/**
 * Image Processing Service for Tattoo Designs
 *
 * Uses Sharp.js to post-process AI-generated tattoo designs
 * to make them stencil-ready and production-quality.
 *
 * Processing Pipeline:
 * 1. Fetch image from Replicate URL
 * 2. Increase contrast for crisp stencil lines
 * 3. Resize to 300 DPI (professional tattoo quality)
 * 4. Convert to high-quality PNG
 * 5. Optionally save to local storage
 *
 * Note: Sharp.js runs in Node.js environment.
 * For browser-only usage, we use Canvas API.
 */

/**
 * Check if we're in a browser environment
 * Sharp.js only works in Node.js, so we disable it for browser builds
 */
const isBrowser = typeof window !== 'undefined';
const isSharpAvailable = false; // Disabled for browser builds

/**
 * Image processing configuration
 */
const PROCESSING_CONFIG = {
  // 300 DPI at 10 inches = 3000 pixels
  stencilSize: 3000,

  // Contrast enhancement for crisp lines
  contrastMultiplier: 1.2,

  // Saturation boost for vibrant colors
  saturationMultiplier: 1.1,

  // PNG quality
  pngQuality: 100,

  // Output format
  format: 'png'
};

/**
 * Process image for tattoo stencil
 * Uses Sharp.js for high-quality processing
 *
 * @param {string} imageUrl - URL of the generated image
 * @returns {Promise<Buffer>} Processed image buffer
 */
export async function processForStencil(imageUrl) {
  if (!isSharpAvailable) {
    console.warn('[ImageProcessing] Sharp not available, returning original URL');
    return { url: imageUrl, processed: false };
  }

  try {
    console.log('[ImageProcessing] Fetching image from:', imageUrl);

    // Fetch image from Replicate URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const imageBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(imageBuffer);

    console.log('[ImageProcessing] Processing image with Sharp...');

    // Apply Sharp transformations
    const processedBuffer = await sharp(buffer)
      // Resize to 300 DPI quality (3000x3000 at 10 inches)
      .resize(PROCESSING_CONFIG.stencilSize, PROCESSING_CONFIG.stencilSize, {
        fit: 'inside',
        withoutEnlargement: false,
        kernel: 'lanczos3' // High-quality interpolation
      })
      // Enhance saturation for vibrant colors
      .modulate({
        brightness: 1,
        saturation: PROCESSING_CONFIG.saturationMultiplier
      })
      // Increase contrast for crisp lines
      // Formula: output = (input * multiplier) - (128 * (multiplier - 1))
      .linear(
        PROCESSING_CONFIG.contrastMultiplier,
        -(128 * (PROCESSING_CONFIG.contrastMultiplier - 1))
      )
      // Convert to high-quality PNG
      .png({
        quality: PROCESSING_CONFIG.pngQuality,
        compressionLevel: 9,
        adaptiveFiltering: true
      })
      .toBuffer();

    console.log('[ImageProcessing] Image processed successfully');

    return {
      buffer: processedBuffer,
      processed: true,
      size: processedBuffer.length,
      dimensions: {
        width: PROCESSING_CONFIG.stencilSize,
        height: PROCESSING_CONFIG.stencilSize
      }
    };

  } catch (error) {
    console.error('[ImageProcessing] Error processing image:', error);
    throw new Error(`Image processing failed: ${error.message}`);
  }
}

/**
 * Process multiple images in parallel
 *
 * @param {string[]} imageUrls - Array of image URLs
 * @returns {Promise<Object[]>} Array of processed image results
 */
export async function processBatch(imageUrls) {
  console.log(`[ImageProcessing] Processing batch of ${imageUrls.length} images`);

  const results = await Promise.allSettled(
    imageUrls.map(url => processForStencil(url))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return {
        success: true,
        originalUrl: imageUrls[index],
        ...result.value
      };
    } else {
      return {
        success: false,
        originalUrl: imageUrls[index],
        error: result.reason.message
      };
    }
  });
}

/**
 * Browser-based image processing fallback
 * Uses Canvas API for basic processing when Sharp is not available
 *
 * @param {string} imageUrl - URL of the image
 * @returns {Promise<Blob>} Processed image blob
 */
export async function processInBrowser(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        // Create canvas
        const canvas = document.createElement('canvas');
        const targetSize = 2048; // Smaller than Sharp version but still high quality
        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext('2d');

        // Draw image
        ctx.drawImage(img, 0, 0, targetSize, targetSize);

        // Get image data for processing
        const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
        const data = imageData.data;

        // Apply contrast enhancement
        const contrastFactor = (259 * (20 + 255)) / (255 * (259 - 20)); // ~20% contrast boost

        for (let i = 0; i < data.length; i += 4) {
          // Increase contrast for RGB channels
          data[i] = contrastFactor * (data[i] - 128) + 128;     // R
          data[i + 1] = contrastFactor * (data[i + 1] - 128) + 128; // G
          data[i + 2] = contrastFactor * (data[i + 2] - 128) + 128; // B
          // Alpha channel stays the same (data[i + 3])
        }

        // Put processed data back
        ctx.putImageData(imageData, 0, 0);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            resolve({
              blob,
              processed: true,
              url: URL.createObjectURL(blob),
              size: blob.size
            });
          },
          'image/png',
          1.0
        );

      } catch (error) {
        reject(new Error(`Canvas processing failed: ${error.message}`));
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageUrl;
  });
}

/**
 * Save processed image to browser storage
 * Uses IndexedDB for larger files
 *
 * @param {Blob|Buffer} imageData - Processed image data
 * @param {string} designId - Unique design identifier
 * @returns {Promise<string>} Storage key
 */
export async function saveToStorage(imageData, designId) {
  try {
    // Convert buffer to blob if needed
    let blob = imageData;
    if (imageData instanceof Buffer) {
      blob = new Blob([imageData], { type: 'image/png' });
    }

    // Create object URL for immediate use
    const objectUrl = URL.createObjectURL(blob);

    // Store in IndexedDB for persistence
    await saveToIndexedDB(designId, blob);

    return objectUrl;

  } catch (error) {
    console.error('[ImageProcessing] Error saving to storage:', error);
    throw error;
  }
}

/**
 * Save blob to IndexedDB
 */
function saveToIndexedDB(key, blob) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TattooDesigns', 1);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images');
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');

      const putRequest = store.put(blob, key);

      putRequest.onsuccess = () => resolve(key);
      putRequest.onerror = () => reject(putRequest.error);
    };
  });
}

/**
 * Retrieve image from IndexedDB
 */
export function getFromIndexedDB(key) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TattooDesigns', 1);

    request.onerror = () => reject(request.error);

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['images'], 'readonly');
      const store = transaction.objectStore('images');

      const getRequest = store.get(key);

      getRequest.onsuccess = () => {
        if (getRequest.result) {
          const url = URL.createObjectURL(getRequest.result);
          resolve(url);
        } else {
          reject(new Error('Image not found'));
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    };
  });
}

/**
 * Download processed image to user's device
 *
 * @param {string} imageUrl - Image URL or blob URL
 * @param {string} filename - Desired filename
 */
export function downloadImage(imageUrl, filename = 'tattoo-design.png') {
  const link = document.createElement('a');
  link.href = imageUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Get image metadata
 */
export async function getImageMetadata(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight
      });
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

/**
 * Convert image URL to base64
 * Useful for storing in localStorage
 */
export async function urlToBase64(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

/**
 * Optimize image for AR preview
 * Smaller file size for real-time AR overlay
 */
export async function optimizeForAR(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const targetSize = 1024; // Good balance for AR
      canvas.width = targetSize;
      canvas.height = targetSize;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, targetSize, targetSize);

      canvas.toBlob(
        (blob) => {
          resolve({
            blob,
            url: URL.createObjectURL(blob),
            size: blob.size
          });
        },
        'image/png',
        0.9 // Slightly compressed for AR performance
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

/**
 * Stencil Processing Service
 *
 * Converts AI-generated tattoo designs into professional stencil-ready formats
 * optimized for thermal printers and copier transfer methods.
 *
 * Features:
 * - High-contrast black/white conversion
 * - Adjustable threshold for line weight control
 * - Multiple size presets (4", 6", 8", 10")
 * - 300 DPI print-ready output
 * - Brightness/contrast adjustments
 */

// Standard stencil sizes in inches (at 300 DPI)
export const STENCIL_SIZES = {
  small: {
    name: 'Small (4")',
    inches: 4,
    pixels: 1200, // 4" × 300 DPI
    description: 'Perfect for wrists, ankles, behind ear'
  },
  medium: {
    name: 'Medium (6")',
    inches: 6,
    pixels: 1800, // 6" × 300 DPI
    description: 'Ideal for forearms, calves, shoulders'
  },
  large: {
    name: 'Large (8")',
    inches: 8,
    pixels: 2400, // 8" × 300 DPI
    description: 'Great for full arms, backs, thighs'
  },
  xlarge: {
    name: 'X-Large (10")',
    inches: 10,
    pixels: 3000, // 10" × 300 DPI
    description: 'Best for large back pieces, full sleeves'
  }
};

// Default stencil settings
const DEFAULT_STENCIL_SETTINGS = {
  threshold: 128, // 0-255, lower = more black, higher = more white
  contrast: 1.2, // Multiplier for contrast boost
  brightness: 0, // -100 to 100
  invert: false, // Invert black/white (for certain printers)
  smoothing: false // Anti-aliasing for smoother edges
};

/**
 * Convert image to high-contrast stencil
 * @param {string} imageUrl - URL of the original image
 * @param {Object} settings - Stencil conversion settings
 * @returns {Promise<string>} Data URL of stencil image
 */
export async function convertToStencil(imageUrl, settings = {}) {
  // Validate imageUrl
  if (!imageUrl) {
    throw new Error('Image URL is required');
  }

  const options = { ...DEFAULT_STENCIL_SETTINGS, ...settings };

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        // Create canvas for processing
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          throw new Error('Failed to create canvas context');
        }

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Process pixels: convert to grayscale + apply threshold
        for (let i = 0; i < data.length; i += 4) {
          // Convert to grayscale
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;

          // Apply brightness adjustment
          let brightness = avg + options.brightness;

          // Apply contrast
          brightness = ((brightness - 128) * options.contrast) + 128;

          // Clamp values
          brightness = Math.max(0, Math.min(255, brightness));

          // Apply threshold (binary black or white)
          const value = brightness >= options.threshold ? 255 : 0;

          // Apply inversion if needed
          const finalValue = options.invert ? (255 - value) : value;

          // Set RGB to same value (grayscale)
          data[i] = finalValue;     // Red
          data[i + 1] = finalValue; // Green
          data[i + 2] = finalValue; // Blue
          // Alpha stays the same (data[i + 3])
        }

        // Put processed data back
        ctx.putImageData(imageData, 0, 0);

        // Convert to data URL
        const stencilDataUrl = canvas.toDataURL('image/png');
        resolve(stencilDataUrl);
      } catch (error) {
        reject(new Error(`Failed to process stencil: ${error.message}`));
      }
    };

    img.onerror = (error) => {
      reject(new Error(`Failed to load image for stencil conversion: ${error?.message || 'Unknown error'}`));
    };

    img.src = imageUrl;
  });
}

/**
 * Resize image to specific stencil size
 * @param {string} imageUrl - URL of the image
 * @param {string} sizeKey - Key from STENCIL_SIZES
 * @returns {Promise<string>} Data URL of resized image
 */
export async function resizeToStencilSize(imageUrl, sizeKey) {
  // Validate inputs
  if (!imageUrl) {
    throw new Error('Image URL is required');
  }

  const size = STENCIL_SIZES[sizeKey];
  if (!size) {
    throw new Error(`Invalid size: ${sizeKey}`);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Failed to create canvas context');
        }

        // Set to desired size
        canvas.width = size.pixels;
        canvas.height = size.pixels;

        // Draw image scaled to fit
        ctx.drawImage(img, 0, 0, size.pixels, size.pixels);

        resolve(canvas.toDataURL('image/png'));
      } catch (error) {
        reject(new Error(`Failed to resize image: ${error.message}`));
      }
    };

    img.onerror = (error) => {
      reject(new Error(`Failed to load image: ${error?.message || 'Unknown error'}. Please check the image URL.`));
    };

    img.src = imageUrl;
  });
}

/**
 * Generate stencil-ready image with size and processing
 * @param {string} imageUrl - Original image URL
 * @param {string} sizeKey - Desired size
 * @param {Object} settings - Processing settings
 * @param {string} mode - Processing mode: 'threshold' or 'edge'
 * @returns {Promise<string>} Data URL of final stencil
 */
export async function generateStencil(imageUrl, sizeKey = 'medium', settings = {}, mode = 'threshold') {
  try {
    console.log('[Stencil] Generating stencil:', sizeKey, 'mode:', mode);

    // Step 1: Resize to target size
    const resized = await resizeToStencilSize(imageUrl, sizeKey);

    // Step 2: Convert to high-contrast stencil based on mode
    let stencil;
    if (mode === 'edge') {
      // Edge detection mode - dynamically import to avoid loading unless needed
      console.log('[Stencil] Using edge detection mode');
      const { convertToEdgeStencil } = await import('./stencilEdgeService.js');
      
      const edgeSettings = {
        lowThreshold: settings.threshold ? settings.threshold * 0.4 : 50,
        highThreshold: settings.threshold || 150,
        suppressNonMaximum: true
      };
      
      stencil = await convertToEdgeStencil(resized, edgeSettings);
    } else {
      // Default threshold mode
      stencil = await convertToStencil(resized, settings);
    }

    console.log('[Stencil] ✓ Stencil generated successfully');
    return stencil;
  } catch (error) {
    console.error('[Stencil] Generation error:', error);
    throw error;
  }
}

/**
 * Download stencil image
 * @param {string} dataUrl - Stencil data URL
 * @param {string} filename - Download filename
 */
export function downloadStencil(dataUrl, filename = 'tattoo-stencil.png') {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Get recommended settings for different tattoo styles
 */
export const STYLE_PRESETS = {
  traditional: {
    name: 'Traditional',
    threshold: 140,
    contrast: 1.3,
    brightness: 10,
    description: 'Bold lines, high contrast'
  },
  fineline: {
    name: 'Fine Line',
    threshold: 100,
    contrast: 1.1,
    brightness: -5,
    description: 'Delicate, detailed linework'
  },
  blackwork: {
    name: 'Blackwork',
    threshold: 160,
    contrast: 1.5,
    brightness: 20,
    description: 'Maximum contrast, solid blacks'
  },
  dotwork: {
    name: 'Dotwork/Stippling',
    threshold: 120,
    contrast: 1.0,
    brightness: 0,
    description: 'Preserve dot density'
  },
  balanced: {
    name: 'Balanced',
    threshold: 128,
    contrast: 1.2,
    brightness: 0,
    description: 'Good starting point'
  }
};

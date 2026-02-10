import { PAPER_SIZES, validateDimensions, validateDPI, DEFAULT_DPI } from '@/utils/stencilCalibration';
import { createStencilPDF } from '@/utils/pdfGenerator';

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
const DEFAULT_PAPER_MARGIN = 0.25; // inches

/**
 * Convert image to high-contrast stencil
 * @param {string} imageUrl - URL of the original image
 * @param {Object} settings - Stencil conversion settings
 * @returns {Promise<string>} Data URL of stencil image
 */
export async function convertToStencil(imageUrl, settings = {}, options = {}) {
  // Validate imageUrl
  if (!imageUrl) {
    throw new Error('Image URL is required');
  }

  const stencilOptions = { ...DEFAULT_STENCIL_SETTINGS, ...settings };
  const { onProgress } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = async () => {
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

        const totalPixels = data.length / 4;
        const shouldChunk = totalPixels > 2400 * 2400;
        const chunkSize = shouldChunk ? 120000 : totalPixels;
        let processedPixels = 0;

        const processChunk = async (startPixel) => {
          const endPixel = Math.min(totalPixels, startPixel + chunkSize);

          for (let pixel = startPixel; pixel < endPixel; pixel++) {
            const i = pixel * 4;

            // Convert to grayscale
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;

            // Apply brightness adjustment
            let brightness = avg + stencilOptions.brightness;

            // Apply contrast
            brightness = ((brightness - 128) * stencilOptions.contrast) + 128;

            // Clamp values
            brightness = Math.max(0, Math.min(255, brightness));

            // Apply threshold (binary black or white)
            const value = brightness >= stencilOptions.threshold ? 255 : 0;

            // Apply inversion if needed
            const finalValue = stencilOptions.invert ? (255 - value) : value;

            // Set RGB to same value (grayscale)
            data[i] = finalValue;     // Red
            data[i + 1] = finalValue; // Green
            data[i + 2] = finalValue; // Blue
            // Alpha stays the same (data[i + 3])
          }

          processedPixels = endPixel;

          if (shouldChunk && typeof onProgress === 'function') {
            onProgress(Number((processedPixels / totalPixels).toFixed(3)));
          }

          if (shouldChunk && endPixel < totalPixels) {
            await new Promise((resolveChunk) => setTimeout(resolveChunk, 0));
          }
        };

        for (let startPixel = 0; startPixel < totalPixels; startPixel += chunkSize) {
          await processChunk(startPixel);
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
async function processStencilImage(imageUrl, sizeKey, settings, mode, onProgress) {
  const size = STENCIL_SIZES[sizeKey] || STENCIL_SIZES.medium;
  if (!size) {
    throw new Error(`Invalid stencil size: ${sizeKey}`);
  }

  const progress = typeof onProgress === 'function' ? onProgress : null;
  progress?.(0.05);

  const resized = await resizeToStencilSize(imageUrl, sizeKey);
  progress?.(0.3);

  if (mode === 'edge') {
    const { convertToEdgeStencil } = await import('./stencilEdgeService.js');
    const edgeSettings = {
      lowThreshold: settings.threshold ? settings.threshold * 0.4 : 50,
      highThreshold: settings.threshold || 150,
      suppressNonMaximum: true
    };
    const edgeStencil = await convertToEdgeStencil(resized, edgeSettings);
    progress?.(1);
    return { dataUrl: edgeStencil, size };
  }

  const stencil = await convertToStencil(resized, settings, {
    onProgress: (value) => {
      if (progress) {
        const normalized = 0.3 + value * 0.65;
        progress(Number(Math.min(1, normalized).toFixed(3)));
      }
    }
  });
  progress?.(1);
  return { dataUrl: stencil, size };
}

export async function generateStencil(
  imageUrl,
  sizeKey = 'medium',
  settings = {},
  mode = 'threshold',
  options = {}
) {
  const {
    exportFormat = 'png',
    onProgress,
    metadata,
    paperSize = 'letter',
    customPaperDimensions
  } = options;

  if (exportFormat === 'pdf') {
    return generateStencilPDF(imageUrl, sizeKey, settings, mode, {
      metadata,
      paperSize,
      customPaperDimensions,
      onProgress
    });
  }

  try {
    const { dataUrl } = await processStencilImage(imageUrl, sizeKey, settings, mode, onProgress);
    return dataUrl;
  } catch (error) {
    console.error('[Stencil] Generation error:', error);
    throw error;
  }
}

export async function generateStencilPDF(
  imageUrl,
  sizeKey = 'medium',
  settings = {},
  mode = 'threshold',
  options = {}
) {
  const {
    paperSize = 'letter',
    customPaperDimensions,
    metadata = {},
    onProgress
  } = options;

  const progress = typeof onProgress === 'function'
    ? (value) => onProgress(Number(Math.min(Math.max(value, 0), 1).toFixed(3)))
    : null;

  progress?.(0.05);
  validateDPI(DEFAULT_DPI);

  const { dataUrl, size } = await processStencilImage(
    imageUrl,
    sizeKey,
    settings,
    mode,
    (value) => {
      if (progress) {
        progress(value * 0.75);
      }
    }
  );

  const designDimensions = {
    widthInches: size?.inches || STENCIL_SIZES.medium.inches,
    heightInches: size?.inches || STENCIL_SIZES.medium.inches
  };

  const paperDimensions = resolvePaperDimensions(paperSize, customPaperDimensions);
  enforcePaperFit(designDimensions, paperDimensions);

  const metadataPayload = buildExportMetadata(metadata, {
    designDimensions,
    paperSizeKey: paperDimensions.key,
    format: 'pdf'
  });

  progress?.(0.85);
  const pdf = createStencilPDF(
    dataUrl,
    {
      paperWidthInches: paperDimensions.widthInches,
      paperHeightInches: paperDimensions.heightInches,
      designWidthInches: designDimensions.widthInches,
      designHeightInches: designDimensions.heightInches
    },
    metadataPayload
  );

  const blob = pdf.output('blob');
  progress?.(1);

  return {
    blob,
    metadata: metadataPayload,
    filename: `${slugify(metadataPayload.design_name || 'tattoo')}-${designDimensions.widthInches.toFixed(0)}in.pdf`
  };
}

/**
 * Download stencil image
 * @param {string} dataUrl - Stencil data URL
 * @param {string} filename - Download filename
 */
export function downloadStencil(data, filename = 'tattoo-stencil.png') {
  const link = document.createElement('a');
  if (data instanceof Blob) {
    link.href = URL.createObjectURL(data);
  } else {
    link.href = data;
  }
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (data instanceof Blob) {
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
  }
}

function resolvePaperDimensions(paperSizeKey, customPaperDimensions = {}) {
  if (paperSizeKey === 'custom') {
    const validated = validateDimensions(
      customPaperDimensions.width || 8.5,
      customPaperDimensions.height || 11,
      customPaperDimensions.unit || 'inches'
    );

    return {
      key: 'custom',
      name: 'Custom',
      widthInches: validated.widthInches,
      heightInches: validated.heightInches,
      unit: 'inches'
    };
  }

  const preset = PAPER_SIZES[paperSizeKey] || PAPER_SIZES.letter;

  return {
    key: preset.key,
    name: preset.name,
    widthInches: preset.widthInches,
    heightInches: preset.heightInches,
    unit: preset.unit
  };
}

function enforcePaperFit(designDimensions, paperDimensions) {
  if (!designDimensions || !paperDimensions) {
    return;
  }

  const requiredWidth = designDimensions.widthInches + DEFAULT_PAPER_MARGIN * 2;
  const requiredHeight = designDimensions.heightInches + DEFAULT_PAPER_MARGIN * 2;

  if (requiredWidth > paperDimensions.widthInches || requiredHeight > paperDimensions.heightInches) {
    throw new Error('Design exceeds selected paper size. Choose a larger paper or select a smaller stencil.');
  }
}

function buildExportMetadata(userMetadata = {}, context = {}) {
  const designDimensions = context.designDimensions || {};

  const base = {
    design_name: userMetadata.design_name || 'Tattoo Stencil',
    design_id: userMetadata.design_id
      || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `design-${Date.now()}`),
    dimensions: {
      width_inches: Number((designDimensions.widthInches || 0).toFixed(3)),
      height_inches: Number((designDimensions.heightInches || 0).toFixed(3)),
      unit: 'inches'
    },
    dpi: userMetadata.dpi || DEFAULT_DPI,
    format: context.format || userMetadata.format || 'png',
    paper_size: context.paperSizeKey || userMetadata.paper_size || 'letter',
    created_at: userMetadata.created_at || new Date().toISOString(),
    artist_notes: userMetadata.artist_notes || '',
    artist: userMetadata.artist || 'TatTester'
  };

  return { ...userMetadata, ...base };
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'tattoo';
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

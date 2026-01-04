/**
 * Stencil Edge Detection Service
 * 
 * Implements lightweight edge detection for stencil generation.
 * Uses Sobel operator for edge detection without heavy dependencies.
 * 
 * Alternative to opencv.js (which is 5MB+) - this is ~2KB inline.
 */

/**
 * Apply Sobel edge detection to image data
 * @param {ImageData} imageData - Canvas ImageData object
 * @returns {ImageData} Edge-detected image data
 */
function applySobelEdgeDetection(imageData) {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  
  // Create output array
  const output = new Uint8ClampedArray(data.length);
  
  // Sobel kernels
  const sobelX = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1]
  ];
  
  const sobelY = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1]
  ];
  
  // Convert to grayscale first
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    gray[idx] = (data[i] + data[i + 1] + data[i + 2]) / 3;
  }
  
  // Apply Sobel operator
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;
      
      // Convolve with Sobel kernels
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixelIdx = (y + ky) * width + (x + kx);
          const pixelValue = gray[pixelIdx];
          
          gx += pixelValue * sobelX[ky + 1][kx + 1];
          gy += pixelValue * sobelY[ky + 1][kx + 1];
        }
      }
      
      // Calculate gradient magnitude
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      
      // Normalize to 0-255
      const normalizedMagnitude = Math.min(255, magnitude);
      
      const outputIdx = y * width + x;
      const outputPixelIdx = outputIdx * 4;
      
      output[outputPixelIdx] = normalizedMagnitude;
      output[outputPixelIdx + 1] = normalizedMagnitude;
      output[outputPixelIdx + 2] = normalizedMagnitude;
      output[outputPixelIdx + 3] = 255; // Alpha
    }
  }
  
  // Copy output to imageData
  for (let i = 0; i < output.length; i++) {
    data[i] = output[i];
  }
  
  return imageData;
}

/**
 * Apply non-maximum suppression to thin edges
 * @param {ImageData} imageData - Edge-detected image data
 * @returns {ImageData} Thinned edges
 */
function applyNonMaximumSuppression(imageData) {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  
  const output = new Uint8ClampedArray(data.length);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const current = data[idx];
      
      // Check 8-connected neighbors
      const neighbors = [
        data[((y - 1) * width + (x - 1)) * 4],
        data[((y - 1) * width + x) * 4],
        data[((y - 1) * width + (x + 1)) * 4],
        data[(y * width + (x - 1)) * 4],
        data[(y * width + (x + 1)) * 4],
        data[((y + 1) * width + (x - 1)) * 4],
        data[((y + 1) * width + x) * 4],
        data[((y + 1) * width + (x + 1)) * 4]
      ];
      
      // Keep pixel if it's a local maximum
      const isMaximum = neighbors.every(n => current >= n);
      const value = isMaximum ? current : 0;
      
      output[idx] = value;
      output[idx + 1] = value;
      output[idx + 2] = value;
      output[idx + 3] = 255;
    }
  }
  
  // Copy output to imageData
  for (let i = 0; i < output.length; i++) {
    data[i] = output[i];
  }
  
  return imageData;
}

/**
 * Apply hysteresis thresholding (Canny's double threshold)
 * @param {ImageData} imageData - Edge image data
 * @param {number} lowThreshold - Low threshold (0-255)
 * @param {number} highThreshold - High threshold (0-255)
 * @returns {ImageData} Binary edge map
 */
function applyHysteresisThreshold(imageData, lowThreshold = 50, highThreshold = 150) {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  
  // Mark strong and weak edges
  const edges = new Uint8Array(width * height);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const pixelIdx = idx * 4;
      const value = data[pixelIdx];
      
      if (value >= highThreshold) {
        edges[idx] = 255; // Strong edge
      } else if (value >= lowThreshold) {
        edges[idx] = 128; // Weak edge
      } else {
        edges[idx] = 0; // Not an edge
      }
    }
  }
  
  // Connect weak edges to strong edges
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      
      if (edges[idx] === 128) { // Weak edge
        // Check if connected to a strong edge
        const hasStrongNeighbor = [
          edges[(y - 1) * width + (x - 1)],
          edges[(y - 1) * width + x],
          edges[(y - 1) * width + (x + 1)],
          edges[y * width + (x - 1)],
          edges[y * width + (x + 1)],
          edges[(y + 1) * width + (x - 1)],
          edges[(y + 1) * width + x],
          edges[(y + 1) * width + (x + 1)]
        ].some(n => n === 255);
        
        edges[idx] = hasStrongNeighbor ? 255 : 0;
      }
    }
  }
  
  // Write binary result back to imageData
  for (let i = 0; i < edges.length; i++) {
    const pixelIdx = i * 4;
    const value = edges[i];
    data[pixelIdx] = value;
    data[pixelIdx + 1] = value;
    data[pixelIdx + 2] = value;
    data[pixelIdx + 3] = 255;
  }
  
  return imageData;
}

/**
 * Perform Canny-like edge detection on canvas image data
 * @param {ImageData} imageData - Input image data
 * @param {Object} options - Detection options
 * @returns {ImageData} Edge-detected image data
 */
export function detectEdges(imageData, options = {}) {
  const {
    lowThreshold = 50,
    highThreshold = 150,
    suppressNonMaximum = true
  } = options;
  
  console.log('[EdgeDetection] Applying Sobel edge detection...');
  
  // Step 1: Apply Sobel operator
  let result = applySobelEdgeDetection(imageData);
  
  // Step 2: Non-maximum suppression (optional, for thinner edges)
  if (suppressNonMaximum) {
    console.log('[EdgeDetection] Applying non-maximum suppression...');
    result = applyNonMaximumSuppression(result);
  }
  
  // Step 3: Hysteresis thresholding
  console.log('[EdgeDetection] Applying hysteresis thresholding...');
  result = applyHysteresisThreshold(result, lowThreshold, highThreshold);
  
  console.log('[EdgeDetection] ✓ Edge detection complete');
  
  return result;
}

/**
 * Convert image to edge-detected stencil
 * @param {string} imageUrl - Image URL
 * @param {Object} settings - Edge detection settings
 * @returns {Promise<string>} Data URL of edge-detected stencil
 */
export async function convertToEdgeStencil(imageUrl, settings = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
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
        
        // Apply edge detection
        const edgeData = detectEdges(imageData, settings);
        
        // Put processed data back
        ctx.putImageData(edgeData, 0, 0);
        
        // Convert to data URL
        const stencilDataUrl = canvas.toDataURL('image/png');
        resolve(stencilDataUrl);
      } catch (error) {
        reject(new Error(`Edge detection failed: ${error.message}`));
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for edge detection'));
    };
    
    img.src = imageUrl;
  });
}


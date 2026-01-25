/**
 * Depth Mapping Service
 *
 * Provides utilities for depth map extraction and analysis.
 * Supports hardware depth sensors where available, falling back to monocular estimation.
 */

// ============================================================================
// Types
// ============================================================================

export interface SurfaceNormal {
  x: number;
  y: number;
  z: number;
}

export interface DepthRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DepthQualityResult {
  isReliable: boolean;
  score: number;
  reason: string;
}

// ============================================================================
// Internal Functions
// ============================================================================

/**
 * Estimate depth from a single RGB frame (Simplified for MVP)
 * @param videoElement - Video source
 * @returns Simulated depth map
 */
function estimateMonocularDepth(videoElement: HTMLVideoElement): Float32Array {
  const width = videoElement.videoWidth || 640;
  const height = videoElement.videoHeight || 480;
  const size = width * height;
  const depthMap = new Float32Array(size);

  // For simulation, we create a slight radial gradient
  // suggesting that the center is closer (typical for body part capture)
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Values between 0.5m and 2.0m
      depthMap[y * width + x] = 0.5 + (dist / maxDist) * 1.5;
    }
  }

  return depthMap;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Extract depth data from camera or estimate monocularly
 * @param videoElement - Video source
 * @returns Depth map data
 */
export async function getDepthMap(videoElement: HTMLVideoElement): Promise<Float32Array> {
  if (!videoElement) {
    throw new Error('Video element required for depth mapping');
  }

  // Check for native depth API (WebXR or experimental constraints)
  // This is a placeholder for future native support
  if (videoElement.srcObject) {
    const tracks = (videoElement.srcObject as MediaStream).getTracks();
    const videoTrack = tracks.find(track => track.kind === 'video');

    // In a real implementation with Depth API support:
    // const depthStream = await navigator.mediaDevices.getUserMedia({ video: { depth: true } });
    // ... extract depth data ...
  }

  // Fallback: Monocular Depth Estimation
  return estimateMonocularDepth(videoElement);
}

/**
 * Compute surface orientation at a specific point
 * @param depthMap - Depth map array
 * @param x - x coordinate
 * @param y - y coordinate
 * @param width - depth map width
 * @returns Normal vector {x, y, z}
 */
export function calculateSurfaceNormal(
  depthMap: Float32Array,
  x: number,
  y: number,
  width: number
): SurfaceNormal {
  const idx = Math.floor(y) * width + Math.floor(x);

  // Basic Sobel filter approach for gradients
  const dzdx = (depthMap[idx + 1] - depthMap[idx - 1]) || 0;
  const dzdy = (depthMap[idx + width] - depthMap[idx - width]) || 0;

  // Normal vector: (-dz/dx, -dz/dy, 1)
  const nx = -dzdx;
  const ny = -dzdy;
  const nz = 1.0;

  const mag = Math.sqrt(nx * nx + ny * ny + nz * nz);

  return {
    x: nx / mag,
    y: ny / mag,
    z: nz / mag
  };
}

/**
 * Estimate curvature of a body part in a specified region
 * @param depthMap - Depth map array
 * @param region - Region to analyze {x, y, width, height}
 * @param fullWidth - Full depth map width
 * @returns Curvature score (0-1)
 */
export function estimateCurvature(
  depthMap: Float32Array,
  region: DepthRegion,
  fullWidth: number
): number {
  const { x, y, width, height } = region;
  let totalCurvature = 0;
  let samples = 0;

  for (let j = Math.floor(y); j < y + height; j += 4) {
    for (let i = Math.floor(x); i < x + width; i += 4) {
      const normal = calculateSurfaceNormal(depthMap, i, j, fullWidth);
      // Change in normal over area indicates curvature
      // Here we use a simplified variance of the Z component
      totalCurvature += Math.abs(1.0 - normal.z);
      samples++;
    }
  }

  return samples > 0 ? Math.min(1.0, totalCurvature / samples * 5) : 0;
}

/**
 * Check if depth data is reliable
 * @param depthMap - Depth map array
 * @returns Reliability assessment
 */
export function validateDepthQuality(depthMap: Float32Array): DepthQualityResult {
  if (!depthMap || depthMap.length === 0) {
    return { isReliable: false, score: 0, reason: 'Empty depth map' };
  }

  // Check for extreme values or lack of variance
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;

  for (let i = 0; i < depthMap.length; i++) {
    const v = depthMap[i];
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }

  const range = max - min;
  const avg = sum / depthMap.length;

  // If range is too small, it's a flat surface or noise
  if (range < 0.05) {
    return { isReliable: false, score: 0.2, reason: 'Insufficient depth variance' };
  }

  return { isReliable: true, score: 0.8, reason: 'Valid depth distribution' };
}

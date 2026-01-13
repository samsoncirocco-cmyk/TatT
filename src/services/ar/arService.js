/**
 * AR Service
 * 
 * Abstracts AR functionality (camera access, stream management, capture).
 * Prepares for MindAR integration while maintaining fallback to simple overlay.
 */

/**
 * Request camera access with specified constraints
 * @param {Object} constraints - MediaStream constraints
 * @returns {Promise<MediaStream>} Camera stream
 */
export async function requestCameraAccess(constraints = {}) {
  const defaultConstraints = {
    video: {
      facingMode: 'environment',
      width: { ideal: 1920 },
      height: { ideal: 1080 }
    }
  };

  const finalConstraints = {
    ...defaultConstraints,
    ...constraints
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(finalConstraints);
    console.log('[AR] Camera access granted');
    return stream;
  } catch (error) {
    console.error('[AR] Camera access denied:', error);

    // Provide user-friendly error messages
    if (error.name === 'NotAllowedError') {
      throw new Error('Camera permission denied. Please allow camera access in your browser settings.');
    } else if (error.name === 'NotFoundError') {
      throw new Error('No camera found. Please connect a camera and try again.');
    } else if (error.name === 'NotReadableError') {
      throw new Error('Camera is already in use by another application.');
    } else {
      throw new Error(`Failed to access camera: ${error.message}`);
    }
  }
}

/**
 * Stop all tracks in a media stream
 * @param {MediaStream} stream - Stream to stop
 */
export function stopCameraStream(stream) {
  if (!stream) return;

  stream.getTracks().forEach(track => {
    track.stop();
    console.log('[AR] Camera track stopped:', track.kind);
  });
}

/**
 * Attach stream to video element
 * @param {HTMLVideoElement} videoElement - Video element
 * @param {MediaStream} stream - Camera stream
 * @returns {Promise<void>} Resolves when video is ready
 */
export function attachStreamToVideo(videoElement, stream) {
  return new Promise((resolve, reject) => {
    if (!videoElement) {
      reject(new Error('Video element is required'));
      return;
    }

    videoElement.srcObject = stream;

    videoElement.onloadedmetadata = () => {
      console.log('[AR] Video metadata loaded');
      resolve();
    };

    videoElement.onerror = (error) => {
      console.error('[AR] Video error:', error);
      reject(new Error('Failed to load video stream'));
    };
  });
}

/**
 * Capture frame from video element to canvas
 * @param {HTMLVideoElement} videoElement - Video source
 * @param {HTMLCanvasElement} canvasElement - Canvas target
 * @returns {string} Data URL of captured frame
 */
export function captureFrame(videoElement, canvasElement) {
  if (!videoElement || !canvasElement) {
    throw new Error('Video and canvas elements are required');
  }

  const ctx = canvasElement.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Set canvas dimensions to match video
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;

  // Draw current video frame to canvas
  ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

  // Convert to data URL
  const dataUrl = canvasElement.toDataURL('image/png');
  console.log('[AR] Frame captured');

  return dataUrl;
}

/**
 * Capture depth frame from video element
 * @param {HTMLVideoElement} videoElement - Video source
 * @returns {Promise<Float32Array>} Raw depth map
 */
export async function captureDepthFrame(videoElement) {
  if (!videoElement) {
    throw new Error('Video element required');
  }

  // Import depth service dynamically to avoid circular dependencies if any
  const { getDepthMap } = await import('./depthMappingService');
  return getDepthMap(videoElement);
}

/**
 * Check if device supports depth sensing
 * @returns {Promise<Object>} Depth capabilities
 */
export async function getDepthSensorCapabilities() {
  // Most browsers don't expose this directly yet without WebXR
  // We check for userMedia constraints that might indicate depth support
  const supportsDepth = 'mediaDevices' in navigator &&
    'getSupportedConstraints' in navigator.mediaDevices &&
    navigator.mediaDevices.getSupportedConstraints().depth;

  return {
    isSupported: !!supportsDepth,
    type: supportsDepth ? 'hardware' : 'monocular_fallback',
    resolution: '640x480' // Estimated for fallback
  };
}

/**
 * Check if device supports camera access
 * @returns {boolean} True if camera API is available
 */
export function isCameraSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Get available camera devices
 * @returns {Promise<Array>} List of video input devices
 */
export async function getAvailableCameras() {
  if (!isCameraSupported()) {
    return [];
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(device => device.kind === 'videoinput');
    console.log('[AR] Available cameras:', cameras.length);
    return cameras;
  } catch (error) {
    console.error('[AR] Failed to enumerate devices:', error);
    return [];
  }
}

/**
 * AR Session State
 */
export const ARSessionState = {
  IDLE: 'idle',
  REQUESTING_PERMISSION: 'requesting_permission',
  PERMISSION_DENIED: 'permission_denied',
  NO_CAMERA: 'no_camera',
  LOADING: 'loading',
  ACTIVE: 'active',
  CALIBRATING_DEPTH: 'calibrating_depth',
  ERROR: 'error'
};


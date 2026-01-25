/**
 * AR Service
 *
 * Abstracts AR functionality (camera access, stream management, capture).
 * Prepares for MindAR integration while maintaining fallback to simple overlay.
 */

// ============================================================================
// Types
// ============================================================================

export interface CameraConstraints {
  video?: MediaTrackConstraints | boolean;
  audio?: MediaTrackConstraints | boolean;
}

export interface DepthCapabilities {
  isSupported: boolean;
  type: 'hardware' | 'monocular_fallback';
  resolution: string;
}

export type ARSessionStateType =
  | 'idle'
  | 'requesting_permission'
  | 'permission_denied'
  | 'no_camera'
  | 'loading'
  | 'active'
  | 'calibrating_depth'
  | 'error';

// ============================================================================
// Constants
// ============================================================================

/**
 * AR Session State
 */
export const ARSessionState = {
  IDLE: 'idle' as const,
  REQUESTING_PERMISSION: 'requesting_permission' as const,
  PERMISSION_DENIED: 'permission_denied' as const,
  NO_CAMERA: 'no_camera' as const,
  LOADING: 'loading' as const,
  ACTIVE: 'active' as const,
  CALIBRATING_DEPTH: 'calibrating_depth' as const,
  ERROR: 'error' as const
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Request camera access with specified constraints
 * @param constraints - MediaStream constraints
 * @returns Camera stream
 */
export async function requestCameraAccess(constraints: CameraConstraints = {}): Promise<MediaStream> {
  const defaultConstraints: MediaStreamConstraints = {
    video: {
      facingMode: 'environment',
      width: { ideal: 1920 },
      height: { ideal: 1080 }
    }
  };

  const finalConstraints: MediaStreamConstraints = {
    ...defaultConstraints,
    ...constraints
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(finalConstraints);
    console.log('[AR] Camera access granted');
    return stream;
  } catch (error) {
    const err = error as DOMException;
    console.error('[AR] Camera access denied:', error);

    // Provide user-friendly error messages
    if (err.name === 'NotAllowedError') {
      throw new Error('Camera permission denied. Please allow camera access in your browser settings.');
    } else if (err.name === 'NotFoundError') {
      throw new Error('No camera found. Please connect a camera and try again.');
    } else if (err.name === 'NotReadableError') {
      throw new Error('Camera is already in use by another application.');
    } else {
      throw new Error(`Failed to access camera: ${err.message}`);
    }
  }
}

/**
 * Stop all tracks in a media stream
 * @param stream - Stream to stop
 */
export function stopCameraStream(stream: MediaStream | null | undefined): void {
  if (!stream) return;

  stream.getTracks().forEach(track => {
    track.stop();
    console.log('[AR] Camera track stopped:', track.kind);
  });
}

/**
 * Attach stream to video element
 * @param videoElement - Video element
 * @param stream - Camera stream
 * @returns Resolves when video is ready
 */
export function attachStreamToVideo(videoElement: HTMLVideoElement, stream: MediaStream): Promise<void> {
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

    videoElement.onerror = () => {
      console.error('[AR] Video error');
      reject(new Error('Failed to load video stream'));
    };
  });
}

/**
 * Capture frame from video element to canvas
 * @param videoElement - Video source
 * @param canvasElement - Canvas target
 * @returns Data URL of captured frame
 */
export function captureFrame(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement): string {
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
 * @param videoElement - Video source
 * @returns Raw depth map
 */
export async function captureDepthFrame(videoElement: HTMLVideoElement): Promise<Float32Array> {
  if (!videoElement) {
    throw new Error('Video element required');
  }

  // Import depth service dynamically to avoid circular dependencies if any
  const { getDepthMap } = await import('./depthMappingService.js');
  return getDepthMap(videoElement);
}

/**
 * Check if device supports depth sensing
 * @returns Depth capabilities
 */
export async function getDepthSensorCapabilities(): Promise<DepthCapabilities> {
  // Most browsers don't expose this directly yet without WebXR
  // We check for userMedia constraints that might indicate depth support
  const supportsDepth = 'mediaDevices' in navigator &&
    'getSupportedConstraints' in navigator.mediaDevices &&
    (navigator.mediaDevices.getSupportedConstraints() as any).depth;

  return {
    isSupported: !!supportsDepth,
    type: supportsDepth ? 'hardware' : 'monocular_fallback',
    resolution: '640x480' // Estimated for fallback
  };
}

/**
 * Check if device supports camera access
 * @returns True if camera API is available
 */
export function isCameraSupported(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Get available camera devices
 * @returns List of video input devices
 */
export async function getAvailableCameras(): Promise<MediaDeviceInfo[]> {
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

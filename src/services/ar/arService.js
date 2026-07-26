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
/**
 * How long to wait for the camera stream to report its dimensions before
 * giving up. Without this the UI can sit on a spinner forever.
 */
const METADATA_TIMEOUT_MS = 12000;

/**
 * Machine-readable failure reasons, so the UI can branch without string
 * matching on user-facing copy.
 */
export const ARFailureReason = {
  PERMISSION_DENIED: 'permission-denied',
  NO_CAMERA: 'no-camera',
  CAMERA_BUSY: 'camera-busy',
  INSECURE_CONTEXT: 'insecure-context',
  NO_CAMERA_API: 'no-camera-api',
  STREAM_TIMEOUT: 'stream-timeout',
  UNKNOWN: 'unknown'
};

function arError(message, reason) {
  const error = new Error(message);
  error.reason = reason;
  return error;
}

/**
 * Can this browser run the live camera preview at all?
 *
 * Checked before any UI promises AR, so an unsupported device gets a straight
 * answer instead of a dead viewport.
 *
 * @returns {{supported: boolean, reason: string|null, message: string}}
 */
export function checkArSupport() {
  if (!isCameraSupported()) {
    return {
      supported: false,
      reason: ARFailureReason.NO_CAMERA_API,
      message:
        "This browser can't open a camera. Try Safari on iOS or Chrome on Android, or use the photo preview instead."
    };
  }

  // getUserMedia is only exposed on secure origins; localhost counts.
  if (typeof isSecureContext !== 'undefined' && isSecureContext === false) {
    return {
      supported: false,
      reason: ARFailureReason.INSECURE_CONTEXT,
      message: 'Live preview needs a secure (https) connection to use your camera.'
    };
  }

  return { supported: true, reason: null, message: '' };
}

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
      throw arError(
        'Camera permission denied. Please allow camera access in your browser settings.',
        ARFailureReason.PERMISSION_DENIED
      );
    } else if (error.name === 'NotFoundError') {
      throw arError(
        'No camera found. Please connect a camera and try again.',
        ARFailureReason.NO_CAMERA
      );
    } else if (error.name === 'NotReadableError') {
      throw arError(
        'Camera is already in use by another application.',
        ARFailureReason.CAMERA_BUSY
      );
    } else {
      throw arError(`Failed to access camera: ${error.message}`, ARFailureReason.UNKNOWN);
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

    let settled = false;
    let timer = null;

    const finish = (fn, arg) => {
      if (settled) return;
      settled = true;
      if (timer !== null) clearTimeout(timer);
      videoElement.onloadedmetadata = null;
      videoElement.onerror = null;
      fn(arg);
    };

    // The stream can already be past HAVE_METADATA by the time we attach the
    // handler — loadedmetadata has fired and will not fire again. Waiting on
    // it regardless is what leaves the viewport frozen on a spinner.
    if (videoElement.readyState >= 1) {
      console.log('[AR] Video metadata already available');
      finish(resolve);
      return;
    }

    videoElement.onloadedmetadata = () => {
      console.log('[AR] Video metadata loaded');
      finish(resolve);
    };

    videoElement.onerror = (error) => {
      console.error('[AR] Video error:', error);
      finish(reject, new Error('Failed to load video stream'));
    };

    // Never hang. A camera that opens but never delivers a frame is a real
    // failure mode (busy device, virtual camera, backgrounded tab) and the
    // user deserves to be told rather than watched to spin.
    timer = setTimeout(() => {
      finish(
        reject,
        arError(
          'The camera opened but never started sending video. Close other apps using the camera and try again.',
          ARFailureReason.STREAM_TIMEOUT
        )
      );
    }, METADATA_TIMEOUT_MS);
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

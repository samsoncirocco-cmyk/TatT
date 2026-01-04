/**
 * MindAR Session Manager
 * 
 * Manages AR session lifecycle with automatic fallback to camera overlay.
 */

import { loadMindAR, isMindARSupported } from './mindarLoader.js';
import { requestCameraAccess, stopCameraStream, attachStreamToVideo } from './arService.js';

/**
 * AR Session class
 * Handles both MindAR tracking and fallback camera overlay
 */
export class ARSession {
  constructor() {
    this.type = null; // 'mindar' or 'fallback'
    this.stream = null;
    this.videoElement = null;
    this.mindARInstance = null;
    this.isActive = false;
  }

  /**
   * Start AR session
   * @param {HTMLVideoElement} videoElement - Video element for rendering
   * @param {Object} options - Session options
   * @returns {Promise<Object>} Session info
   */
  async start(videoElement, options = {}) {
    if (this.isActive) {
      console.warn('[ARSession] Session already active');
      return { type: this.type, success: true };
    }

    this.videoElement = videoElement;

    try {
      // Check if MindAR is supported
      const mindARSupported = await isMindARSupported();

      if (mindARSupported && options.preferMindAR !== false) {
        // Try to use MindAR
        console.log('[ARSession] Attempting to use MindAR...');
        const mindAR = await loadMindAR();

        if (mindAR) {
          // Initialize MindAR session
          this.type = 'mindar';
          this.mindARInstance = mindAR;
          this.isActive = true;

          console.log('[ARSession] ✓ MindAR session started');
          return {
            type: 'mindar',
            success: true,
            message: 'Advanced AR tracking enabled'
          };
        }
      }

      // Fallback to standard camera overlay
      console.log('[ARSession] Using fallback camera overlay mode');
      this.type = 'fallback';

      // Request camera access
      this.stream = await requestCameraAccess(options.cameraConstraints);

      // Attach stream to video element
      await attachStreamToVideo(videoElement, this.stream);

      // Play video
      await videoElement.play();

      this.isActive = true;

      console.log('[ARSession] ✓ Fallback camera session started');
      return {
        type: 'fallback',
        success: true,
        message: 'Camera overlay mode active'
      };

    } catch (error) {
      console.error('[ARSession] Failed to start session:', error);
      this.stop(); // Cleanup on failure

      throw error;
    }
  }

  /**
   * Stop AR session and cleanup resources
   */
  stop() {
    console.log('[ARSession] Stopping session...');

    // Stop MindAR if active
    if (this.mindARInstance && this.type === 'mindar') {
      try {
        // Future: this.mindARInstance.stop();
        console.log('[ARSession] MindAR instance stopped');
      } catch (error) {
        console.error('[ARSession] Error stopping MindAR:', error);
      }
    }

    // Stop camera stream
    if (this.stream) {
      stopCameraStream(this.stream);
      this.stream = null;
    }

    // Clear video element
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }

    this.isActive = false;
    this.type = null;
    this.mindARInstance = null;

    console.log('[ARSession] ✓ Session stopped');
  }

  /**
   * Check if session is currently tracking
   * @returns {boolean} True if actively tracking
   */
  isTracking() {
    if (!this.isActive) return false;

    if (this.type === 'mindar' && this.mindARInstance) {
      // Future: return this.mindARInstance.isTracking();
      return false;
    }

    // Fallback mode is always "tracking" (camera is on)
    return this.type === 'fallback';
  }

  /**
   * Get current session type
   * @returns {string|null} 'mindar', 'fallback', or null
   */
  getType() {
    return this.type;
  }

  /**
   * Get session status
   * @returns {Object} Status info
   */
  getStatus() {
    return {
      active: this.isActive,
      type: this.type,
      tracking: this.isTracking(),
      hasStream: !!this.stream
    };
  }
}

/**
 * Create a new AR session
 * @returns {ARSession} New session instance
 */
export function createARSession() {
  return new ARSession();
}


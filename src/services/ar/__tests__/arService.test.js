import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  requestCameraAccess,
  stopCameraStream,
  attachStreamToVideo,
  isCameraSupported,
  checkArSupport,
} from '../arService';

function makeTrack(kind = 'video') {
  return { kind, stop: vi.fn() };
}

function makeStream(tracks = [makeTrack()]) {
  return { getTracks: () => tracks };
}

/**
 * A stand-in for HTMLVideoElement covering the bits the AR path touches.
 * `readyState` starts at HAVE_NOTHING unless a test says otherwise.
 */
function makeVideo({ readyState = 0 } = {}) {
  return {
    readyState,
    srcObject: null,
    onloadedmetadata: null,
    onerror: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
  };
}

describe('requestCameraAccess', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn() },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps NotAllowedError to a permission-denied message', async () => {
    const err = new Error('denied');
    err.name = 'NotAllowedError';
    navigator.mediaDevices.getUserMedia.mockRejectedValue(err);

    await expect(requestCameraAccess()).rejects.toThrow(/permission denied/i);
  });

  it('maps NotFoundError to a no-camera message', async () => {
    const err = new Error('none');
    err.name = 'NotFoundError';
    navigator.mediaDevices.getUserMedia.mockRejectedValue(err);

    await expect(requestCameraAccess()).rejects.toThrow(/no camera/i);
  });

  it('maps NotReadableError to a camera-in-use message', async () => {
    const err = new Error('busy');
    err.name = 'NotReadableError';
    navigator.mediaDevices.getUserMedia.mockRejectedValue(err);

    await expect(requestCameraAccess()).rejects.toThrow(/already in use/i);
  });

  it('tags the thrown error with a stable machine-readable reason', async () => {
    const err = new Error('denied');
    err.name = 'NotAllowedError';
    navigator.mediaDevices.getUserMedia.mockRejectedValue(err);

    await expect(requestCameraAccess()).rejects.toMatchObject({
      reason: 'permission-denied',
    });
  });
});

describe('stopCameraStream', () => {
  it('stops every track', () => {
    const tracks = [makeTrack('video'), makeTrack('audio')];
    stopCameraStream(makeStream(tracks));
    tracks.forEach((t) => expect(t.stop).toHaveBeenCalled());
  });

  it('is safe to call with nothing', () => {
    expect(() => stopCameraStream(null)).not.toThrow();
    expect(() => stopCameraStream(undefined)).not.toThrow();
  });
});

describe('attachStreamToVideo', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves when metadata arrives', async () => {
    const video = makeVideo();
    const promise = attachStreamToVideo(video, makeStream());
    video.onloadedmetadata?.();
    await expect(promise).resolves.toBeUndefined();
  });

  it('resolves immediately when metadata already loaded before we attached', async () => {
    // The race that freezes the viewport: the stream can reach HAVE_METADATA
    // before the handler is installed, and then loadedmetadata never fires
    // again — the promise would hang forever and the UI sits on a spinner.
    const video = makeVideo({ readyState: 1 });
    await expect(attachStreamToVideo(video, makeStream())).resolves.toBeUndefined();
  });

  it('rejects rather than hanging when metadata never arrives', async () => {
    vi.useFakeTimers();
    const video = makeVideo();
    const promise = attachStreamToVideo(video, makeStream());
    const assertion = expect(promise).rejects.toMatchObject({ reason: 'stream-timeout' });
    await vi.advanceTimersByTimeAsync(15000);
    await assertion;
  });

  it('rejects when the video element errors', async () => {
    const video = makeVideo();
    const promise = attachStreamToVideo(video, makeStream());
    video.onerror?.(new Error('boom'));
    await expect(promise).rejects.toThrow();
  });

  it('rejects without a video element', async () => {
    await expect(attachStreamToVideo(null, makeStream())).rejects.toThrow(/video element/i);
  });
});

describe('checkArSupport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports unsupported when getUserMedia is missing', () => {
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('isSecureContext', true);
    const result = checkArSupport();
    expect(result.supported).toBe(false);
    expect(result.reason).toBe('no-camera-api');
    expect(result.message).toBeTruthy();
  });

  it('reports unsupported on an insecure origin', () => {
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn() } });
    vi.stubGlobal('isSecureContext', false);
    const result = checkArSupport();
    expect(result.supported).toBe(false);
    expect(result.reason).toBe('insecure-context');
  });

  it('reports supported when the camera API is present on a secure origin', () => {
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn() } });
    vi.stubGlobal('isSecureContext', true);
    expect(checkArSupport().supported).toBe(true);
  });
});

describe('isCameraSupported', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is false without mediaDevices', () => {
    vi.stubGlobal('navigator', {});
    expect(isCameraSupported()).toBe(false);
  });
});

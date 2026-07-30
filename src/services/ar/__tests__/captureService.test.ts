import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  pickClipMime,
  checkClipSupport,
  compositeFrame,
  recordCanvasClip,
  downloadBlob,
  captureFilename,
  CLIP_DURATION_MS,
} from '../captureService';

/**
 * The clip/still capture pipeline. Two things matter here:
 *  1. Fallback logic — a browser that cannot record must be told so before
 *     any UI offers a clip button.
 *  2. The privacy invariant — NOTHING in the capture path touches the
 *     network. The last describe block pins that with spies.
 */

// ─── Mime selection ────────────────────────────────────────────────────

describe('pickClipMime', () => {
  it('prefers mp4 when the browser can record it (Safari, and the recipient most likely plays it)', () => {
    const mime = pickClipMime(() => true);
    expect(mime).toEqual({ mimeType: 'video/mp4;codecs=avc1', extension: 'mp4' });
  });

  it('falls back to webm when mp4 is unsupported (Chrome/Firefox)', () => {
    const mime = pickClipMime((t) => t.startsWith('video/webm'));
    expect(mime?.extension).toBe('webm');
    expect(mime?.mimeType).toBe('video/webm;codecs=vp9');
  });

  it('walks down to plain webm when codecs are picky', () => {
    const mime = pickClipMime((t) => t === 'video/webm');
    expect(mime).toEqual({ mimeType: 'video/webm', extension: 'webm' });
  });

  it('returns null when nothing is recordable', () => {
    expect(pickClipMime(() => false)).toBeNull();
  });

  it('treats a throwing isTypeSupported as unsupported, not a crash', () => {
    expect(
      pickClipMime(() => {
        throw new Error('nope');
      }),
    ).toBeNull();
  });
});

// ─── Support detection ─────────────────────────────────────────────────

describe('checkClipSupport', () => {
  const canvasProto = HTMLCanvasElement.prototype as HTMLCanvasElement & {
    captureStream?: () => MediaStream;
  };
  const hadCaptureStream = 'captureStream' in canvasProto;
  const originalCaptureStream = canvasProto.captureStream;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (hadCaptureStream) canvasProto.captureStream = originalCaptureStream;
    else delete canvasProto.captureStream;
  });

  it('is unsupported without MediaRecorder (older iOS Safari) — still-only, gracefully', () => {
    // jsdom has no MediaRecorder by default; make it explicit anyway.
    vi.stubGlobal('MediaRecorder', undefined);
    expect(checkClipSupport()).toEqual({ supported: false, mime: null });
  });

  it('is unsupported when the canvas cannot produce a stream', () => {
    vi.stubGlobal(
      'MediaRecorder',
      Object.assign(function () {}, { isTypeSupported: () => true }),
    );
    delete canvasProto.captureStream;
    expect(checkClipSupport()).toEqual({ supported: false, mime: null });
  });

  it('is supported with a concrete mime when everything is present', () => {
    vi.stubGlobal(
      'MediaRecorder',
      Object.assign(function () {}, {
        isTypeSupported: (t: string) => t.startsWith('video/webm'),
      }),
    );
    canvasProto.captureStream = () => ({ getTracks: () => [] }) as unknown as MediaStream;
    expect(checkClipSupport()).toEqual({
      supported: true,
      mime: { mimeType: 'video/webm;codecs=vp9', extension: 'webm' },
    });
  });
});

// ─── Compositing ───────────────────────────────────────────────────────

describe('compositeFrame', () => {
  it('paints the camera frame and sinks the design into it with the mirror blend', () => {
    const frame = document.createElement('canvas');
    frame.width = 100;
    frame.height = 100;
    const fctx = frame.getContext('2d')!;
    fctx.fillStyle = 'rgb(200,150,120)'; // skin-ish
    fctx.fillRect(0, 0, 100, 100);

    const design = document.createElement('canvas');
    design.width = 10;
    design.height = 10;
    const dctx = design.getContext('2d')!;
    dctx.fillStyle = 'rgb(0,0,0)';
    dctx.fillRect(0, 0, 10, 10);

    const out = document.createElement('canvas');
    out.width = 100;
    out.height = 100;
    const ctx = out.getContext('2d')!;

    compositeFrame(ctx, frame, 100, 100, design, {
      x: 50,
      y: 50,
      size: 20,
      rotation: 0,
      opacity: 1,
      blendMode: 'multiply',
    });

    const center = ctx.getImageData(50, 50, 1, 1).data;
    const corner = ctx.getImageData(2, 2, 1, 1).data;
    // Corner is untouched camera frame; center is camera multiplied by black ink.
    expect([corner[0], corner[1], corner[2]]).toEqual([200, 150, 120]);
    expect(center[0]).toBeLessThan(50);
  });

  it('draws only the camera frame when there is no design', () => {
    const frame = document.createElement('canvas');
    frame.width = 8;
    frame.height = 8;
    frame.getContext('2d')!.fillRect(0, 0, 8, 8);

    const out = document.createElement('canvas');
    out.width = 8;
    out.height = 8;
    const ctx = out.getContext('2d')!;
    expect(() =>
      compositeFrame(ctx, frame, 8, 8, null, {
        x: 50,
        y: 50,
        size: 40,
        rotation: 0,
        opacity: 1,
        blendMode: 'multiply',
      }),
    ).not.toThrow();
  });
});

// ─── Recording ─────────────────────────────────────────────────────────

/**
 * A scripted MediaRecorder: emits one chunk and fires onstop when stop() is
 * called, like the real thing but synchronous enough to test.
 */
class FakeRecorder {
  static instances: FakeRecorder[] = [];
  static failOnStart = false;
  static emitChunks = true;

  state = 'inactive';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onerror: (() => void) | null = null;
  onstop: (() => void) | null = null;

  constructor(
    public stream: MediaStream,
    public options: { mimeType: string },
  ) {
    FakeRecorder.instances.push(this);
  }

  start() {
    if (FakeRecorder.failOnStart) throw new Error('cannot start');
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    if (FakeRecorder.emitChunks) {
      this.ondataavailable?.({ data: new Blob(['x'], { type: 'video/webm' }) });
    }
    this.onstop?.();
  }
}

describe('recordCanvasClip', () => {
  const canvasProto = HTMLCanvasElement.prototype as HTMLCanvasElement & {
    captureStream?: (fps?: number) => MediaStream;
  };
  const hadCaptureStream = 'captureStream' in canvasProto;
  const originalCaptureStream = canvasProto.captureStream;
  let tracks: Array<{ stop: ReturnType<typeof vi.fn> }>;

  beforeEach(() => {
    vi.useFakeTimers();
    FakeRecorder.instances = [];
    FakeRecorder.failOnStart = false;
    FakeRecorder.emitChunks = true;
    tracks = [{ stop: vi.fn() }];
    canvasProto.captureStream = () =>
      ({ getTracks: () => tracks }) as unknown as MediaStream;
    vi.stubGlobal('MediaRecorder', FakeRecorder);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    if (hadCaptureStream) canvasProto.captureStream = originalCaptureStream;
    else delete canvasProto.captureStream;
  });

  const mime = { mimeType: 'video/webm', extension: 'webm' as const };

  it('records for the clip duration, resolves a Blob, and releases the stream', async () => {
    const canvas = document.createElement('canvas');
    const onFrame = vi.fn();
    const promise = recordCanvasClip(canvas, mime, { onFrame });

    // Recording begins immediately and repaints at least once.
    expect(FakeRecorder.instances).toHaveLength(1);
    expect(onFrame).toHaveBeenCalled();

    vi.advanceTimersByTime(CLIP_DURATION_MS + 50);
    const blob = await promise;

    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe('video/webm');
    expect(tracks[0].stop).toHaveBeenCalled();
  });

  it('rejects when the recording comes back empty — no silent zero-byte file', async () => {
    FakeRecorder.emitChunks = false;
    const canvas = document.createElement('canvas');
    const promise = recordCanvasClip(canvas, mime);
    promise.catch(() => {}); // avoid unhandled rejection between timers
    vi.advanceTimersByTime(CLIP_DURATION_MS + 50);
    await expect(promise).rejects.toThrow(/empty/i);
    expect(tracks[0].stop).toHaveBeenCalled();
  });

  it('rejects and releases the stream when the recorder cannot start', async () => {
    FakeRecorder.failOnStart = true;
    const canvas = document.createElement('canvas');
    await expect(recordCanvasClip(canvas, mime)).rejects.toThrow();
    expect(tracks[0].stop).toHaveBeenCalled();
  });
});

// ─── Filenames & download ──────────────────────────────────────────────

describe('downloadBlob / captureFilename', () => {
  it('names captures distinctly by kind and extension', () => {
    expect(captureFilename('still', 'png')).toMatch(/^tatt-ar-still-\d+\.png$/);
    expect(captureFilename('clip', 'mp4')).toMatch(/^tatt-ar-clip-\d+\.mp4$/);
  });

  it('downloads via a local object URL and revokes it', () => {
    const createObjectURL = vi.fn(() => 'blob:local-1');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    downloadBlob(new Blob(['x']), 'tatt-ar-still-1.png');

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:local-1');
    vi.unstubAllGlobals();
  });
});

// ─── THE PRIVACY INVARIANT ─────────────────────────────────────────────

describe('no-upload guarantee: the capture path never touches the network', () => {
  const canvasProto = HTMLCanvasElement.prototype as HTMLCanvasElement & {
    captureStream?: (fps?: number) => MediaStream;
  };
  const hadCaptureStream = 'captureStream' in canvasProto;
  const originalCaptureStream = canvasProto.captureStream;

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    if (hadCaptureStream) canvasProto.captureStream = originalCaptureStream;
    else delete canvasProto.captureStream;
  });

  it('composites, records, and downloads without a single fetch/XHR/sendBeacon', async () => {
    const fetchSpy = vi.fn();
    const xhrOpen = vi.fn();
    const beacon = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(xhrOpen);
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: beacon,
    });

    // Composite a frame.
    const frame = document.createElement('canvas');
    frame.width = 16;
    frame.height = 16;
    const out = document.createElement('canvas');
    out.width = 16;
    out.height = 16;
    compositeFrame(out.getContext('2d')!, frame, 16, 16, null, {
      x: 50,
      y: 50,
      size: 40,
      rotation: 0,
      opacity: 1,
      blendMode: 'multiply',
    });

    // Record a clip.
    vi.useFakeTimers();
    FakeRecorder.instances = [];
    FakeRecorder.failOnStart = false;
    FakeRecorder.emitChunks = true;
    canvasProto.captureStream = () =>
      ({ getTracks: () => [{ stop: vi.fn() }] }) as unknown as MediaStream;
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    const clipPromise = recordCanvasClip(out, { mimeType: 'video/webm', extension: 'webm' });
    vi.advanceTimersByTime(CLIP_DURATION_MS + 50);
    const blob = await clipPromise;
    vi.useRealTimers();

    // Download it.
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadBlob(blob, 'tatt-ar-clip-1.webm');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrOpen).not.toHaveBeenCalled();
    expect(beacon).not.toHaveBeenCalled();

    // The module itself contains no network call sites either — belt and
    // braces against a future import sneaking one in.
    const fs = await import('node:fs');
    const path = await import('node:path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../captureService.ts'),
      'utf-8',
    );
    // Call-site patterns (the doc comments naming these APIs are the point).
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/new\s+XMLHttpRequest/);
    expect(source).not.toMatch(/sendBeacon\s*\(/);
    expect(source).not.toMatch(/new\s+WebSocket/);
  });
});

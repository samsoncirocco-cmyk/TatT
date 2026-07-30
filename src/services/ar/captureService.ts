/**
 * AR capture pipeline — still frames and 3-second clips, entirely on-device.
 *
 * PRIVACY INVARIANT (load-bearing): the privacy policy promises that camera
 * frames never leave the device. Nothing in this module may perform network
 * I/O — no fetch, no XHR, no sendBeacon, no WebSocket. Captures exist only as
 * local Blobs; they leave the device exclusively through an explicit user
 * action (a download the user tapped, or the OS share sheet the user tapped).
 * `captureService.test.ts` asserts this with network spies; keep it true.
 */

/** Clip length. Three seconds is a group-chat moment, not a film. */
export const CLIP_DURATION_MS = 3000;

/** Frame rate requested from the canvas stream. */
export const CLIP_FPS = 30;

export interface ClipMime {
  /** Value handed to MediaRecorder. */
  mimeType: string;
  /** File extension matching the container. */
  extension: 'mp4' | 'webm';
}

/**
 * Container preference order. Safari records mp4 (and cannot play webm it
 * recorded elsewhere); Chrome/Firefox record webm. mp4 first because it is
 * the container the *recipient's* phone is most likely to play — the whole
 * point of the clip is the group chat on the other end.
 */
const CLIP_MIME_CANDIDATES: ClipMime[] = [
  { mimeType: 'video/mp4;codecs=avc1', extension: 'mp4' },
  { mimeType: 'video/mp4', extension: 'mp4' },
  { mimeType: 'video/webm;codecs=vp9', extension: 'webm' },
  { mimeType: 'video/webm;codecs=vp8', extension: 'webm' },
  { mimeType: 'video/webm', extension: 'webm' },
];

/**
 * Pick the first clip container this browser can actually record.
 * Injectable predicate so the fallback order is unit-testable.
 */
export function pickClipMime(
  isTypeSupported: (type: string) => boolean,
): ClipMime | null {
  for (const candidate of CLIP_MIME_CANDIDATES) {
    try {
      if (isTypeSupported(candidate.mimeType)) return candidate;
    } catch {
      // A hostile isTypeSupported is the same as "no".
    }
  }
  return null;
}

export interface ClipSupport {
  supported: boolean;
  mime: ClipMime | null;
}

/**
 * Can this browser record a clip from a canvas at all?
 *
 * Checked before any UI offers the clip button, so an unsupported browser
 * (no MediaRecorder, no canvas.captureStream — e.g. older iOS Safari) is
 * quietly offered stills only instead of a button that fails on tap.
 */
export function checkClipSupport(): ClipSupport {
  if (typeof MediaRecorder === 'undefined') return { supported: false, mime: null };
  if (typeof HTMLCanvasElement === 'undefined') return { supported: false, mime: null };
  const proto = HTMLCanvasElement.prototype as HTMLCanvasElement & {
    captureStream?: (fps?: number) => MediaStream;
  };
  if (typeof proto.captureStream !== 'function') return { supported: false, mime: null };
  if (typeof MediaRecorder.isTypeSupported !== 'function') {
    return { supported: false, mime: null };
  }
  const mime = pickClipMime((t) => MediaRecorder.isTypeSupported(t));
  return { supported: mime !== null, mime };
}

/** The geometry of one placed design, in percent of the frame. */
export interface OverlayTransform {
  /** Center, percent of frame width/height. */
  x: number;
  y: number;
  /** Width, percent of frame width. */
  size: number;
  /** Degrees. */
  rotation: number;
  /** 0..1 */
  opacity: number;
  /** Canvas composite mode — must match the on-screen CSS blend. */
  blendMode: GlobalCompositeOperation;
}

/** Anything drawImage accepts as a design source. */
export type DrawableDesign = HTMLImageElement | HTMLCanvasElement;

/**
 * Composite one frame — camera pixels plus the placed design — exactly as
 * the mirror shows it. Shared by the still capture and every frame of the
 * clip so the two artifacts can never disagree about what "this view" was.
 */
export function compositeFrame(
  ctx: CanvasRenderingContext2D,
  frame: CanvasImageSource,
  frameWidth: number,
  frameHeight: number,
  design: DrawableDesign | null,
  transform: OverlayTransform,
): void {
  ctx.clearRect(0, 0, frameWidth, frameHeight);
  ctx.drawImage(frame, 0, 0, frameWidth, frameHeight);
  if (!design) return;

  const designWidth =
    (design as HTMLImageElement).naturalWidth || (design as HTMLCanvasElement).width || 1;
  const designHeight =
    (design as HTMLImageElement).naturalHeight || (design as HTMLCanvasElement).height || 1;

  const drawW = (frameWidth * transform.size) / 100;
  const drawH = drawW * (designHeight / designWidth);
  const cx = (frameWidth * transform.x) / 100;
  const cy = (frameHeight * transform.y) / 100;

  ctx.save();
  ctx.globalAlpha = transform.opacity;
  ctx.globalCompositeOperation = transform.blendMode;
  ctx.translate(cx, cy);
  ctx.rotate((transform.rotation * Math.PI) / 180);
  ctx.drawImage(design, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}

/** Render a canvas to a PNG Blob; rejects when the canvas cannot encode. */
export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('The capture could not be encoded.'));
    }, 'image/png');
  });
}

export interface RecordClipOptions {
  durationMs?: number;
  /**
   * Called before each recorded frame — this is where the caller redraws the
   * canvas with the current camera frame and overlay. Runs on rAF.
   */
  onFrame?: () => void;
  /** Progress 0..1, for a recording indicator. */
  onProgress?: (fraction: number) => void;
}

/**
 * Record a short clip of a canvas.
 *
 * The canvas is the only source: camera pixels reach it via compositeFrame
 * in the caller's onFrame, and the recorder never sees the raw camera
 * stream. Resolves with the encoded Blob; rejects if the recorder errors or
 * produces nothing. Always releases the capture stream's tracks.
 */
export function recordCanvasClip(
  canvas: HTMLCanvasElement,
  mime: ClipMime,
  options: RecordClipOptions = {},
): Promise<Blob> {
  const durationMs = options.durationMs ?? CLIP_DURATION_MS;

  return new Promise((resolve, reject) => {
    const stream = (canvas as HTMLCanvasElement & {
      captureStream: (fps?: number) => MediaStream;
    }).captureStream(CLIP_FPS);

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: mime.mimeType });
    } catch (error) {
      stream.getTracks().forEach((t) => t.stop());
      reject(error instanceof Error ? error : new Error('Recording is not available.'));
      return;
    }

    const chunks: Blob[] = [];
    let rafId: number | null = null;
    let stopTimer: ReturnType<typeof setTimeout> | null = null;
    let settled = false;
    const startedAt = Date.now();

    const cleanup = () => {
      if (rafId !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(rafId);
      }
      rafId = null;
      if (stopTimer !== null) clearTimeout(stopTimer);
      stopTimer = null;
      stream.getTracks().forEach((t) => t.stop());
    };

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    };

    recorder.onerror = () => {
      fail(new Error('Recording failed partway through. Try again.'));
    };

    recorder.onstop = () => {
      if (settled) return;
      settled = true;
      cleanup();
      if (chunks.length === 0) {
        reject(new Error('The recording came back empty. Try again.'));
        return;
      }
      resolve(new Blob(chunks, { type: mime.mimeType.split(';')[0] }));
    };

    // Keep the canvas repainting while the recorder runs; a canvas stream
    // only emits frames when the canvas actually changes.
    const tick = () => {
      if (settled) return;
      options.onFrame?.();
      options.onProgress?.(Math.min(1, (Date.now() - startedAt) / durationMs));
      if (typeof requestAnimationFrame === 'function') {
        rafId = requestAnimationFrame(tick);
      }
    };

    try {
      recorder.start();
    } catch (error) {
      fail(error instanceof Error ? error : new Error('Recording could not start.'));
      return;
    }

    tick();
    stopTimer = setTimeout(() => {
      if (recorder.state !== 'inactive') recorder.stop();
    }, durationMs);
  });
}

/**
 * Local download — the user tapped save, the file lands on their device.
 * This is one of the two sanctioned exits for a capture (the other is the
 * OS share sheet). Nothing here touches the network.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** tatt-ar-<stamp>.<ext> — sortable, collision-safe enough for a camera roll. */
export function captureFilename(kind: 'still' | 'clip', extension: string): string {
  return `tatt-ar-${kind}-${Date.now()}.${extension}`;
}

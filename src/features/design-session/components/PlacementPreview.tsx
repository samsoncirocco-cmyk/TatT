'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Canvas, Control, Transform } from 'fabric';
import type { DesignSession, Variation } from '@/services/designSession/types';
import {
  assessBackdrop,
  stripBackdrop,
  OPAQUE_SCENE_MESSAGE,
  UNREADABLE_MESSAGE,
} from '@/lib/designBackdrop';
import { attachPlacementPreview, sharePlacementPreview } from '../services/designSessionApi';

/**
 * The placement-preview step: the user photographs their own arm (or any
 * body part), then builds the piece on it — tapping tray thumbnails adds
 * designs to the Fabric.js canvas (several at once, like the reference
 * tattoo-editor apps), each independently draggable, pinch-to-scalable,
 * and rotatable via the single corner knob. The flattened screenshot
 * attaches to the session's Brief, so it rides into the booking record
 * with the rest of the handoff.
 *
 * Every design is composited with the 'multiply' blend mode — that is what
 * makes ink sink into skin tone instead of floating on top like a sticker
 * (white paper multiplies to skin, black ink stays black). Do NOT swap it
 * for default source-over compositing; without it the preview is exactly
 * the flat-sticker look this step exists to avoid.
 */
const DESIGN_BLEND_MODE = 'multiply';

/** Longest edge of the exported screenshot — keeps the payload well under the route's cap. */
const EXPORT_MAX_EDGE = 1600;

/** A fresh design lands at 40% of the photo's width. */
const INITIAL_DESIGN_FRACTION = 0.4;

const CANVAS_MAX_HEIGHT = 560;

const PINK = '#ff1f6b';

type FabricModule = typeof import('fabric');

type PreparedDesign =
  | { ok: true; source: HTMLImageElement | HTMLCanvasElement }
  | { ok: false; message: string };

/**
 * Vet a design render, then re-draw it with its near-white paper stripped to
 * real alpha. The classification lives in @/lib/designBackdrop so this step
 * and any other consumer share one threshold — see that file for why the
 * border is the signal.
 *
 * Refusing is a real outcome here, not an edge case. ADR-0023 pins every
 * render to flash art on white precisely so this step works, but a prompt is
 * a request and the provider can ignore it. An on-skin render has no paper to
 * strip, so compositing it would multiply a photograph of someone else's arm
 * onto the user's own photo — a full-frame rectangle, not a tattoo. Better to
 * say the design can't be previewed than to show that and call it a preview.
 */
function prepareDesign(img: HTMLImageElement): PreparedDesign {
  const scratch = document.createElement('canvas');
  scratch.width = img.naturalWidth;
  scratch.height = img.naturalHeight;
  const ctx = scratch.getContext('2d');
  if (!ctx) return { ok: false, message: UNREADABLE_MESSAGE };
  ctx.drawImage(img, 0, 0);

  let pixels: ImageData;
  try {
    pixels = ctx.getImageData(0, 0, scratch.width, scratch.height);
  } catch {
    // Tainted canvas — the CDN didn't answer the CORS preflight. We cannot
    // see the pixels, so we cannot rule out a photograph, and the flattened
    // export would fail on the same taint anyway. Refuse rather than guess.
    return { ok: false, message: UNREADABLE_MESSAGE };
  }

  const verdict = assessBackdrop(pixels);
  if (verdict.kind === 'opaque-scene') return { ok: false, message: OPAQUE_SCENE_MESSAGE };
  // Already RGBA: the provider cut it out for us, nothing to strip.
  if (verdict.kind === 'transparent') return { ok: true, source: img };

  stripBackdrop(pixels);
  ctx.putImageData(pixels, 0, 0);
  return { ok: true, source: scratch };
}

/**
 * The reference apps drive size AND rotation from one bottom-right knob —
 * scale follows the pointer's distance from the design's center, rotation
 * follows its angle around it.
 */
function scaleRotateHandler(
  _event: unknown,
  transform: Transform,
  x: number,
  y: number
): boolean {
  const target = transform.target;
  const center = target.getCenterPoint();
  const startDist = Math.max(Math.hypot(transform.ex - center.x, transform.ey - center.y), 1);
  const startAngle = Math.atan2(transform.ey - center.y, transform.ex - center.x);
  const dist = Math.hypot(x - center.x, y - center.y);
  const angle = Math.atan2(y - center.y, x - center.x);
  const original = transform.original as { scaleX: number; angle: number };
  const scale = Math.max(0.05, original.scaleX * (dist / startDist));
  target.set({
    scaleX: scale,
    scaleY: scale,
    angle: original.angle + ((angle - startAngle) * 180) / Math.PI,
  });
  return true;
}

function renderKnob(ctx: CanvasRenderingContext2D, left: number, top: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(left, top, 11, 0, Math.PI * 2);
  ctx.fillStyle = PINK;
  ctx.fill();
  ctx.restore();
}

function renderRemove(ctx: CanvasRenderingContext2D, left: number, top: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(left, top, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#0a0a0a';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(left - 4, top - 4);
  ctx.lineTo(left + 4, top + 4);
  ctx.moveTo(left + 4, top - 4);
  ctx.lineTo(left - 4, top + 4);
  ctx.stroke();
  ctx.restore();
}

/** Distance and angle between the first two active touches. */
function touchGesture(touches: TouchList): { dist: number; angle: number } {
  const dx = touches[1].clientX - touches[0].clientX;
  const dy = touches[1].clientY - touches[0].clientY;
  return { dist: Math.hypot(dx, dy), angle: (Math.atan2(dy, dx) * 180) / Math.PI };
}

type SaveState = 'idle' | 'saving' | 'saved';
type ShareState = 'idle' | 'sharing' | 'shared';

export function PlacementPreview({
  session,
  onAttached,
}: {
  session: DesignSession;
  onAttached?: (session: DesignSession) => void;
}) {
  const designs: { label: string; variation: Variation }[] = [
    ...(session.refinedVariation?.imageUrl
      ? [{ label: 'Refined design', variation: session.refinedVariation }]
      : []),
    ...session.variations
      .filter((v) => v.imageUrl)
      .map((v, i) => ({ label: `Design ${i + 1}`, variation: v })),
  ];
  const primaryDesign = designs[0];

  /**
   * The target zone, already resolved during intake. We trust that tag rather
   * than trying to recognise the body part in the user's photo — the photo is
   * theirs to frame, and guessing at it would be a v2 concern at best.
   */
  const placement = session.brief?.placement ?? null;

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  /** The flattened composite plus the ids actually on the canvas when it was taken. */
  const [review, setReview] = useState<{ url: string; designIds: string[] } | null>(null);
  const [shareState, setShareState] = useState<ShareState>('idle');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  /** Durable URL returned by the save — the only thing that may be shared. */
  const [savedPreviewUrl, setSavedPreviewUrl] = useState<string | null>(
    session.brief?.placementPreviewUrl ?? null
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricModule | null>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  /** Export multiplier that upscales the display canvas back toward photo resolution. */
  const exportMultiplierRef = useRef(1);
  const pinchRef = useRef<{ dist: number; angle: number; scaleX: number; objAngle: number } | null>(
    null
  );

  /**
   * Any edit invalidates the flattened composite, so the review panel and the
   * share link it produced are dropped together. Showing a side-by-side that
   * no longer matches the canvas would be worse than showing none.
   */
  const markDirty = useCallback(() => {
    setSaveState('idle');
    setReview(null);
    setShareState('idle');
    setShareUrl(null);
  }, []);

  /** Build the stage whenever the photo changes: canvas sized to the photo, photo locked as background. */
  useEffect(() => {
    if (!photoUrl || !canvasElRef.current || !containerRef.current) return;

    let disposed = false;
    let canvas: Canvas | null = null;

    (async () => {
      const fabric = await import('fabric');
      fabricRef.current = fabric;
      const photoEl = await fabric.util.loadImage(photoUrl);
      if (disposed || !canvasElRef.current || !containerRef.current) return;

      const containerWidth = containerRef.current.clientWidth;
      const photoScale = Math.min(
        containerWidth / photoEl.naturalWidth,
        CANVAS_MAX_HEIGHT / photoEl.naturalHeight
      );
      const width = Math.round(photoEl.naturalWidth * photoScale);
      const height = Math.round(photoEl.naturalHeight * photoScale);
      exportMultiplierRef.current = Math.min(
        EXPORT_MAX_EDGE / Math.max(width, height),
        photoEl.naturalWidth / width
      );

      canvas = new fabric.Canvas(canvasElRef.current, {
        width,
        height,
        selection: false,
        preserveObjectStacking: true,
      });
      fabricCanvasRef.current = canvas;

      canvas.backgroundImage = new fabric.FabricImage(photoEl, {
        scaleX: photoScale,
        scaleY: photoScale,
        originX: 'left',
        originY: 'top',
      });

      const syncSelection = () => {
        const active = canvas?.getActiveObject();
        setHasSelection(!!active);
        setOpacity(active?.opacity ?? 1);
      };
      canvas.on('selection:created', syncSelection);
      canvas.on('selection:updated', syncSelection);
      canvas.on('selection:cleared', syncSelection);
      canvas.on('object:modified', markDirty);

      canvas.requestRenderAll();
      setCanvasReady(true);
      setSaveState('idle');
      setError(null);
    })().catch(() => {
      if (!disposed) setError('Could not load that photo onto the canvas — try another one.');
    });

    return () => {
      disposed = true;
      setCanvasReady(false);
      setHasSelection(false);
      fabricCanvasRef.current = null;
      canvas?.dispose();
    };
  }, [photoUrl, markDirty]);

  /** Tray tap → add that design to the canvas as a fresh transformable object. */
  const handleAddDesign = async (variation: Variation) => {
    const fabric = fabricRef.current;
    const canvas = fabricCanvasRef.current;
    if (!fabric || !canvas || !variation.imageUrl) return;
    setError(null);

    let designEl: HTMLImageElement;
    try {
      designEl = await fabric.util.loadImage(variation.imageUrl, { crossOrigin: 'anonymous' });
    } catch {
      setError('Could not load that design — try another one.');
      return;
    }

    const prepared = prepareDesign(designEl);
    if (!prepared.ok) {
      setError(prepared.message);
      return;
    }

    const img = new fabric.FabricImage(prepared.source, {
      globalCompositeOperation: DESIGN_BLEND_MODE,
      originX: 'center',
      originY: 'center',
      borderColor: PINK,
      transparentCorners: false,
    });
    // Tag the object so the side-by-side can name exactly what was placed,
    // even after individual designs are removed with the corner knob.
    (img as unknown as { designId?: string }).designId = variation.id;

    const scale = (canvas.getWidth() * INITIAL_DESIGN_FRACTION) / (img.width ?? 1);
    img.set({
      scaleX: scale,
      scaleY: scale,
      left: canvas.getWidth() / 2,
      top: canvas.getHeight() / 2,
    });

    // One bottom-right knob does combined scale+rotate (the reference-app
    // gesture); top-left removes. All stock handles are replaced.
    img.controls = {
      scaleRotate: new fabric.Control({
        x: 0.5,
        y: 0.5,
        cursorStyle: 'grab',
        actionName: 'scaleRotate',
        actionHandler: scaleRotateHandler,
        render: (ctx, left, top) => renderKnob(ctx, left, top),
        sizeX: 28,
        sizeY: 28,
      }),
      remove: new fabric.Control({
        x: -0.5,
        y: -0.5,
        cursorStyle: 'pointer',
        mouseUpHandler: (_e, transform) => {
          canvas.remove(transform.target);
          canvas.requestRenderAll();
          markDirty();
          return true;
        },
        render: (ctx, left, top) => renderRemove(ctx, left, top),
        sizeX: 26,
        sizeY: 26,
      }) as Control,
    };

    img.setCoords();
    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.requestRenderAll();
    markDirty();
  };

  /** Two-finger pinch = scale, twist = rotate, on the selected design. */
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !canvasReady) return;

    const activeImage = () => {
      const canvas = fabricCanvasRef.current;
      const active = canvas?.getActiveObject();
      // A second finger often lands without a prior tap-select — fall back
      // to the top design so the pinch always grabs something.
      return active ?? canvas?.getObjects().at(-1);
    };

    const onTouchStart = (e: TouchEvent) => {
      const img = activeImage();
      if (e.touches.length !== 2 || !img) return;
      const { dist, angle } = touchGesture(e.touches);
      pinchRef.current = { dist, angle, scaleX: img.scaleX ?? 1, objAngle: img.angle ?? 0 };
    };
    const onTouchMove = (e: TouchEvent) => {
      const start = pinchRef.current;
      const img = activeImage();
      const canvas = fabricCanvasRef.current;
      if (e.touches.length !== 2 || !start || !img || !canvas) return;
      e.preventDefault();
      const { dist, angle } = touchGesture(e.touches);
      const scale = Math.max(0.05, start.scaleX * (dist / start.dist));
      img.set({ scaleX: scale, scaleY: scale, angle: start.objAngle + (angle - start.angle) });
      img.setCoords();
      canvas.requestRenderAll();
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2 && pinchRef.current) {
        pinchRef.current = null;
        markDirty();
      }
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: true });
    container.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [canvasReady, markDirty]);

  const handlePhotoChange = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleOpacity = (value: number) => {
    setOpacity(value);
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (canvas && active) {
      active.set({ opacity: value });
      canvas.requestRenderAll();
      markDirty();
    }
  };

  const handleFlip = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (canvas && active) {
      active.set({ flipX: !active.flipX });
      canvas.requestRenderAll();
      markDirty();
    }
  };

  const handleDuplicate = async () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    const copy = await active.clone();
    copy.controls = active.controls;
    copy.set({ left: (active.left ?? 0) + 24, top: (active.top ?? 0) + 24 });
    copy.setCoords();
    canvas.add(copy);
    canvas.setActiveObject(copy);
    canvas.requestRenderAll();
    markDirty();
  };

  const handleClear = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.remove(...canvas.getObjects());
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    markDirty();
  };

  /** Flatten the scene to a PNG data URL (selection handles excluded). */
  const exportPng = (): string | null => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return null;
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    try {
      return canvas.toDataURL({ format: 'png', multiplier: exportMultiplierRef.current });
    } catch {
      // Tainted canvas — the design CDN didn't answer the CORS preflight.
      setError('This design blocks screenshot export — try another one.');
      return null;
    }
  };

  const handleDownload = () => {
    const dataUrl = review?.url ?? exportPng();
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'tatt-placement-preview.png';
    link.click();
  };

  /** Flatten and open the side-by-side: the design as drawn, next to it on you. */
  const handleReview = () => {
    const canvas = fabricCanvasRef.current;
    const dataUrl = exportPng();
    if (!canvas || !dataUrl) return;
    const designIds = canvas
      .getObjects()
      .map((obj) => (obj as unknown as { designId?: string }).designId)
      .filter((id): id is string => !!id);
    setError(null);
    setReview({ url: dataUrl, designIds });
  };

  const handleSave = async () => {
    const dataUrl = review?.url ?? exportPng();
    if (!dataUrl) return;
    setSaveState('saving');
    setError(null);
    try {
      const updated = await attachPlacementPreview(session.id, dataUrl);
      setSaveState('saved');
      setSavedPreviewUrl(updated.brief?.placementPreviewUrl ?? null);
      onAttached?.(updated);
    } catch (err: unknown) {
      setSaveState('idle');
      setError(err instanceof Error ? err.message : 'Saving the preview failed — try again.');
    }
  };

  /**
   * Share the SAVED preview, never the local canvas export — the share store
   * hands a URL to a stranger, so it has to point at something durable.
   */
  const handleShare = async () => {
    if (!savedPreviewUrl) return;
    setShareState('sharing');
    setError(null);
    try {
      const url = await sharePlacementPreview({
        imageUrl: savedPreviewUrl,
        prompt: primaryDesign?.variation.prompt ?? 'Tattoo placement preview',
        style: session.brief?.styleTags?.[0],
        bodyPart: placement ?? undefined,
      });
      setShareUrl(url);
      setShareState('shared');
    } catch (err: unknown) {
      setShareState('idle');
      setError(err instanceof Error ? err.message : 'Could not create a share link — try again.');
    }
  };

  if (designs.length === 0) return null;

  const toolButton =
    'press border hairline px-3 py-2 font-body text-[10px] uppercase tracking-[0.2em] text-white/70 hover:text-black hover:bg-pink disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-white/70';

  return (
    <div className="border-2 hairline bg-white/[0.02] p-5 space-y-4">
      <div>
        <h3 className="font-display uppercase tracking-wide text-[20px] text-white leading-none">
          See it on your skin<span className="text-pink">.</span>
        </h3>
        <p className="font-body text-[13px] leading-[1.55] text-white/70 mt-2">
          {placement ? (
            <>
              Snap your <span className="text-pink">{placement}</span> — the spot you picked during
              intake — then tap designs to lay them on. Drag to place, pinch or pull the knob to
              size and rotate.
            </>
          ) : (
            <>
              Snap the spot it&rsquo;s going, then tap designs to lay them on — drag to place, pinch
              or pull the knob to size and rotate.
            </>
          )}
        </p>
      </div>

      <label className="press inline-flex cursor-pointer items-center border hairline px-3 py-2 font-body text-[10px] uppercase tracking-[0.2em] text-white/70 hover:text-black hover:bg-pink">
        {photoUrl ? 'Change photo' : 'Upload a photo'}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Upload a photo of your body"
          onChange={(e) => handlePhotoChange(e.target.files?.[0])}
        />
      </label>

      {photoUrl && (
        <>
          <div ref={containerRef} className="touch-none">
            <canvas ref={canvasElRef} />
          </div>

          {/* The design tray — every tap ADDS one to the canvas. */}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Add a design to the photo">
            {designs.map(({ label, variation }) => (
              <button
                key={variation.id}
                type="button"
                disabled={!canvasReady}
                onClick={() => handleAddDesign(variation)}
                aria-label={`Add ${label} to the photo`}
                className="press border-2 hairline-white hover:border-pink disabled:opacity-40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- provider CDN image; next/image needs domain config */}
                <img src={variation.imageUrl} alt={label} className="block h-14 w-14 object-cover" />
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 font-body text-[10px] uppercase tracking-[0.2em] text-white/70">
              Opacity
              <input
                type="range"
                min={0.2}
                max={1}
                step={0.05}
                value={opacity}
                disabled={!hasSelection}
                onChange={(e) => handleOpacity(Number(e.target.value))}
                className="w-24 accent-pink disabled:opacity-40"
              />
            </label>
            <button type="button" onClick={handleFlip} disabled={!hasSelection} className={toolButton}>
              Flip
            </button>
            <button
              type="button"
              onClick={handleDuplicate}
              disabled={!hasSelection}
              className={toolButton}
            >
              Duplicate
            </button>
            <button type="button" onClick={handleClear} className={toolButton}>
              Clear all
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={handleDownload} className={toolButton}>
              Download PNG
            </button>
            <button
              type="button"
              onClick={handleReview}
              className="tape press px-4 py-2 font-display text-[16px] leading-none tracking-[0.02em] uppercase"
            >
              See it side by side
            </button>
          </div>

          {/* The output the spec asks for: the design as drawn, next to it on
              you. Save and share act on this exact frame. */}
          {review && (
            <div className="border hairline p-4 space-y-4" data-testid="placement-review">
              <div className="grid grid-cols-2 gap-4">
                <figure className="space-y-2">
                  <figcaption className="font-body text-[10px] uppercase tracking-[0.2em] text-white/50">
                    The design
                  </figcaption>
                  <div className="flex flex-wrap gap-2">
                    {designs
                      .filter(({ variation }) => review.designIds.includes(variation.id))
                      .map(({ label, variation }) => (
                        // eslint-disable-next-line @next/next/no-img-element -- provider CDN image; next/image needs domain config
                        <img
                          key={variation.id}
                          src={variation.imageUrl}
                          alt={label}
                          className="block w-full max-w-[160px] border hairline"
                        />
                      ))}
                  </div>
                </figure>
                <figure className="space-y-2">
                  <figcaption className="font-body text-[10px] uppercase tracking-[0.2em] text-white/50">
                    {placement ? `On your ${placement}` : 'On you'}
                  </figcaption>
                  {/* eslint-disable-next-line @next/next/no-img-element -- local canvas data URL */}
                  <img
                    src={review.url}
                    alt="Your design placed on your photo"
                    className="block w-full border hairline"
                  />
                </figure>
              </div>

              <p className="font-body text-[11px] leading-[1.5] text-white/45">
                A preview to help you picture it — not the stencil. Your artist draws the final
                piece from the brief.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saveState === 'saving'}
                  className="tape press px-4 py-2 font-display text-[16px] leading-none tracking-[0.02em] uppercase disabled:opacity-50"
                >
                  {saveState === 'saving'
                    ? 'Saving…'
                    : saveState === 'saved'
                      ? 'Saved ✓'
                      : 'Save to my booking'}
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={!savedPreviewUrl || shareState === 'sharing'}
                  title={savedPreviewUrl ? undefined : 'Save the preview first'}
                  className={toolButton}
                >
                  {shareState === 'sharing' ? 'Creating link…' : 'Share a link'}
                </button>
              </div>

              {saveState === 'saved' && (
                <p className="font-body text-[13px] leading-[1.55] text-pink">
                  Placement preview saved — it travels with your brief to the artist.
                </p>
              )}

              {shareState === 'shared' && shareUrl && (
                <p className="font-body text-[13px] leading-[1.55] text-white/80">
                  Share link:{' '}
                  <a href={shareUrl} className="text-pink underline break-all">
                    {shareUrl}
                  </a>
                </p>
              )}
            </div>
          )}
        </>
      )}

      {error && <p className="font-body text-[13px] leading-[1.55] text-white/80">{error}</p>}
    </div>
  );
}

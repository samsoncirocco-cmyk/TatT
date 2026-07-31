/**
 * The pointing half of "point and say" (ADR-0038 gear 1).
 *
 * One image, one gesture: drag a loop around the flaw, or just tap it. Pointer
 * events cover mouse, pen and thumb with one code path, and `touch-action:
 * none` keeps a lasso from scrolling the page out from under itself. The loop
 * is drawn as SVG rather than a second <canvas> so it stays crisp at any size
 * and needs no 2d context — the only canvas in this flow is the offscreen mask
 * built at submit time.
 *
 * No precision is required and none is implied: a tap stands for a generous
 * circle (see `regionMask.TAP_RADIUS`).
 */

import { useCallback, useRef, useState } from 'react';
import { isTapGesture, TAP_RADIUS, toSvgPoints } from '../services/regionMask';

const VIEW = 100; // SVG user units; the box is scaled to the element by CSS.

export default function RegionCanvas({
    imageUrl,
    points,
    onPointsChange,
    disabled = false,
    alt = 'Your design'
}) {
    const frameRef = useRef(null);
    const [drawing, setDrawing] = useState(false);

    const positionOf = useCallback((event) => {
        const frame = frameRef.current;
        if (!frame) return null;
        const rect = frame.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        return {
            x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
            y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
        };
    }, []);

    const handleDown = useCallback((event) => {
        if (disabled) return;
        const position = positionOf(event);
        if (!position) return;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setDrawing(true);
        onPointsChange([position]);
    }, [disabled, onPointsChange, positionOf]);

    const handleMove = useCallback((event) => {
        if (!drawing || disabled) return;
        const position = positionOf(event);
        if (!position) return;
        onPointsChange([...points, position]);
    }, [disabled, drawing, onPointsChange, points, positionOf]);

    const handleUp = useCallback(() => {
        if (drawing) setDrawing(false);
    }, [drawing]);

    const hasPoints = points.length > 0;
    const tap = hasPoints && isTapGesture(points);
    const last = hasPoints ? points[points.length - 1] : null;

    return (
        <div
            ref={frameRef}
            data-testid="region-canvas"
            className="relative w-full select-none bg-black border-2 hairline overflow-hidden"
            style={{ touchAction: 'none' }}
            onPointerDown={handleDown}
            onPointerMove={handleMove}
            onPointerUp={handleUp}
            onPointerCancel={handleUp}
            role="application"
            aria-label="Circle or tap the part of the design you want redrawn"
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={imageUrl}
                alt={alt}
                draggable={false}
                className="w-full h-auto block pointer-events-none"
            />

            <svg
                viewBox={`0 0 ${VIEW} ${VIEW}`}
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full pointer-events-none"
                aria-hidden="true"
            >
                {tap && last && (
                    <circle
                        data-testid="region-tap"
                        cx={last.x * VIEW}
                        cy={last.y * VIEW}
                        r={TAP_RADIUS * VIEW}
                        className="fill-pink/20 stroke-pink"
                        strokeWidth={1}
                    />
                )}
                {hasPoints && !tap && (
                    <polygon
                        data-testid="region-lasso"
                        points={toSvgPoints(points, VIEW, VIEW)}
                        className="fill-pink/20 stroke-pink"
                        strokeWidth={1}
                        strokeLinejoin="round"
                    />
                )}
            </svg>
        </div>
    );
}

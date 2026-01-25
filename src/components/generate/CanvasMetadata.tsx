"use client";

import type { BodyPart } from "../../constants/bodyPartAspectRatios";

interface CanvasMetadataProps {
    width: number;
    height: number;
    layerCount: number;
    bodyPart: BodyPart;
    seed?: string | number | null;
}

export default function CanvasMetadata({
    width,
    height,
    layerCount,
    bodyPart,
    seed,
}: CanvasMetadataProps) {
    const seedDisplay = seed ? String(seed).slice(0, 8) : "--";

    return (
        <div className="absolute bottom-3 right-3 rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-white/60 backdrop-blur">
            <div>Resolution: {width}×{height}px</div>
            <div>Placement: {bodyPart}</div>
            <div>Layers: {layerCount}</div>
            <div>Seed: {seedDisplay}</div>
        </div>
    );
}

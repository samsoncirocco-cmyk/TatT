"use client";

import { useMemo, useState } from "react";
import type { BodyPart } from "../../constants/bodyPartAspectRatios";
import { BODY_PART_CONFIGS, BODY_PARTS } from "../../constants/bodyPartAspectRatios";
import humanOutline from "../../assets/human-body-outline.svg";

interface PlacementGridProps {
    selectedBodyPart: BodyPart;
    onSelect: (bodyPart: BodyPart) => void;
    disabled?: boolean;
}

type Zone = {
    id: BodyPart;
    label: string;
    nodes: Array<{
        key: string;
        x: number;
        y: number;
        width: number;
        height: number;
        rx?: number;
    }>;
};

const ZONES: Zone[] = [
    {
        id: "shoulder",
        label: "Shoulder",
        nodes: [{ key: "shoulder", x: 60, y: 70, width: 80, height: 40, rx: 12 }],
    },
    {
        id: "chest",
        label: "Chest",
        nodes: [{ key: "chest", x: 60, y: 110, width: 80, height: 50, rx: 12 }],
    },
    {
        id: "back",
        label: "Back",
        nodes: [{ key: "back", x: 60, y: 165, width: 80, height: 55, rx: 12 }],
    },
    {
        id: "ribs",
        label: "Ribs",
        nodes: [{ key: "ribs", x: 28, y: 130, width: 30, height: 85, rx: 10 }],
    },
    {
        id: "forearm",
        label: "Forearm",
        nodes: [
            { key: "forearm-left", x: 30, y: 185, width: 30, height: 70, rx: 10 },
            { key: "forearm-right", x: 140, y: 185, width: 30, height: 70, rx: 10 },
        ],
    },
    {
        id: "full-sleeve",
        label: "Full Sleeve",
        nodes: [
            { key: "sleeve-left", x: 30, y: 115, width: 30, height: 140, rx: 12 },
            { key: "sleeve-right", x: 140, y: 115, width: 30, height: 140, rx: 12 },
        ],
    },
    {
        id: "thigh",
        label: "Thigh",
        nodes: [{ key: "thigh", x: 72, y: 230, width: 56, height: 70, rx: 12 }],
    },
    {
        id: "calf",
        label: "Calf",
        nodes: [{ key: "calf", x: 72, y: 310, width: 56, height: 60, rx: 12 }],
    },
];

export function PlacementGrid({
    selectedBodyPart,
    onSelect,
    disabled = false
}: PlacementGridProps) {
    const [hovered, setHovered] = useState<BodyPart | null>(null);

    const activeLabel = useMemo(() => {
        if (hovered) return BODY_PART_CONFIGS[hovered].label;
        if (selectedBodyPart) return BODY_PART_CONFIGS[selectedBodyPart].label;
        return "Select placement";
    }, [hovered, selectedBodyPart]);

    return (
        <div className="placement-grid">
            <div>
                <p className="text-[11px] font-mono uppercase tracking-[0.4em] text-studio-neon opacity-70">
                    Placement
                </p>
                <h3 className="font-display text-2xl font-bold text-white mt-2">
                    {activeLabel}
                </h3>
                <p className="font-sans text-sm text-white/60">
                    Tap a zone to map your canvas to anatomy.
                </p>
            </div>

            <div className="relative rounded-2xl border border-white/10 bg-black/40 p-4">
                <div className="grid grid-cols-2 gap-2 md:hidden">
                    {BODY_PARTS.map((part) => (
                        <button
                            key={part.id}
                            onClick={() => !disabled && onSelect(part.id)}
                            className={`rounded-xl border px-3 py-2 text-left text-xs font-mono uppercase tracking-widest transition-all ${
                                selectedBodyPart === part.id
                                    ? 'border-studio-neon bg-[rgba(0,255,65,0.12)] text-studio-neon'
                                    : 'border-white/10 bg-white/5 text-white/60 hover:border-white/30'
                            }`}
                        >
                            {part.label}
                        </button>
                    ))}
                </div>

                <svg
                    viewBox="0 0 200 400"
                    className={`hidden md:block w-full h-[420px] ${disabled ? 'opacity-50' : ''}`}
                    aria-label="Body placement grid"
                    role="img"
                >
                    <image href={humanOutline} x="0" y="0" width="200" height="400" />

                    {ZONES.map((zone) =>
                        zone.nodes.map((node) => (
                            <rect
                                key={node.key}
                                x={node.x}
                                y={node.y}
                                width={node.width}
                                height={node.height}
                                rx={node.rx ?? 8}
                                className={`placement-zone ${selectedBodyPart === zone.id ? 'is-active' : ''}`}
                                onMouseEnter={() => setHovered(zone.id)}
                                onMouseLeave={() => setHovered(null)}
                                onFocus={() => setHovered(zone.id)}
                                onBlur={() => setHovered(null)}
                                onClick={() => !disabled && onSelect(zone.id)}
                                onKeyDown={(event) => {
                                    if (disabled) return;
                                    if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        onSelect(zone.id);
                                    }
                                }}
                                tabIndex={disabled ? -1 : 0}
                                role="button"
                                aria-label={zone.label}
                            />
                        ))
                    )}
                </svg>

                <div className="mt-4 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.3em] text-white/40">
                    <span>Neural body map</span>
                    <span>{selectedBodyPart ? BODY_PART_CONFIGS[selectedBodyPart].icon : "--"}</span>
                </div>
            </div>
        </div>
    );
}

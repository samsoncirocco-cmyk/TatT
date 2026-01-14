"use client";

import { motion } from "framer-motion";
import { BodyPart, BODY_PARTS, BODY_PART_CONFIGS } from "../../constants/bodyPartAspectRatios";
import { staggerContainer, staggerItem } from "../../lib/motion-variants";
import { Check } from "lucide-react";

interface BodyPartSelectorProps {
    selectedBodyPart: BodyPart;
    onSelect: (bodyPart: BodyPart) => void;
    disabled?: boolean;
}

/**
 * BodyPartSelector - Visual picker for body part selection
 * Premium glassmorphism cards with staggered reveal
 */
export function BodyPartSelector({
    selectedBodyPart,
    onSelect,
    disabled = false
}: BodyPartSelectorProps) {
    return (
        <div className="w-full">
            {/* Header */}
            <div className="mb-6">
                <p className="text-[11px] font-mono uppercase tracking-[0.4em] text-ducks-green/70">
                    Placement
                </p>
                <h3 className="font-display text-2xl font-bold text-white mt-2">
                    Select placement
                </h3>
                <p className="font-sans text-sm text-white/60">
                    Match the canvas to anatomy before you generate.
                </p>
            </div>

            {/* Body part grid */}
            <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 gap-2"
            >
                {BODY_PARTS.map((part) => {
                    const isSelected = selectedBodyPart === part.id;

                    return (
                        <motion.button
                            key={part.id}
                            variants={staggerItem}
                            onClick={() => !disabled && onSelect(part.id)}
                            disabled={disabled}
                            className={`
                                group relative flex items-center gap-3 p-3 rounded-2xl transition-all duration-300
                                bg-gradient-to-br from-white/8 to-white/3 backdrop-blur-sm
                                border hover:bg-white/10
                                ${isSelected
                                    ? 'border-ducks-yellow/60 shadow-[0_0_20px_rgba(254,225,35,0.15)]'
                                    : 'border-white/10 hover:border-white/30'
                                }
                                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                            `}
                        >
                            {/* Selection indicator */}
                            {isSelected && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute top-2 right-2 w-5 h-5 bg-ducks-yellow rounded-full flex items-center justify-center"
                                >
                                    <Check className="w-3 h-3 text-black" />
                                </motion.div>
                            )}

                            {/* Icon */}
                            <div className="inline-flex min-w-[44px] items-center justify-center rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.3em] text-white/70 transition-transform group-hover:scale-105">
                                {part.icon}
                            </div>

                            {/* Label */}
                            <div className="flex-1 text-left">
                                <div className="font-display font-semibold text-white text-sm">
                                    {part.label}
                                </div>
                                <div className="text-xs text-white/50">
                                    {part.description}
                                </div>
                            </div>
                            <div className="text-right text-[10px] font-mono uppercase tracking-[0.3em] text-white/40">
                                {part.width}:{part.height}
                            </div>

                            {/* Hover glow */}
                            <div className={`
                                absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
                                ${isSelected ? 'bg-ducks-yellow/5' : 'bg-white/5'}
                            `} />
                        </motion.button>
                    );
                })}
            </motion.div>

            {/* Selected body part info */}
            {selectedBodyPart && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl"
            >
                <div className="flex items-start gap-3">
                    <div className="inline-flex items-center justify-center rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.3em] text-white/70">
                        {BODY_PART_CONFIGS[selectedBodyPart].icon}
                        </div>
                        <div className="flex-1">
                            <div className="font-display font-semibold text-white mb-1">
                                {BODY_PART_CONFIGS[selectedBodyPart].label}
                            </div>
                            <div className="font-sans text-sm text-white/60">
                                {BODY_PART_CONFIGS[selectedBodyPart].description}
                            </div>
                            <div className="mt-2 flex items-center gap-4 text-xs text-white/40 font-mono">
                                <span>Aspect: {BODY_PART_CONFIGS[selectedBodyPart].aspectRatio.toFixed(2)}</span>
                                <span>Category: {BODY_PART_CONFIGS[selectedBodyPart].category}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}

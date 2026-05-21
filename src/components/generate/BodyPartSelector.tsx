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
                <p className="text-[10px] font-body uppercase tracking-[0.3em] text-pink">
                    <span className="text-pink">●</span>&nbsp;&nbsp;Placement
                </p>
                <h3 className="font-display text-[22px] tracking-wide uppercase text-white mt-2">
                    Select placement
                </h3>
                <p className="font-body text-[12px] text-white/60 mt-1 leading-[1.55]">
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
                                press group relative flex items-center gap-3 p-3 transition-colors duration-150
                                bg-black border-2
                                ${isSelected
                                    ? 'border-pink'
                                    : 'hairline-white hover:border-pink'
                                }
                                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                            `}
                        >
                            {/* Selection indicator */}
                            {isSelected && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute top-2 right-2 w-4 h-4 bg-pink rounded-full flex items-center justify-center"
                                >
                                    <Check className="w-2.5 h-2.5 text-black" />
                                </motion.div>
                            )}

                            {/* Icon */}
                            <div className="inline-flex min-w-[44px] items-center justify-center border hairline bg-black px-3 py-1 text-[10px] font-body uppercase tracking-[0.25em] text-white/70">
                                {part.icon}
                            </div>

                            {/* Label */}
                            <div className="flex-1 text-left">
                                <div className="font-display text-[14px] uppercase tracking-wide text-white">
                                    {part.label}
                                </div>
                                <div className="text-[10px] font-body text-white/50 tracking-[0.15em]">
                                    {part.description}
                                </div>
                            </div>
                            <div className="text-right text-[10px] font-body uppercase tracking-[0.22em] text-white/40 tabular-nums">
                                {part.width}:{part.height}
                            </div>
                        </motion.button>
                    );
                })}
            </motion.div>

            {/* Selected body part info */}
            {selectedBodyPart && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-black border-2 border-pink"
            >
                <div className="flex items-start gap-3">
                    <div className="inline-flex items-center justify-center border hairline bg-black px-3 py-1 text-[10px] font-body uppercase tracking-[0.25em] text-white/70">
                        {BODY_PART_CONFIGS[selectedBodyPart].icon}
                        </div>
                        <div className="flex-1">
                            <div className="font-display text-[14px] uppercase tracking-wide text-white mb-1">
                                {BODY_PART_CONFIGS[selectedBodyPart].label}
                            </div>
                            <div className="font-body text-[11px] text-white/60 leading-[1.55]">
                                {BODY_PART_CONFIGS[selectedBodyPart].description}
                            </div>
                            <div className="mt-2 flex items-center gap-4 text-[10px] text-white/40 font-body uppercase tracking-[0.2em] tabular-nums">
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

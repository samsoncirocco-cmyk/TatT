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
                <h3 className="font-display text-2xl font-bold text-white mb-2">
                    Select Placement
                </h3>
                <p className="font-sans text-sm text-white/60">
                    Choose where you'd like your tattoo placed
                </p>
            </div>

            {/* Body part grid */}
            <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
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
                group relative p-4 rounded-xl transition-all duration-300
                bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm
                border hover:scale-105 hover:shadow-lg
                ${isSelected
                                    ? 'border-primary shadow-[0_0_20px_rgba(0,209,255,0.3)]'
                                    : 'border-white/10 hover:border-primary/50'
                                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
                        >
                            {/* Selection indicator */}
                            {isSelected && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center"
                                >
                                    <Check className="w-3 h-3 text-background" />
                                </motion.div>
                            )}

                            {/* Icon */}
                            <div className="text-4xl mb-2 transition-transform group-hover:scale-110">
                                {part.icon}
                            </div>

                            {/* Label */}
                            <div className="text-left">
                                <div className="font-display font-semibold text-white text-sm mb-1">
                                    {part.label}
                                </div>
                                <div className="font-mono text-xs text-white/40">
                                    {part.width}:{part.height}
                                </div>
                            </div>

                            {/* Hover glow */}
                            <div className={`
                absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
                ${isSelected ? 'bg-primary/5' : 'bg-white/5'}
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
                    className="mt-6 p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl"
                >
                    <div className="flex items-start gap-3">
                        <div className="text-2xl">{BODY_PART_CONFIGS[selectedBodyPart].icon}</div>
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

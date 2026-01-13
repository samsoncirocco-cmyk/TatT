"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { BodyPart, BODY_PART_CONFIGS } from "../../constants/bodyPartAspectRatios";

interface BodyPartWarningModalProps {
    isOpen: boolean;
    currentBodyPart: BodyPart;
    newBodyPart: BodyPart;
    onCancel: () => void;
    onConfirm: () => void;
}

/**
 * BodyPartWarningModal - Warns user before changing body part with existing design
 * Prevents accidental loss of work
 */
export function BodyPartWarningModal({
    isOpen,
    currentBodyPart,
    newBodyPart,
    onCancel,
    onConfirm,
}: BodyPartWarningModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            className="relative max-w-md w-full bg-gradient-to-br from-card/95 to-card/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-glass-lg p-6"
                        >
                            {/* Close button */}
                            <button
                                onClick={onCancel}
                                className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Warning icon */}
                            <div className="flex items-center justify-center w-16 h-16 bg-accent/20 rounded-full mb-4">
                                <AlertTriangle className="w-8 h-8 text-accent" />
                            </div>

                            {/* Content */}
                            <div className="space-y-4">
                                <h3 className="font-display text-2xl font-bold text-white">
                                    Change Body Part?
                                </h3>

                                <p className="font-sans text-white/70 leading-relaxed">
                                    You're about to change from{" "}
                                    <span className="font-semibold text-primary">
                                        {BODY_PART_CONFIGS[currentBodyPart].label}
                                    </span>{" "}
                                    to{" "}
                                    <span className="font-semibold text-primary">
                                        {BODY_PART_CONFIGS[newBodyPart].label}
                                    </span>
                                    . This will clear your current design.
                                </p>

                                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                                    <div className="flex items-center gap-2 text-sm text-white/60">
                                        <AlertTriangle className="w-4 h-4 text-accent" />
                                        <span className="font-sans">Your current design will be lost</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={onCancel}
                                    className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl font-display font-semibold text-white transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={onConfirm}
                                    className="flex-1 px-4 py-3 bg-accent hover:bg-accent/90 rounded-xl font-display font-semibold text-white transition-all shadow-[0_0_20px_rgba(160,32,240,0.4)] hover:shadow-[0_0_30px_rgba(160,32,240,0.6)]"
                                >
                                    Change Anyway
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}

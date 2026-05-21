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
                        className="fixed inset-0 bg-black/80 halftone z-50"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ duration: 0.15, ease: 'linear' }}
                            className="relative max-w-md w-full bg-black border-2 border-pink p-6"
                        >
                            {/* Close button */}
                            <button
                                onClick={onCancel}
                                className="press absolute top-4 right-4 text-white/40 hover:text-pink transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            {/* Warning icon */}
                            <div className="flex items-center justify-center w-12 h-12 bg-pink mb-4">
                                <AlertTriangle className="w-6 h-6 text-black" />
                            </div>

                            {/* Content */}
                            <div className="space-y-4">
                                <h3 className="font-display text-[28px] uppercase tracking-wide leading-none text-white">
                                    Change Body Part<span className="text-pink">?</span>
                                </h3>

                                <p className="font-body text-[13px] text-white/70 leading-[1.55]">
                                    You&apos;re about to change from{" "}
                                    <span className="text-pink font-display tracking-wide uppercase">
                                        {BODY_PART_CONFIGS[currentBodyPart].label}
                                    </span>{" "}
                                    to{" "}
                                    <span className="text-pink font-display tracking-wide uppercase">
                                        {BODY_PART_CONFIGS[newBodyPart].label}
                                    </span>
                                    . This will clear your current design.
                                </p>

                                <div className="bg-black border-2 hairline p-3">
                                    <div className="flex items-center gap-2 text-[11px] text-white/70 font-body uppercase tracking-[0.22em]">
                                        <AlertTriangle className="w-3 h-3 text-pink" />
                                        <span>Your current design will be lost</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={onCancel}
                                    className="press flex-1 px-4 py-3 bg-black border-2 hairline-white hover:border-pink font-display text-[14px] uppercase tracking-[0.22em] text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={onConfirm}
                                    className="tape press flex-1 px-4 py-3 font-display text-[14px] uppercase tracking-[0.22em] text-black"
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

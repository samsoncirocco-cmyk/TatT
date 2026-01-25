"use client";

import { useMemo, useRef, useEffect } from "react";
import { Sparkles } from "lucide-react";

interface NeuralPromptEditorProps {
    value: string;
    onChange: (value: string) => void;
    selectedChips?: string[];
    maxLength?: number;
    onEnhance?: () => void;
    isEnhancing?: boolean;
}

export default function NeuralPromptEditor({
    value,
    onChange,
    selectedChips = [],
    maxLength = 500,
    onEnhance,
    isEnhancing = false,
}: NeuralPromptEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const gutterRef = useRef<HTMLDivElement | null>(null);

    const lines = useMemo(() => value.split("\n"), [value]);
    const characterCount = value.length;
    const isNearLimit = characterCount > maxLength * 0.8;
    const isOverLimit = characterCount > maxLength;

    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = "auto";
        textarea.style.height = `${Math.max(140, textarea.scrollHeight)}px`;
    }, [value]);

    const handleScroll = () => {
        if (gutterRef.current && textareaRef.current) {
            gutterRef.current.scrollTop = textareaRef.current.scrollTop;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono uppercase tracking-[0.4em] text-white/50">
                    Neural prompt input
                </label>
                <button
                    type="button"
                    onClick={onEnhance}
                    disabled={!onEnhance || isEnhancing || !value.trim()}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.3em] text-white/60 hover:text-white hover:border-[rgba(255,62,0,0.6)] disabled:opacity-40"
                    aria-label="Enhance prompt with AI Council"
                >
                    <Sparkles className={`h-3 w-3 ${isEnhancing ? "animate-pulse-glow" : ""}`} />
                    Enhance
                </button>
            </div>

            <div className="relative flex overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                <div
                    ref={gutterRef}
                    className="flex w-10 flex-col items-end gap-1 overflow-hidden bg-black/60 px-2 py-4 text-[10px] font-mono text-white/30"
                >
                    {lines.map((_, i) => (
                        <span key={`line-${i}`}>{i + 1}</span>
                    ))}
                </div>
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onScroll={handleScroll}
                    placeholder='Try: "A samurai cat on a surfboard" or "Gohan fighting Cell in the rain"'
                    maxLength={maxLength}
                    className="min-h-[140px] w-full resize-none bg-transparent px-4 py-4 text-sm font-mono leading-relaxed text-white placeholder-white/20 focus:outline-none"
                />
                <div
                    className={`absolute bottom-2 right-3 text-[10px] font-mono ${isOverLimit ? 'text-red-400' : isNearLimit ? 'text-yellow-400' : 'text-white/40'}`}
                >
                    {characterCount}/{maxLength}
                </div>
            </div>

            {selectedChips.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
                        Active tags
                    </span>
                    {selectedChips.map((chip) => (
                        <span
                            key={chip}
                            className="text-[11px] font-mono bg-black/40 text-studio-neon border border-[rgba(0,255,65,0.3)] px-2 py-1 rounded-md"
                        >
                            #{chip}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

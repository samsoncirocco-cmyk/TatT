/**
 * Blend Mode Selector Component
 *
 * Allows users to select blend modes for layers
 * to simulate ink layering effects
 */

import { useState } from 'react';
import { Layers } from 'lucide-react';

const BLEND_MODES = [
    {
        value: 'normal',
        label: 'Normal',
        description: 'Default layering, no blending'
    },
    {
        value: 'multiply',
        label: 'Multiply',
        description: 'Darkens underlying layers (like overlapping ink)'
    },
    {
        value: 'screen',
        label: 'Screen',
        description: 'Lightens underlying layers'
    },
    {
        value: 'overlay',
        label: 'Overlay',
        description: 'Combines multiply and screen for contrast'
    }
];

export default function BlendModeSelector({ value = 'normal', onChange, disabled }) {
    const [isOpen, setIsOpen] = useState(false);

    const selectedMode = BLEND_MODES.find(mode => mode.value === value) || BLEND_MODES[0];

    const handleSelect = (mode) => {
        onChange(mode.value);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    disabled
                        ? 'bg-white/5 text-white/30 cursor-not-allowed'
                        : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                aria-label="Select blend mode"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    <span>{selectedMode.label}</span>
                </div>
                <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown */}
            {isOpen && !disabled && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                        aria-hidden="true"
                    />

                    {/* Menu */}
                    <div className="absolute top-full left-0 right-0 mt-2 z-20 bg-black border border-white/10 rounded-xl shadow-xl overflow-hidden">
                        {BLEND_MODES.map((mode) => (
                            <button
                                key={mode.value}
                                onClick={() => handleSelect(mode)}
                                className={`w-full px-4 py-3 text-left transition-colors ${
                                    mode.value === value
                                        ? 'bg-ducks-green/20 border-l-2 border-ducks-green'
                                        : 'hover:bg-white/10'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-white text-sm">
                                        {mode.label}
                                    </span>
                                    {mode.value === value && (
                                        <svg
                                            className="w-4 h-4 text-ducks-green"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    )}
                                </div>
                                <p className="text-xs text-white/60">{mode.description}</p>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

/**
 * Blend Mode Preview Component
 * Shows a visual preview of how different blend modes look
 */
export function BlendModePreview({ mode = 'normal' }) {
    return (
        <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
            {/* Base layer */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 opacity-60" />

            {/* Blended layer */}
            <div
                className="absolute inset-4 bg-gradient-to-br from-yellow-400 to-red-500"
                style={{
                    mixBlendMode: mode,
                    opacity: 0.8
                }}
            />

            {/* Label */}
            <div className="absolute bottom-2 left-2 right-2 text-center">
                <span className="text-xs font-bold text-white bg-black/50 px-2 py-1 rounded">
                    {mode}
                </span>
            </div>
        </div>
    );
}

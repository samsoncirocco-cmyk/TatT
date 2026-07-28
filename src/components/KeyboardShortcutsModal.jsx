/**
 * Keyboard Shortcuts Help Modal
 *
 * Displays all available keyboard shortcuts for the Studio
 */

import { useEffect, useState } from 'react';
import { Keyboard } from 'lucide-react';

const SHORTCUTS = [
    {
        category: 'Canvas Navigation',
        shortcuts: [
            { keys: ['Arrow Keys'], description: 'Move selected layer (1px)' },
            { keys: ['Shift', 'Arrow Keys'], description: 'Move selected layer (10px)' },
            { keys: ['Delete', 'Backspace'], description: 'Delete selected layer' },
        ]
    },
    {
        category: 'Layer Management',
        shortcuts: [
            { keys: ['Tab'], description: 'Cycle through layers' },
            { keys: ['Shift', 'Tab'], description: 'Cycle backwards through layers' },
            { keys: ['Ctrl/Cmd', 'D'], description: 'Duplicate selected layer' },
            { keys: ['Ctrl/Cmd', 'H'], description: 'Toggle layer visibility' },
        ]
    },
    {
        category: 'Transform Operations',
        shortcuts: [
            { keys: ['+', '='], description: 'Scale up layer' },
            { keys: ['-', '_'], description: 'Scale down layer' },
            { keys: ['R'], description: 'Reset rotation' },
            { keys: ['F'], description: 'Flip horizontal' },
            { keys: ['Shift', 'F'], description: 'Flip vertical' },
        ]
    },
    {
        category: 'View Controls',
        shortcuts: [
            { keys: ['S'], description: 'Toggle stencil view' },
            { keys: ['Ctrl/Cmd', '0'], description: 'Reset zoom' },
            { keys: ['Ctrl/Cmd', '+'], description: 'Zoom in' },
            { keys: ['Ctrl/Cmd', '-'], description: 'Zoom out' },
        ]
    },
    {
        category: 'Generation',
        shortcuts: [
            { keys: ['Ctrl/Cmd', 'Enter'], description: 'Generate design' },
            { keys: ['Ctrl/Cmd', 'E'], description: 'Enhance prompt' },
            { keys: ['Esc'], description: 'Cancel generation' },
        ]
    },
    {
        category: 'Version Control',
        shortcuts: [
            { keys: ['Ctrl/Cmd', 'Z'], description: 'Load previous version' },
            { keys: ['Ctrl/Cmd', 'Shift', 'Z'], description: 'Load next version' },
            { keys: ['Ctrl/Cmd', 'B'], description: 'Branch from current version' },
        ]
    },
    {
        category: 'General',
        shortcuts: [
            { keys: ['?', '/'], description: 'Show keyboard shortcuts' },
            { keys: ['Ctrl/Cmd', 'S'], description: 'Save design' },
            { keys: ['Ctrl/Cmd', 'Shift', 'E'], description: 'Export design' },
        ]
    }
];

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
    const [isMac, setIsMac] = useState(false);

    useEffect(() => {
        setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
    }, []);

    useEffect(() => {
        // Close on Escape
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const formatKey = (key) => {
        if (key === 'Ctrl/Cmd') {
            return isMac ? 'Cmd' : 'Ctrl';
        }
        return key;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 halftone">
            <div className="bg-black border-2 border-pink max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b-2 hairline">
                    <div className="flex items-center gap-3">
                        <Keyboard className="w-5 h-5 text-pink" />
                        <div>
                            <h2 className="text-[20px] font-display tracking-wide uppercase text-white leading-none">
                                Keyboard Shortcuts
                            </h2>
                            <p className="mt-1 text-[10px] font-body text-pink uppercase tracking-[0.25em]">
                                <span className="text-pink">●</span>&nbsp;&nbsp;Master The Studio
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-[10px] font-body uppercase tracking-[0.22em] text-white/60 hover:text-pink"
                        aria-label="Close"
                    >
                        Close ✕
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {SHORTCUTS.map((category, idx) => (
                            <div key={idx} className="space-y-4">
                                {/* Category Title */}
                                <h3 className="text-[12px] font-display text-pink uppercase tracking-[0.22em]">
                                    {category.category}
                                </h3>

                                {/* Shortcuts */}
                                <div className="space-y-3">
                                    {category.shortcuts.map((shortcut, shortcutIdx) => (
                                        <div
                                            key={shortcutIdx}
                                            className="flex items-center justify-between gap-4"
                                        >
                                            {/* Keys */}
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {shortcut.keys.map((key, keyIdx) => (
                                                    <div key={keyIdx} className="flex items-center gap-1">
                                                        <kbd className="px-2 py-1 text-[11px] font-body bg-white/10 border hairline-white text-white min-w-[2rem] text-center">
                                                            {formatKey(key)}
                                                        </kbd>
                                                        {keyIdx < shortcut.keys.length - 1 && (
                                                            <span className="text-white/40 text-xs">+</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Description */}
                                            <div className="text-sm text-white/70 text-right">
                                                {shortcut.description}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t-2 hairline">
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] text-white/50 font-body">
                            Press <kbd className="px-2 py-1 text-[11px] font-body bg-white/10 border hairline-white">?</kbd> or <kbd className="px-2 py-1 text-[11px] font-body bg-white/10 border hairline-white">/</kbd> anytime to open this menu
                        </p>
                        <button
                            onClick={onClose}
                            className="press px-4 py-2 bg-pink text-black font-display uppercase text-[12px] tracking-[0.2em] hover:bg-pink-deep"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Hook to manage keyboard shortcuts modal
 */
export function useKeyboardShortcuts() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Open shortcuts modal with ? or /
            if ((e.key === '?' || e.key === '/') && !e.ctrlKey && !e.metaKey) {
                // Don't trigger if typing in an input
                if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
                    return;
                }
                e.preventDefault();
                setIsOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return {
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false)
    };
}

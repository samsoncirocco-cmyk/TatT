/**
 * Keyboard Shortcuts Help Modal
 *
 * Displays all available keyboard shortcuts for The Forge
 */

import { useEffect, useState } from 'react';
import { X, Keyboard } from 'lucide-react';

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="glass-panel rounded-3xl border border-white/10 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-ducks-green/20 flex items-center justify-center">
                            <Keyboard className="w-5 h-5 text-ducks-green" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-display font-black text-white">
                                Keyboard Shortcuts
                            </h2>
                            <p className="text-xs font-mono text-ducks-green uppercase tracking-wider">
                                Master The Forge
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {SHORTCUTS.map((category, idx) => (
                            <div key={idx} className="space-y-4">
                                {/* Category Title */}
                                <h3 className="text-sm font-bold text-ducks-green uppercase tracking-wider">
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
                                                        <kbd className="px-2 py-1 text-xs font-mono font-bold bg-white/10 border border-white/20 rounded text-white min-w-[2rem] text-center">
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
                <div className="p-6 border-t border-white/10 bg-white/5">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-white/50">
                            Press <kbd className="px-2 py-1 text-xs font-mono bg-white/10 border border-white/20 rounded">?</kbd> or <kbd className="px-2 py-1 text-xs font-mono bg-white/10 border border-white/20 rounded">/</kbd> anytime to open this menu
                        </p>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-ducks-yellow text-black font-black text-sm rounded-xl hover:bg-white transition-colors"
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

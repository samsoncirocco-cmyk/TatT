/**
 * Layer Context Menu
 *
 * Right-click context menu for layer-specific actions
 * Matches The Forge's dark industrial aesthetic
 */

import { useEffect, useRef } from 'react';
import { RefreshCw, Copy, Trash2, Eye, EyeOff, Wand2, Eraser } from 'lucide-react';

export default function LayerContextMenu({
    x,
    y,
    layer,
    onClose,
    onRegenerate,
    onDuplicate,
    onDelete,
    onToggleVisibility,
    onInpaint,
    onCleanup
}) {
    const menuRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    if (!layer) return null;

    const menuItems = [
        {
            icon: RefreshCw,
            label: 'Regenerate Element',
            onClick: () => {
                onRegenerate(layer);
                onClose();
            },
            shortcut: 'R',
            primary: true
        },
        {
            icon: Wand2,
            label: 'Inpaint Edit',
            onClick: () => {
                onInpaint(layer);
                onClose();
            },
            shortcut: 'I'
        },
        {
            icon: Eraser,
            label: 'Clean Up',
            onClick: () => {
                onCleanup(layer);
                onClose();
            },
            shortcut: 'C',
            highlight: true
        },
        {
            icon: Copy,
            label: 'Duplicate Layer',
            onClick: () => {
                onDuplicate(layer);
                onClose();
            },
            shortcut: 'D'
        },
        {
            icon: layer.visible ? EyeOff : Eye,
            label: layer.visible ? 'Hide Layer' : 'Show Layer',
            onClick: () => {
                onToggleVisibility(layer);
                onClose();
            },
            shortcut: 'H'
        },
        {
            icon: Trash2,
            label: 'Delete Layer',
            onClick: () => {
                onDelete(layer);
                onClose();
            },
            shortcut: 'Del',
            danger: true
        }
    ];

    return (
        <div
            ref={menuRef}
            className="fixed z-[100] animate-fade-in"
            style={{
                left: `${x}px`,
                top: `${y}px`
            }}
            role="menu"
            aria-label="Layer actions menu"
        >
            {/* Context Menu Panel */}
            <div className="bg-black border-2 border-pink min-w-[220px] overflow-hidden">
                {/* Layer Info Header */}
                <div className="px-4 py-3 border-b-2 hairline">
                    <p className="text-[10px] font-body uppercase tracking-[0.28em] text-pink">
                        <span className="text-pink">●</span>&nbsp;&nbsp;Layer Actions
                    </p>
                    <p className="text-[12px] text-white/80 mt-1 truncate font-display uppercase tracking-wide">
                        {layer.name}
                    </p>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                    {menuItems.map((item, index) => (
                        <button
                            key={index}
                            onClick={item.onClick}
                            className={`
                                press w-full px-4 py-2.5 flex items-center justify-between gap-3
                                transition-colors duration-150
                                text-white/80 hover:bg-pink hover:text-black
                                focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink focus-visible:outline-offset-[-2px]
                            `}
                            role="menuitem"
                        >
                            <div className="flex items-center gap-3">
                                <item.icon size={14} />
                                <span className="text-[12px] font-display uppercase tracking-[0.18em]">
                                    {item.label}
                                </span>
                            </div>
                            <kbd className="text-[10px] font-body px-1.5 py-0.5 border hairline-white text-white/50 tracking-[0.1em] uppercase">
                                {item.shortcut}
                            </kbd>
                        </button>
                    ))}
                </div>

                {/* Footer Hint */}
                <div className="px-4 py-2 border-t-2 hairline">
                    <p className="text-[10px] font-body uppercase tracking-[0.22em] text-white/40">
                        <span className="text-pink">●</span>&nbsp;&nbsp;Right-click for quick actions
                    </p>
                </div>
            </div>
        </div>
    );
}

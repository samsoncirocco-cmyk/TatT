/**
 * Layer Context Menu
 *
 * Right-click context menu for layer-specific actions
 * Matches The Forge's dark industrial aesthetic
 */

import { useEffect, useRef } from 'react';
import { RefreshCw, Copy, Trash2, Eye, EyeOff, Wand2 } from 'lucide-react';

export default function LayerContextMenu({
    x,
    y,
    layer,
    onClose,
    onRegenerate,
    onDuplicate,
    onDelete,
    onToggleVisibility,
    onInpaint
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
            <div className="glass-panel border border-white/10 rounded-xl shadow-2xl min-w-[220px] overflow-hidden backdrop-blur-xl">
                {/* Layer Info Header */}
                <div className="px-4 py-3 border-b border-white/10 bg-black/30">
                    <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-ducks-green">
                        Layer Actions
                    </p>
                    <p className="text-xs text-white/70 mt-1 truncate font-medium">
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
                                w-full px-4 py-2.5 flex items-center justify-between gap-3
                                transition-all duration-150
                                ${item.primary
                                    ? 'hover:bg-ducks-green/20 hover:text-ducks-yellow'
                                    : item.danger
                                        ? 'hover:bg-red-500/20 hover:text-red-300'
                                        : 'hover:bg-white/10 hover:text-white'
                                }
                                ${item.primary ? 'text-ducks-green' : item.danger ? 'text-red-400/80' : 'text-white/70'}
                                focus-visible:outline focus-visible:outline-2 focus-visible:outline-ducks-yellow focus-visible:outline-offset-[-2px]
                            `}
                            role="menuitem"
                        >
                            <div className="flex items-center gap-3">
                                <item.icon
                                    size={16}
                                    className={item.primary ? 'text-ducks-green' : item.danger ? 'text-red-400' : 'text-white/60'}
                                />
                                <span className="text-sm font-medium tracking-wide">
                                    {item.label}
                                </span>
                            </div>
                            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-white/40">
                                {item.shortcut}
                            </kbd>
                        </button>
                    ))}
                </div>

                {/* Footer Hint */}
                <div className="px-4 py-2 border-t border-white/10 bg-black/40">
                    <p className="text-[9px] font-mono uppercase tracking-widest text-white/30">
                        Right-click for quick actions
                    </p>
                </div>
            </div>
        </div>
    );
}

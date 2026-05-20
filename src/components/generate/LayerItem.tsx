/**
 * LayerItem Component
 * 
 * Individual layer item with thumbnail, name, visibility toggle, and type indicator
 */

import { useState } from 'react';
import { Eye, EyeOff, GripVertical, Trash2, Image as ImageIcon } from 'lucide-react';
import { LayerWithImages } from '@/features/generate/services/canvasService';
import { getImageUrl } from '../../services/forgeImageRegistry';

interface LayerItemProps {
    layer: LayerWithImages;
    isSelected: boolean;
    onSelect: (layerId: string) => void;
    onToggleVisibility: (layerId: string) => void;
    onRename: (layerId: string, newName: string) => void;
    onDelete: (layerId: string) => void;
    onContextMenu?: (layer: LayerWithImages, x: number, y: number) => void;
    isDragging?: boolean;
}

export default function LayerItem({
    layer,
    isSelected,
    onSelect,
    onToggleVisibility,
    onRename,
    onDelete,
    onContextMenu,
    isDragging = false
}: LayerItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(layer.name);
    const thumbnailUrl = layer.thumbnail || getImageUrl(layer.thumbnailRef);

    const handleNameSubmit = () => {
        if (editName.trim() && editName !== layer.name) {
            onRename(layer.id, editName.trim());
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleNameSubmit();
        } else if (e.key === 'Escape') {
            setEditName(layer.name);
            setIsEditing(false);
        }
    };

    const typeColors = {
        subject: 'text-pink',
        background: 'text-white/70',
        effect: 'text-white/50'
    };

    return (
        <div
            onClick={() => onSelect(layer.id)}
            onContextMenu={(e) => {
                e.preventDefault();
                if (onContextMenu) {
                    onContextMenu(layer, e.clientX, e.clientY);
                }
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(layer.id);
                }
            }}
            role="button"
            tabIndex={0}
            className={`
        group relative flex items-center gap-3 p-3 transition-colors cursor-pointer
        ${isSelected
                    ? 'bg-black border-2 border-pink'
                    : 'bg-black border hairline-white hover:border-pink'
                }
        ${isDragging ? 'opacity-50' : ''}
        ${!layer.visible ? 'opacity-60' : ''}
        focus-visible:outline focus-visible:outline-[2px] focus-visible:outline-pink
      `}
        >
            {/* Drag Handle */}
            <div className="cursor-grab active:cursor-grabbing text-white/40 hover:text-pink transition-colors">
                <GripVertical size={14} />
            </div>

            {/* Thumbnail */}
            <div className="w-12 h-12 overflow-hidden bg-black border hairline-white flex-shrink-0">
                {thumbnailUrl ? (
                    <img
                        src={thumbnailUrl}
                        alt={layer.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20">
                        <ImageIcon size={18} />
                    </div>
                )}
            </div>

            {/* Layer Info */}
            <div className="flex-1 min-w-0">
                {isEditing ? (
                    <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={handleNameSubmit}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-black border-2 border-pink px-2 py-1 text-[13px] text-white font-display tracking-tight focus:outline-none"
                        autoFocus
                    />
                ) : (
                    <div
                        onDoubleClick={() => setIsEditing(true)}
                        className="text-[13px] font-display tracking-wide uppercase text-white truncate"
                    >
                        {layer.name}
                    </div>
                )}
                <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-body uppercase tracking-[0.22em] ${typeColors[layer.type]}`}>
                        {layer.type}
                    </span>
                    <span className="text-[10px] text-white/30 font-body tabular-nums tracking-[0.15em]">
                        z:{layer.zIndex}
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
                {/* Visibility Toggle */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleVisibility(layer.id);
                    }}
                    className="press p-1.5 hover:bg-pink hover:text-black transition-colors"
                    title={layer.visible ? 'Hide layer' : 'Show layer'}
                    aria-label={layer.visible ? 'Hide layer' : 'Show layer'}
                >
                    {layer.visible ? (
                        <Eye size={14} className="text-white/60" />
                    ) : (
                        <EyeOff size={14} className="text-white/30" />
                    )}
                </button>

                {/* Delete */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(layer.id);
                    }}
                    className="press p-1.5 hover:bg-pink hover:text-black transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete layer"
                    aria-label="Delete layer"
                >
                    <Trash2 size={14} className="text-pink" />
                </button>
            </div>
        </div>
    );
}

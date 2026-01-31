/**
 * LayerItem Component
 * 
 * Individual layer item with thumbnail, name, visibility toggle, and type indicator
 */

import { useState } from 'react';
import { Eye, EyeOff, GripVertical, Trash2, Image as ImageIcon } from 'lucide-react';
import { LayerWithImages } from '../../services/canvasService';

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
        subject: 'text-ducks-yellow',
        background: 'text-blue-400',
        effect: 'text-purple-400'
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
        group relative flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer
        ${isSelected
                    ? 'bg-ducks-green/20 border-2 border-ducks-green shadow-glow-green'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
                }
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${!layer.visible ? 'opacity-60' : ''}
        focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-ducks-yellow
      `}
        >
            {/* Drag Handle */}
            <div className="cursor-grab active:cursor-grabbing text-gray-600 hover:text-white transition-colors">
                <GripVertical size={16} />
            </div>

            {/* Thumbnail */}
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/40 border border-white/10 flex-shrink-0">
                {layer.thumbnail ? (
                    <img
                        src={layer.thumbnail}
                        alt={layer.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <ImageIcon size={20} />
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
                        className="w-full bg-black/40 border border-ducks-green rounded px-2 py-1 text-sm text-white focus:outline-none"
                        autoFocus
                    />
                ) : (
                    <div
                        onDoubleClick={() => setIsEditing(true)}
                        className="text-sm font-medium text-white truncate"
                    >
                        {layer.name}
                    </div>
                )}
                <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-mono uppercase tracking-wider ${typeColors[layer.type]}`}>
                        {layer.type}
                    </span>
                    <span className="text-[10px] text-gray-600 font-mono">
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
                    className="p-1.5 rounded hover:bg-white/10 transition-colors"
                    title={layer.visible ? 'Hide layer' : 'Show layer'}
                    aria-label={layer.visible ? 'Hide layer' : 'Show layer'}
                >
                    {layer.visible ? (
                        <Eye size={16} className="text-gray-400 hover:text-white" />
                    ) : (
                        <EyeOff size={16} className="text-gray-600" />
                    )}
                </button>

                {/* Delete */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(layer.id);
                    }}
                    className="p-1.5 rounded hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete layer"
                    aria-label="Delete layer"
                >
                    <Trash2 size={16} className="text-red-400 hover:text-red-300" />
                </button>
            </div>
        </div>
    );
}

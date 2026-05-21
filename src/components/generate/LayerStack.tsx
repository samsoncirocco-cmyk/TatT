/**
 * LayerStack Component
 * 
 * Scrollable layer stack panel with drag-and-drop reordering
 */

import { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Layers, Plus } from 'lucide-react';
import { LayerWithImages } from '@/features/generate/services/canvasService';
import LayerItem from './LayerItem';
import Button from '../ui/Button';

interface LayerStackProps {
    layers: LayerWithImages[];
    selectedLayerId: string | null;
    onSelectLayer: (layerId: string) => void;
    onToggleVisibility: (layerId: string) => void;
    onRename: (layerId: string, newName: string) => void;
    onDelete: (layerId: string) => void;
    onReorder: (fromIndex: number, toIndex: number) => void;
    onAddLayer?: () => void;
    onContextMenu?: (layer: LayerWithImages, x: number, y: number) => void;
}

// Sortable wrapper for LayerItem
function SortableLayerItem(props: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: props.layer.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <LayerItem {...props} isDragging={isDragging} />
        </div>
    );
}

export default function LayerStack({
    layers,
    selectedLayerId,
    onSelectLayer,
    onToggleVisibility,
    onRename,
    onDelete,
    onReorder,
    onAddLayer,
    onContextMenu
}: LayerStackProps) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = layers.findIndex(l => l.id === active.id);
            const newIndex = layers.findIndex(l => l.id === over.id);
            onReorder(oldIndex, newIndex);
        }
    };

    // Reverse layers for display (top layer first)
    const displayLayers = [...layers].reverse();

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b-2 hairline">
                <div className="flex items-center gap-2">
                    <Layers size={16} className="text-pink" />
                    <h3 className="text-[14px] font-display tracking-wide text-white uppercase">
                        Layers
                    </h3>
                    <span className="text-[10px] text-white/40 font-body tabular-nums tracking-[0.18em]">
                        ({layers.length})
                    </span>
                </div>
                {onAddLayer && (
                    <button
                        onClick={onAddLayer}
                        className="press p-1.5 border hairline-white hover:bg-pink hover:border-pink transition-colors"
                        title="Add layer"
                        aria-label="Add layer"
                    >
                        <Plus size={14} className="text-white hover:text-black" />
                    </button>
                )}
            </div>

            {/* Layer List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {layers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <Layers size={40} className="text-white/10 mb-4" />
                        <p className="text-[12px] font-display uppercase tracking-[0.22em] text-white/60 mb-2">No layers yet</p>
                        <p className="text-[10px] font-body uppercase tracking-[0.22em] text-white/30">
                            Add a design to create your first layer
                        </p>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={displayLayers.map(l => l.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {displayLayers.map((layer) => (
                                <SortableLayerItem
                                    key={layer.id}
                                    layer={layer}
                                    isSelected={layer.id === selectedLayerId}
                                    onSelect={onSelectLayer}
                                    onToggleVisibility={onToggleVisibility}
                                    onRename={onRename}
                                    onDelete={onDelete}
                                    onContextMenu={onContextMenu}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {/* Footer Info */}
            {layers.length > 0 && (
                <div className="p-3 border-t-2 hairline bg-black">
                    <p className="text-[10px] text-white/40 font-body uppercase tracking-[0.2em]">
                        <span className="text-pink">●</span>&nbsp;&nbsp;Drag to reorder &nbsp;/&nbsp; Double-click to rename
                    </p>
                </div>
            )}
        </div>
    );
}

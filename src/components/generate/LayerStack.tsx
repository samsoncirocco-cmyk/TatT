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
import { Layer } from '../../services/canvasService';
import LayerItem from './LayerItem';
import Button from '../ui/Button';

interface LayerStackProps {
    layers: Layer[];
    selectedLayerId: string | null;
    onSelectLayer: (layerId: string) => void;
    onToggleVisibility: (layerId: string) => void;
    onRename: (layerId: string, newName: string) => void;
    onDelete: (layerId: string) => void;
    onReorder: (fromIndex: number, toIndex: number) => void;
    onAddLayer?: () => void;
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
    onAddLayer
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
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <Layers size={18} className="text-ducks-green" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        Layers
                    </h3>
                    <span className="text-xs text-gray-600 font-mono">
                        ({layers.length})
                    </span>
                </div>
                {onAddLayer && (
                    <button
                        onClick={onAddLayer}
                        className="p-1.5 rounded hover:bg-white/10 transition-colors"
                        title="Add layer"
                        aria-label="Add layer"
                    >
                        <Plus size={16} className="text-gray-400 hover:text-white" />
                    </button>
                )}
            </div>

            {/* Layer List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {layers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <Layers size={48} className="text-gray-700 mb-4" />
                        <p className="text-sm text-gray-500 mb-2">No layers yet</p>
                        <p className="text-xs text-gray-600">
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
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {/* Footer Info */}
            {layers.length > 0 && (
                <div className="p-3 border-t border-white/10 bg-black/20">
                    <p className="text-[10px] text-gray-600 font-mono">
                        Drag to reorder • Double-click name to edit
                    </p>
                </div>
            )}
        </div>
    );
}

/**
 * useLayerManagement Hook
 *
 * Facade for Zustand-based canvas layer management
 */

import { useMemo } from 'react';
import { Layer, getLayersByZIndex } from '../services/canvasService';
import { useForgeStore } from '../stores/useForgeStore';

export function useLayerManagement() {
    const layers = useForgeStore((store) => store.layers);
    const selectedLayerId = useForgeStore((store) => store.selectedLayerId);
    const addLayer = useForgeStore((store) => store.addLayer);
    const deleteLayer = useForgeStore((store) => store.deleteLayer);
    const reorder = useForgeStore((store) => store.reorder);
    const toggleVisibility = useForgeStore((store) => store.toggleVisibility);
    const updateTransform = useForgeStore((store) => store.updateTransform);
    const flipHorizontal = useForgeStore((store) => store.flipHorizontal);
    const flipVertical = useForgeStore((store) => store.flipVertical);
    const rename = useForgeStore((store) => store.rename);
    const updateImage = useForgeStore((store) => store.updateImage);
    const updateBlendMode = useForgeStore((store) => store.updateBlendMode);
    const moveToFront = useForgeStore((store) => store.moveToFront);
    const moveToBack = useForgeStore((store) => store.moveToBack);
    const duplicateLayer = useForgeStore((store) => store.duplicateLayer);
    const selectLayer = useForgeStore((store) => store.selectLayer);
    const clearLayers = useForgeStore((store) => store.clearLayers);
    const replaceLayers = useForgeStore((store) => store.replaceLayers);
    const clearHistory = useForgeStore((store) => store.clearHistory);
    const undo = useForgeStore((store) => store.undo);
    const redo = useForgeStore((store) => store.redo);

    const sortedLayers = useMemo(() => getLayersByZIndex(layers), [layers]);

    return useMemo(() => ({
        layers,
        sortedLayers,
        selectedLayerId,
        addLayer,
        deleteLayer,
        reorder,
        toggleVisibility,
        updateTransform,
        flipHorizontal,
        flipVertical,
        rename,
        updateImage,
        updateBlendMode,
        moveToFront,
        moveToBack,
        duplicateLayer,
        selectLayer,
        clearLayers,
        replaceLayers,
        clearHistory,
        undo,
        redo
    }), [
        layers,
        sortedLayers,
        selectedLayerId,
        addLayer,
        deleteLayer,
        reorder,
        toggleVisibility,
        updateTransform,
        flipHorizontal,
        flipVertical,
        rename,
        updateImage,
        updateBlendMode,
        moveToFront,
        moveToBack,
        duplicateLayer,
        selectLayer,
        clearLayers,
        replaceLayers,
        clearHistory,
        undo,
        redo
    ]) as {
        layers: Layer[];
        sortedLayers: Layer[];
        selectedLayerId: string | null;
        addLayer: (imageUrl: string, type?: Layer['type']) => Promise<Layer>;
        deleteLayer: (layerId: string) => void;
        reorder: (fromIndex: number, toIndex: number) => void;
        toggleVisibility: (layerId: string) => void;
        updateTransform: (
            layerId: string,
            transform: Partial<Layer['transform']>,
            options?: { recordHistory?: boolean }
        ) => void;
        flipHorizontal: (layerId: string) => void;
        flipVertical: (layerId: string) => void;
        rename: (layerId: string, newName: string) => void;
        updateImage: (layerId: string, imageUrl: string) => void;
        updateBlendMode: (layerId: string, blendMode: Layer['blendMode']) => void;
        moveToFront: (layerId: string) => void;
        moveToBack: (layerId: string) => void;
        duplicateLayer: (layerId: string) => Layer | null;
        selectLayer: (layerId: string | null) => void;
        clearLayers: () => void;
        replaceLayers: (nextLayers: Layer[]) => void;
        clearHistory: () => void;
        undo: () => void;
        redo: () => void;
    };
}

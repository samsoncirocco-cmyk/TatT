/**
 * Forge store (Zustand)
 *
 * Centralized state for layer management, selection, history, and canvas metadata.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
    Layer,
    createLayer,
    generateLayerId,
    reorderLayers,
    toggleLayerVisibility,
    updateLayerName,
    updateLayerImage,
    removeLayer,
    bringToFront,
    sendToBack,
    updateLayerTransform,
    flipLayerHorizontal,
    flipLayerVertical,
    updateLayerBlendMode,
    generateThumbnail,
    getLayersByZIndex
} from '../services/canvasService';
import type { BodyPart } from '../constants/bodyPartAspectRatios';

const STORAGE_KEY = 'canvas_layers';
const MAX_HISTORY = 50;

interface HistoryState {
    past: Layer[][];
    future: Layer[][];
}

interface CanvasState {
    bodyPart: BodyPart | null;
    width: number;
    height: number;
    aspectRatio: number;
}

interface ForgeState {
    layers: Layer[];
    selectedLayerId: string | null;
    history: HistoryState;
    canvas: CanvasState;

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

    undo: () => void;
    redo: () => void;

    setCanvas: (nextCanvas: Partial<CanvasState>) => void;
    getSortedLayers: () => Layer[];
}

const baseStore = (set: any, get: any): ForgeState => {
    const pushHistory = () => {
        const { layers, history } = get();
        const nextPast = [...history.past, layers].slice(-MAX_HISTORY);
        return { past: nextPast, future: [] } as HistoryState;
    };

    const applyLayers = (nextLayers: Layer[], recordHistory = true) => {
        const nextHistory = recordHistory ? pushHistory() : get().history;
        set({ layers: nextLayers, history: nextHistory });
    };

    return {
        layers: [],
        selectedLayerId: null,
        history: { past: [], future: [] },
        canvas: { bodyPart: null, width: 0, height: 0, aspectRatio: 1 },

        addLayer: async (imageUrl: string, type: Layer['type'] = 'subject') => {
            const newLayer = createLayer(imageUrl, type, get().layers);
            applyLayers([...get().layers, newLayer]);
            set({ selectedLayerId: newLayer.id });

            try {
                const thumbnail = await generateThumbnail(imageUrl);
                applyLayers(
                    get().layers.map(layer =>
                        layer.id === newLayer.id ? { ...layer, thumbnail } : layer
                    ),
                    false
                );
            } catch (error) {
                console.warn('Failed to generate thumbnail:', error);
            }

            return newLayer;
        },

        deleteLayer: (layerId: string) => {
            applyLayers(removeLayer(get().layers, layerId));
            if (get().selectedLayerId === layerId) {
                set({ selectedLayerId: null });
            }
        },

        reorder: (fromIndex: number, toIndex: number) => {
            applyLayers(reorderLayers(get().layers, fromIndex, toIndex));
        },

        toggleVisibility: (layerId: string) => {
            applyLayers(toggleLayerVisibility(get().layers, layerId));
        },

        updateTransform: (
            layerId: string,
            transform: Partial<Layer['transform']>,
            options?: { recordHistory?: boolean }
        ) => {
            const recordHistory = options?.recordHistory !== false;
            applyLayers(updateLayerTransform(get().layers, layerId, transform), recordHistory);
        },

        flipHorizontal: (layerId: string) => {
            applyLayers(flipLayerHorizontal(get().layers, layerId));
        },

        flipVertical: (layerId: string) => {
            applyLayers(flipLayerVertical(get().layers, layerId));
        },

        rename: (layerId: string, newName: string) => {
            applyLayers(updateLayerName(get().layers, layerId, newName));
        },

        updateImage: (layerId: string, imageUrl: string) => {
            applyLayers(updateLayerImage(get().layers, layerId, imageUrl));
        },

        updateBlendMode: (layerId: string, blendMode: Layer['blendMode']) => {
            applyLayers(updateLayerBlendMode(get().layers, layerId, blendMode));
        },

        moveToFront: (layerId: string) => {
            applyLayers(bringToFront(get().layers, layerId));
        },

        moveToBack: (layerId: string) => {
            applyLayers(sendToBack(get().layers, layerId));
        },

        duplicateLayer: (layerId: string) => {
            const source = get().layers.find(layer => layer.id === layerId);
            if (!source) return null;

            const maxZIndex = get().layers.length > 0
                ? Math.max(...get().layers.map(layer => layer.zIndex))
                : 0;

            const newLayer: Layer = {
                ...source,
                id: generateLayerId(),
                name: `${source.name} Copy`,
                zIndex: maxZIndex + 1
            };

            applyLayers([...get().layers, newLayer]);
            set({ selectedLayerId: newLayer.id });
            return newLayer;
        },

        selectLayer: (layerId: string | null) => {
            set({ selectedLayerId: layerId });
        },

        clearLayers: () => {
            set({ layers: [], selectedLayerId: null, history: { past: [], future: [] } });
        },

        replaceLayers: (nextLayers: Layer[]) => {
            set({
                layers: nextLayers,
                selectedLayerId: null,
                history: { past: [], future: [] }
            });
        },

        undo: () => {
            const { history, layers } = get();
            if (history.past.length === 0) return;
            const previous = history.past[history.past.length - 1];
            const nextPast = history.past.slice(0, -1);
            const nextFuture = [layers, ...history.future].slice(0, MAX_HISTORY);
            set({
                layers: previous,
                history: { past: nextPast, future: nextFuture }
            });
        },

        redo: () => {
            const { history, layers } = get();
            if (history.future.length === 0) return;
            const [next, ...rest] = history.future;
            const nextPast = [...history.past, layers].slice(-MAX_HISTORY);
            set({
                layers: next,
                history: { past: nextPast, future: rest }
            });
        },

        setCanvas: (nextCanvas: Partial<CanvasState>) => {
            set({ canvas: { ...get().canvas, ...nextCanvas } });
        },

        getSortedLayers: () => getLayersByZIndex(get().layers)
    };
};

export const useForgeStore = create<ForgeState>()(
    typeof window !== 'undefined'
        ? persist(baseStore, {
            name: STORAGE_KEY,
            storage: createJSONStorage(() => window.sessionStorage),
            partialize: (state) => ({
                layers: state.layers.map(({ thumbnail, ...layer }) => layer),
                selectedLayerId: state.selectedLayerId
            })
        })
        : baseStore
);

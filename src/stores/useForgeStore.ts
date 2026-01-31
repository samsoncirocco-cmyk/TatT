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
} from '../features/generate/services/canvasService';
import type { BodyPart } from '../constants/bodyPartAspectRatios';
import { registerImage, releaseImageRef, retainImageRef } from '../services/forgeImageRegistry';

const STORAGE_KEY = 'canvas_layers';
const MAX_HISTORY = 50;

type HistoryEntry =
    | {
        type: 'snapshot';
        layers: Layer[];
        selectedLayerId: string | null;
    }
    | {
        type: 'transform';
        layerId: string;
        before: Layer['transform'];
        after: Layer['transform'];
    };

interface HistoryState {
    past: HistoryEntry[];
    future: HistoryEntry[];
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
    clearHistory: () => void;

    undo: () => void;
    redo: () => void;

    setCanvas: (nextCanvas: Partial<CanvasState>) => void;
    getSortedLayers: () => Layer[];
}

const baseStore = (set: any, get: any): ForgeState => {
    const cloneLayers = (layers: Layer[]) =>
        layers.map(layer => ({
            ...layer,
            transform: { ...layer.transform }
        }));

    const pushSnapshot = () => {
        const { layers, selectedLayerId, history } = get();
        const entry: HistoryEntry = {
            type: 'snapshot',
            layers: cloneLayers(layers),
            selectedLayerId
        };
        const nextPast = [...history.past, entry].slice(-MAX_HISTORY);
        return { past: nextPast, future: [] } as HistoryState;
    };

    const pushTransform = (entry: HistoryEntry) => {
        if (entry.type !== 'transform') return get().history;
        const { history } = get();
        const nextPast = [...history.past, entry].slice(-MAX_HISTORY);
        return { past: nextPast, future: [] } as HistoryState;
    };

    const normalizeIncomingLayers = (nextLayers: any[]): Layer[] => {
        return nextLayers.map((layer) => {
            if (layer.imageRef) {
                retainImageRef(layer.imageRef);
                if (layer.thumbnailRef) {
                    retainImageRef(layer.thumbnailRef);
                }
                return layer as Layer;
            }

            const imageRef = layer.imageUrl ? registerImage(layer.imageUrl) : registerImage('');
            const thumbnailRef = layer.thumbnail ? registerImage(layer.thumbnail) : undefined;
            return {
                ...layer,
                imageRef,
                thumbnailRef
            } as Layer;
        });
    };

    const applyLayers = (nextLayers: Layer[], recordHistory = true) => {
        const nextHistory = recordHistory ? pushSnapshot() : get().history;
        set({ layers: nextLayers, history: nextHistory });
    };

    return {
        layers: [],
        selectedLayerId: null,
        history: { past: [], future: [] },
        canvas: { bodyPart: null, width: 0, height: 0, aspectRatio: 1 },

        addLayer: async (imageUrl: string, type: Layer['type'] = 'subject') => {
            const imageRef = registerImage(imageUrl);
            const newLayer = createLayer(imageRef, type, get().layers);
            applyLayers([...get().layers, newLayer]);
            set({ selectedLayerId: newLayer.id });

            try {
                const thumbnail = await generateThumbnail(imageUrl);
                const thumbnailRef = registerImage(thumbnail);
                applyLayers(
                    get().layers.map(layer =>
                        layer.id === newLayer.id ? { ...layer, thumbnailRef } : layer
                    ),
                    false
                );
            } catch (error) {
                console.warn('Failed to generate thumbnail:', error);
            }

            return newLayer;
        },

        deleteLayer: (layerId: string) => {
            const layer = get().layers.find(target => target.id === layerId);
            if (layer) {
                releaseImageRef(layer.imageRef);
                releaseImageRef(layer.thumbnailRef);
            }
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
            const currentLayer = get().layers.find(layer => layer.id === layerId);
            if (!currentLayer) return;
            const before = { ...currentLayer.transform };
            const after = { ...currentLayer.transform, ...transform };
            const nextLayers = updateLayerTransform(get().layers, layerId, transform);
            const nextHistory = recordHistory
                ? pushTransform({ type: 'transform', layerId, before, after })
                : get().history;
            set({ layers: nextLayers, history: nextHistory });
        },

        flipHorizontal: (layerId: string) => {
            const currentLayer = get().layers.find(layer => layer.id === layerId);
            if (!currentLayer) return;
            const before = { ...currentLayer.transform };
            const nextLayers = flipLayerHorizontal(get().layers, layerId);
            const updatedLayer = nextLayers.find(layer => layer.id === layerId);
            if (!updatedLayer) return;
            const after = { ...updatedLayer.transform };
            set({
                layers: nextLayers,
                history: pushTransform({ type: 'transform', layerId, before, after })
            });
        },

        flipVertical: (layerId: string) => {
            const currentLayer = get().layers.find(layer => layer.id === layerId);
            if (!currentLayer) return;
            const before = { ...currentLayer.transform };
            const nextLayers = flipLayerVertical(get().layers, layerId);
            const updatedLayer = nextLayers.find(layer => layer.id === layerId);
            if (!updatedLayer) return;
            const after = { ...updatedLayer.transform };
            set({
                layers: nextLayers,
                history: pushTransform({ type: 'transform', layerId, before, after })
            });
        },

        rename: (layerId: string, newName: string) => {
            applyLayers(updateLayerName(get().layers, layerId, newName));
        },

        updateImage: (layerId: string, imageUrl: string) => {
            const currentLayer = get().layers.find(layer => layer.id === layerId);
            if (!currentLayer) return;
            const imageRef = registerImage(imageUrl);
            releaseImageRef(currentLayer.imageRef);
            applyLayers(updateLayerImage(get().layers, layerId, imageRef));

            if (currentLayer.thumbnailRef) {
                releaseImageRef(currentLayer.thumbnailRef);
            }

            generateThumbnail(imageUrl)
                .then((thumbnail) => {
                    const thumbnailRef = registerImage(thumbnail);
                    applyLayers(
                        get().layers.map(layer =>
                            layer.id === layerId ? { ...layer, thumbnailRef } : layer
                        ),
                        false
                    );
                })
                .catch((error) => {
                    console.warn('Failed to generate thumbnail:', error);
                });
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

            retainImageRef(source.imageRef);
            retainImageRef(source.thumbnailRef);

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
            get().layers.forEach(layer => {
                releaseImageRef(layer.imageRef);
                releaseImageRef(layer.thumbnailRef);
            });
            set({ layers: [], selectedLayerId: null, history: { past: [], future: [] } });
        },

        replaceLayers: (nextLayers: Layer[]) => {
            get().layers.forEach(layer => {
                releaseImageRef(layer.imageRef);
                releaseImageRef(layer.thumbnailRef);
            });
            set({
                layers: normalizeIncomingLayers(nextLayers as Layer[]),
                selectedLayerId: null,
                history: { past: [], future: [] }
            });
        },

        clearHistory: () => {
            set({ history: { past: [], future: [] } });
        },

        undo: () => {
            const { history, layers } = get();
            if (history.past.length === 0) return;
            const previous = history.past[history.past.length - 1];
            const nextPast = history.past.slice(0, -1);

            if (previous.type === 'snapshot') {
                const futureEntry: HistoryEntry = {
                    type: 'snapshot',
                    layers: layers.map(layer => ({ ...layer, transform: { ...layer.transform } })),
                    selectedLayerId: get().selectedLayerId
                };
                const nextFuture = [futureEntry, ...history.future].slice(0, MAX_HISTORY);
                set({
                    layers: previous.layers,
                    selectedLayerId: previous.selectedLayerId,
                    history: { past: nextPast, future: nextFuture }
                });
                return;
            }

            const nextLayers = updateLayerTransform(get().layers, previous.layerId, previous.before);
            const nextFuture = [previous, ...history.future].slice(0, MAX_HISTORY);
            set({
                layers: nextLayers,
                history: { past: nextPast, future: nextFuture }
            });
        },

        redo: () => {
            const { history, layers } = get();
            if (history.future.length === 0) return;
            const [next, ...rest] = history.future;
            if (next.type === 'snapshot') {
                const pastEntry: HistoryEntry = {
                    type: 'snapshot',
                    layers: layers.map(layer => ({ ...layer, transform: { ...layer.transform } })),
                    selectedLayerId: get().selectedLayerId
                };
                const nextPast = [...history.past, pastEntry].slice(-MAX_HISTORY);
                set({
                    layers: next.layers,
                    selectedLayerId: next.selectedLayerId,
                    history: { past: nextPast, future: rest }
                });
                return;
            }

            const nextLayers = updateLayerTransform(get().layers, next.layerId, next.after);
            const nextPast = [...history.past, next].slice(-MAX_HISTORY);
            set({
                layers: nextLayers,
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
                layers: state.layers,
                selectedLayerId: state.selectedLayerId
            })
        })
        : baseStore
);

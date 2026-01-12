/**
 * useLayerManagement Hook
 * 
 * Custom hook for managing canvas layer state and operations
 */

import { useState, useCallback, useEffect } from 'react';
import {
    Layer,
    createLayer,
    reorderLayers,
    toggleLayerVisibility,
    updateLayerName,
    updateLayerImage,
    removeLayer,
    bringToFront,
    sendToBack,
    getLayersByZIndex,
    generateThumbnail,
    updateLayerTransform,
    flipLayerHorizontal,
    flipLayerVertical,
    updateLayerBlendMode
} from '../services/canvasService';

const STORAGE_KEY = 'canvas_layers';

export function useLayerManagement() {
    const [layers, setLayers] = useState<Layer[]>([]);
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

    // Load layers from session storage on mount
    useEffect(() => {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setLayers(parsed);
            } catch (e) {
                console.error('Failed to load layers from storage:', e);
            }
        }
    }, []);

    // Save layers to session storage on changes
    useEffect(() => {
        if (layers.length > 0) {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(layers));
        }
    }, [layers]);

    /**
     * Add a new layer
     */
    const addLayer = useCallback(async (
        imageUrl: string,
        type: Layer['type'] = 'subject'
    ) => {
        const newLayer = createLayer(imageUrl, type, layers);

        // Generate thumbnail
        try {
            const thumbnail = await generateThumbnail(imageUrl);
            newLayer.thumbnail = thumbnail;
        } catch (e) {
            console.warn('Failed to generate thumbnail:', e);
        }

        setLayers(prev => [...prev, newLayer]);
        setSelectedLayerId(newLayer.id);

        return newLayer;
    }, [layers]);

    /**
     * Remove a layer
     */
    const deleteLayer = useCallback((layerId: string) => {
        setLayers(prev => removeLayer(prev, layerId));
        if (selectedLayerId === layerId) {
            setSelectedLayerId(null);
        }
    }, [selectedLayerId]);

    /**
     * Reorder layers via drag and drop
     */
    const reorder = useCallback((fromIndex: number, toIndex: number) => {
        setLayers(prev => reorderLayers(prev, fromIndex, toIndex));
    }, []);

    /**
     * Toggle layer visibility
     */
    const toggleVisibility = useCallback((layerId: string) => {
        setLayers(prev => toggleLayerVisibility(prev, layerId));
    }, []);

    /**
     * Update layer transform
     */
    const updateTransform = useCallback((layerId: string, transform: Partial<Layer['transform']>) => {
        setLayers(prev => updateLayerTransform(prev, layerId, transform));
    }, []);

    /**
     * Flip layer horizontally
     */
    const flipHorizontal = useCallback((layerId: string) => {
        setLayers(prev => flipLayerHorizontal(prev, layerId));
    }, []);

    /**
     * Flip layer vertically
     */
    const flipVertical = useCallback((layerId: string) => {
        setLayers(prev => flipLayerVertical(prev, layerId));
    }, []);

    /**
     * Update layer name
     */
    const rename = useCallback((layerId: string, newName: string) => {
        setLayers(prev => updateLayerName(prev, layerId, newName));
    }, []);

    /**
     * Update layer image URL
     */
    const updateImage = useCallback((layerId: string, imageUrl: string) => {
        setLayers(prev => updateLayerImage(prev, layerId, imageUrl));
    }, []);

    /**
     * Update layer blend mode
     */
    const updateBlendMode = useCallback((layerId: string, blendMode: Layer['blendMode']) => {
        setLayers(prev => updateLayerBlendMode(prev, layerId, blendMode));
    }, []);

    /**
     * Bring layer to front
     */
    const moveToFront = useCallback((layerId: string) => {
        setLayers(prev => bringToFront(prev, layerId));
    }, []);

    /**
     * Send layer to back
     */
    const moveToBack = useCallback((layerId: string) => {
        setLayers(prev => sendToBack(prev, layerId));
    }, []);

    /**
     * Select a layer
     */
    const selectLayer = useCallback((layerId: string | null) => {
        setSelectedLayerId(layerId);
    }, []);

    /**
     * Clear all layers
     */
    const clearLayers = useCallback(() => {
        setLayers([]);
        setSelectedLayerId(null);
        sessionStorage.removeItem(STORAGE_KEY);
    }, []);

    /**
     * Replace all layers (used for version loading)
     */
    const replaceLayers = useCallback((nextLayers: Layer[]) => {
        setLayers(nextLayers);
        setSelectedLayerId(null);
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextLayers));
    }, []);

    /**
     * Get layers sorted by z-index for rendering
     */
    const sortedLayers = getLayersByZIndex(layers);

    return {
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
        selectLayer,
        clearLayers,
        replaceLayers
    };
}

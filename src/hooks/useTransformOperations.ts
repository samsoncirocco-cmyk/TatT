/**
 * useTransformOperations Hook
 * 
 * Custom hook for managing layer transform operations (move, scale, rotate, flip)
 */

import { useCallback } from 'react';
import {
    Layer,
    updateLayerTransform,
    flipLayerHorizontal,
    flipLayerVertical
} from '../features/generate/services/canvasService';

export function useTransformOperations(
    layers: Layer[],
    setLayers: React.Dispatch<React.SetStateAction<Layer[]>>
) {

    /**
     * Update transform data for a specific layer
     * Used by Konva's onTransformEnd and onDragEnd events
     */
    const updateTransform = useCallback((
        layerId: string,
        newTransform: Partial<Layer['transform']>
    ) => {
        setLayers(prev => updateLayerTransform(prev, layerId, newTransform));
    }, [setLayers]);

    /**
     * Flip selected layer horizontally
     */
    const flipHorizontal = useCallback((layerId: string) => {
        setLayers(prev => flipLayerHorizontal(prev, layerId));
    }, [setLayers]);

    /**
     * Flip selected layer vertically
     */
    const flipVertical = useCallback((layerId: string) => {
        setLayers(prev => flipLayerVertical(prev, layerId));
    }, [setLayers]);

    return {
        updateTransform,
        flipHorizontal,
        flipVertical
    };
}

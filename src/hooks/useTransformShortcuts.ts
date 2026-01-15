import { useEffect } from 'react';
import type { Layer } from '../services/canvasService';

interface UseTransformShortcutsOptions {
    selectedLayerId: string | null;
    layers: Layer[];
    updateTransform: (layerId: string, transform: Partial<Layer['transform']>) => void;
    deleteLayer: (layerId: string) => void;
    duplicateLayer: (layerId: string) => Layer | null;
    undo: () => void;
    redo: () => void;
}

const isEditableTarget = () => {
    const activeElement = document.activeElement as HTMLElement | null;
    if (!activeElement) return false;
    const tagName = activeElement.tagName;
    if (tagName === 'INPUT' || tagName === 'TEXTAREA') return true;
    return Boolean(activeElement.isContentEditable);
};

export function useTransformShortcuts({
    selectedLayerId,
    layers,
    updateTransform,
    deleteLayer,
    duplicateLayer,
    undo,
    redo
}: UseTransformShortcutsOptions) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (isEditableTarget()) return;

            const isMeta = event.metaKey || event.ctrlKey;

            if (isMeta && event.key.toLowerCase() === 'z') {
                event.preventDefault();
                if (event.shiftKey) {
                    redo();
                } else {
                    undo();
                }
                return;
            }

            if (isMeta && event.key.toLowerCase() === 'd') {
                if (!selectedLayerId) return;
                event.preventDefault();
                duplicateLayer(selectedLayerId);
                return;
            }

            if (!selectedLayerId) return;

            const layer = layers.find((item) => item.id === selectedLayerId);
            if (!layer) return;

            const moveStep = event.shiftKey ? 10 : 1;

            switch (event.key) {
                case 'ArrowUp':
                    event.preventDefault();
                    updateTransform(selectedLayerId, { y: layer.transform.y - moveStep });
                    break;
                case 'ArrowDown':
                    event.preventDefault();
                    updateTransform(selectedLayerId, { y: layer.transform.y + moveStep });
                    break;
                case 'ArrowLeft':
                    event.preventDefault();
                    updateTransform(selectedLayerId, { x: layer.transform.x - moveStep });
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    updateTransform(selectedLayerId, { x: layer.transform.x + moveStep });
                    break;
                case 'Delete':
                case 'Backspace':
                    event.preventDefault();
                    deleteLayer(selectedLayerId);
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        selectedLayerId,
        layers,
        updateTransform,
        deleteLayer,
        duplicateLayer,
        undo,
        redo
    ]);
}

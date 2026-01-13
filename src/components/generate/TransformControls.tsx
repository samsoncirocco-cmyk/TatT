/**
 * TransformControls Component
 * 
 * UI for transform operations like Flip, usually placed near the canvas
 */

import { FlipHorizontal, FlipVertical, RotateCw } from 'lucide-react';
import Button from '../ui/Button';

interface TransformControlsProps {
    onFlipHorizontal: () => void;
    onFlipVertical: () => void;
    onResetRotation: () => void;
    disabled?: boolean;
}

export default function TransformControls({
    onFlipHorizontal,
    onFlipVertical,
    onResetRotation,
    disabled = false
}: TransformControlsProps) {
    return (
        <div className="flex items-center gap-2 p-2 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
                onClick={onFlipHorizontal}
                disabled={disabled}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-50"
                title="Flip Horizontal"
            >
                <FlipHorizontal size={20} />
            </button>
            <button
                onClick={onFlipVertical}
                disabled={disabled}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-50"
                title="Flip Vertical"
            >
                <FlipVertical size={20} />
            </button>
            <div className="w-px h-4 bg-white/20 mx-1" />
            <button
                onClick={onResetRotation}
                disabled={disabled}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-50"
                title="Reset Rotation"
            >
                <RotateCw size={20} />
            </button>
        </div>
    );
}

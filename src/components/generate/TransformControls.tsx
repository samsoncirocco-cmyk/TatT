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
        <div className="flex items-center gap-1 p-1.5 bg-black border-2 border-pink opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button
                onClick={onFlipHorizontal}
                disabled={disabled}
                className="press p-2 text-white hover:text-black hover:bg-pink transition-colors disabled:opacity-50"
                title="Flip Horizontal"
            >
                <FlipHorizontal size={18} />
            </button>
            <button
                onClick={onFlipVertical}
                disabled={disabled}
                className="press p-2 text-white hover:text-black hover:bg-pink transition-colors disabled:opacity-50"
                title="Flip Vertical"
            >
                <FlipVertical size={18} />
            </button>
            <div className="w-px h-4 bg-pink mx-1" />
            <button
                onClick={onResetRotation}
                disabled={disabled}
                className="press p-2 text-white hover:text-black hover:bg-pink transition-colors disabled:opacity-50"
                title="Reset Rotation"
            >
                <RotateCw size={18} />
            </button>
        </div>
    );
}

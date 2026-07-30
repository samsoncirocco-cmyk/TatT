/**
 * Cleanup Tool Component
 *
 * Manual eraser/paint tool for tattoo stencil preparation
 * Allows users to clean up designs before converting to stencils
 *
 * Features:
 * - Eraser brush with adjustable size
 * - Paint mode for filling in areas
 * - Undo/Redo stack (10 steps)
 * - Keyboard shortcuts
 * - Touch support for tablets/mobile
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Eraser, Paintbrush, Undo2, Redo2, Trash2, Download } from 'lucide-react';
import Button from '../ui/Button';

const UNDO_LIMIT = 10;

export default function CleanupTool({ imageUrl, onClose, onSave }) {
    // Canvas refs
    const imageCanvasRef = useRef(null);
    const drawingCanvasRef = useRef(null);
    const previewCanvasRef = useRef(null);

    // State
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushSize, setBrushSize] = useState(30);
    const [mode, setMode] = useState('erase'); // 'erase' or 'paint'
    const [imageLoaded, setImageLoaded] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: 1024, height: 1024 });

    // Undo/Redo stacks
    const [undoStack, setUndoStack] = useState([]);
    const [redoStack, setRedoStack] = useState([]);
    const [hasChanges, setHasChanges] = useState(false);

    // Load image and initialize canvases
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            const aspectRatio = img.width / img.height;
            const maxSize = 1024;

            let width, height;
            if (aspectRatio > 1) {
                width = maxSize;
                height = maxSize / aspectRatio;
            } else {
                height = maxSize;
                width = maxSize * aspectRatio;
            }

            setCanvasSize({ width, height });

            // Draw image on background canvas
            const imageCanvas = imageCanvasRef.current;
            const imageCtx = imageCanvas.getContext('2d');
            imageCanvas.width = width;
            imageCanvas.height = height;
            imageCtx.drawImage(img, 0, 0, width, height);

            // Initialize drawing canvas (transparent)
            const drawingCanvas = drawingCanvasRef.current;
            const drawingCtx = drawingCanvas.getContext('2d');
            drawingCanvas.width = width;
            drawingCanvas.height = height;
            drawingCtx.clearRect(0, 0, width, height);

            // Initialize preview canvas
            const previewCanvas = previewCanvasRef.current;
            previewCanvas.width = width;
            previewCanvas.height = height;

            // Save initial state
            saveToUndoStack();

            setImageLoaded(true);
        };

        img.onerror = () => {
            console.error('Failed to load image');
        };

        img.src = imageUrl;
    }, [imageUrl, saveToUndoStack]);

    // Update preview canvas whenever drawing changes
    const updatePreview = useCallback(() => {
        const imageCanvas = imageCanvasRef.current;
        const drawingCanvas = drawingCanvasRef.current;
        const previewCanvas = previewCanvasRef.current;

        if (!imageCanvas || !drawingCanvas || !previewCanvas) return;

        const ctx = previewCanvas.getContext('2d');

        // Clear preview
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

        // Draw original image
        ctx.drawImage(imageCanvas, 0, 0);

        // Apply drawing canvas with multiply blend (shows eraser effect)
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(drawingCanvas, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
    }, []);

    // Save current state to undo stack
    const saveToUndoStack = useCallback(() => {
        const drawingCanvas = drawingCanvasRef.current;
        if (!drawingCanvas) return;

        const imageData = drawingCanvas.toDataURL();

        setUndoStack(prev => {
            const newStack = [...prev, imageData];
            // Limit stack size
            if (newStack.length > UNDO_LIMIT) {
                return newStack.slice(1);
            }
            return newStack;
        });

        // Clear redo stack on new action
        setRedoStack([]);
        setHasChanges(true);
    }, []);

    // Undo last action
    const handleUndo = useCallback(() => {
        if (undoStack.length <= 1) return; // Keep at least initial state

        setUndoStack(prev => {
            const newStack = [...prev];
            const currentState = newStack.pop();

            // Save to redo stack
            setRedoStack(prevRedo => [...prevRedo, currentState]);

            // Restore previous state
            const previousState = newStack[newStack.length - 1];
            const drawingCanvas = drawingCanvasRef.current;
            const ctx = drawingCanvas.getContext('2d');

            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
                ctx.drawImage(img, 0, 0);
                updatePreview();
            };
            img.src = previousState;

            return newStack;
        });
    }, [undoStack, updatePreview]);

    // Redo last undone action
    const handleRedo = useCallback(() => {
        if (redoStack.length === 0) return;

        setRedoStack(prev => {
            const newStack = [...prev];
            const stateToRestore = newStack.pop();

            // Save current state to undo stack
            const drawingCanvas = drawingCanvasRef.current;
            setUndoStack(prevUndo => [...prevUndo, drawingCanvas.toDataURL()]);

            // Restore state
            const ctx = drawingCanvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
                ctx.drawImage(img, 0, 0);
                updatePreview();
            };
            img.src = stateToRestore;

            return newStack;
        });
    }, [redoStack, updatePreview]);

    // Clear all changes
    const handleClearAll = useCallback(() => {
        const drawingCanvas = drawingCanvasRef.current;
        if (!drawingCanvas) return;

        const ctx = drawingCanvas.getContext('2d');
        ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

        saveToUndoStack();
        updatePreview();
        setHasChanges(false);
    }, [saveToUndoStack, updatePreview]);

    // Get mouse/touch position relative to canvas
    const getCanvasPosition = useCallback((e, canvas) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let clientX, clientY;
        if (e.touches && e.touches[0]) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }, []);

    // Drawing function
    const drawBrush = useCallback((x, y) => {
        const drawingCanvas = drawingCanvasRef.current;
        if (!drawingCanvas) return;

        const ctx = drawingCanvas.getContext('2d');

        if (mode === 'erase') {
            // Erase by drawing white on drawing canvas
            ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        } else {
            // Paint by drawing black (to cover erased areas)
            ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        }

        ctx.beginPath();
        ctx.arc(x, y, brushSize, 0, Math.PI * 2);
        ctx.fill();

        updatePreview();
    }, [mode, brushSize, updatePreview]);

    // Mouse/touch event handlers
    const startDrawing = useCallback((e) => {
        e.preventDefault();
        setIsDrawing(true);

        const canvas = drawingCanvasRef.current;
        const pos = getCanvasPosition(e, canvas);
        drawBrush(pos.x, pos.y);
    }, [getCanvasPosition, drawBrush]);

    const draw = useCallback((e) => {
        if (!isDrawing) return;
        e.preventDefault();

        const canvas = drawingCanvasRef.current;
        const pos = getCanvasPosition(e, canvas);
        drawBrush(pos.x, pos.y);
    }, [isDrawing, getCanvasPosition, drawBrush]);

    const stopDrawing = useCallback(() => {
        if (isDrawing) {
            setIsDrawing(false);
            saveToUndoStack();
        }
    }, [isDrawing, saveToUndoStack]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if typing in input
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
                return;
            }

            switch (e.key.toLowerCase()) {
                case 'e':
                    setMode('erase');
                    break;
                case 'b':
                    setMode('paint');
                    break;
                case '[':
                    setBrushSize(prev => Math.max(10, prev - 5));
                    break;
                case ']':
                    setBrushSize(prev => Math.min(100, prev + 5));
                    break;
                case 'z':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        if (e.shiftKey) {
                            handleRedo();
                        } else {
                            handleUndo();
                        }
                    }
                    break;
                case 'y':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        handleRedo();
                    }
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo]);

    // Export cleaned image
    const handleExport = useCallback(() => {
        const previewCanvas = previewCanvasRef.current;
        if (!previewCanvas) return;

        previewCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);

            if (onSave) {
                onSave(url);
            } else {
                // Fallback: download file
                const link = document.createElement('a');
                link.href = url;
                link.download = `cleaned-stencil-${Date.now()}.png`;
                link.click();
                URL.revokeObjectURL(url);
            }
        }, 'image/png');
    }, [onSave]);

    return (
        <div className="fixed inset-0 bg-black/90 z-[60] overflow-y-auto">
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-black border-2 border-pink max-w-7xl w-full text-white">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b-2 hairline">
                        <div>
                            <h2 className="text-[20px] font-display tracking-wide uppercase text-white leading-none">
                                <span className="text-pink">●</span>&nbsp;&nbsp;Cleanup Tool
                            </h2>
                            <p className="text-[10px] font-body text-white/50 mt-2 uppercase tracking-[0.25em]">
                                Prepare your stencil for printing
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-[10px] font-body uppercase tracking-[0.22em] text-white/60 hover:text-pink"
                            aria-label="Close cleanup tool"
                        >
                            Close ✕
                        </button>
                    </div>

                    {/* Main Content */}
                    <div className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Canvas Area */}
                            <div className="lg:col-span-2 space-y-4">
                                {/* Canvas Container */}
                                <div className="bg-black p-6 border-2 hairline-white">
                                    <div className="relative mx-auto" style={{
                                        maxWidth: '100%',
                                        aspectRatio: `${canvasSize.width}/${canvasSize.height}`
                                    }}>
                                        {/* Image Canvas (hidden, used for reference) */}
                                        <canvas
                                            ref={imageCanvasRef}
                                            className="hidden"
                                        />

                                        {/* Drawing Canvas (hidden, stores erase/paint data) */}
                                        <canvas
                                            ref={drawingCanvasRef}
                                            className="hidden"
                                        />

                                        {/* Preview Canvas (visible composite) */}
                                        <canvas
                                            ref={previewCanvasRef}
                                            className="absolute inset-0 w-full h-full border hairline-white cursor-crosshair touch-none"
                                            style={{
                                                imageRendering: 'crisp-edges',
                                                background: 'repeating-conic-gradient(#808080 0% 25%, #ffffff 0% 50%) 50% / 20px 20px'
                                            }}
                                            onMouseDown={startDrawing}
                                            onMouseMove={draw}
                                            onMouseUp={stopDrawing}
                                            onMouseLeave={stopDrawing}
                                            onTouchStart={startDrawing}
                                            onTouchMove={draw}
                                            onTouchEnd={stopDrawing}
                                        />

                                        {/* Loading overlay */}
                                        {!imageLoaded && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                                <div className="text-[10px] text-white/60 font-body uppercase tracking-[0.25em]">
                                                    <span className="text-pink">●</span>&nbsp;&nbsp;Loading image...
                                                </div>
                                            </div>
                                        )}

                                        {/* Mode indicator */}
                                        <div className="absolute top-4 left-4 px-3 py-1 bg-black/80 border hairline">
                                            <p className="text-[10px] font-body uppercase tracking-[0.2em] text-white/90 flex items-center gap-2">
                                                {mode === 'erase' ? (
                                                    <>
                                                        <Eraser size={14} />
                                                        Erase Mode
                                                    </>
                                                ) : (
                                                    <>
                                                        <Paintbrush size={14} />
                                                        Paint Mode
                                                    </>
                                                )}
                                            </p>
                                        </div>

                                        {/* Brush size indicator */}
                                        <div className="absolute top-4 right-4 px-3 py-1 bg-black/80 border hairline">
                                            <p className="text-[10px] font-body text-white/90 tabular-nums">
                                                {brushSize}px
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Toolbar */}
                                <div className="border-2 hairline p-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <Button
                                            onClick={handleUndo}
                                            disabled={undoStack.length <= 1}
                                            variant="outline"
                                            size="md"
                                            icon={Undo2}
                                        >
                                            Undo
                                        </Button>
                                        <Button
                                            onClick={handleRedo}
                                            disabled={redoStack.length === 0}
                                            variant="outline"
                                            size="md"
                                            icon={Redo2}
                                        >
                                            Redo
                                        </Button>
                                        <Button
                                            onClick={handleClearAll}
                                            disabled={!hasChanges}
                                            variant="danger"
                                            size="md"
                                            icon={Trash2}
                                        >
                                            Clear
                                        </Button>
                                        <Button
                                            onClick={handleExport}
                                            disabled={!imageLoaded}
                                            variant="primary"
                                            size="md"
                                            icon={Download}
                                        >
                                            Save
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Controls Panel */}
                            <div className="space-y-4">
                                {/* Mode Selection */}
                                <div className="border-2 hairline p-4">
                                    <p className="text-[10px] font-body uppercase tracking-[0.28em] text-pink mb-3">
                                        <span className="text-pink">●</span>&nbsp;&nbsp;Tool Mode
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setMode('erase')}
                                            className={`
                                                press h-20 flex flex-col items-center justify-center gap-2
                                                transition-colors border-2
                                                ${mode === 'erase'
                                                    ? 'bg-pink border-pink text-black'
                                                    : 'bg-black hairline-white text-white/60 hover:border-pink hover:text-pink'
                                                }
                                            `}
                                        >
                                            <Eraser size={24} />
                                            <span className="text-[10px] font-body uppercase tracking-[0.2em]">
                                                Erase
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => setMode('paint')}
                                            className={`
                                                press h-20 flex flex-col items-center justify-center gap-2
                                                transition-colors border-2
                                                ${mode === 'paint'
                                                    ? 'bg-pink border-pink text-black'
                                                    : 'bg-black hairline-white text-white/60 hover:border-pink hover:text-pink'
                                                }
                                            `}
                                        >
                                            <Paintbrush size={24} />
                                            <span className="text-[10px] font-body uppercase tracking-[0.2em]">
                                                Paint
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {/* Brush Size */}
                                <div className="border-2 hairline p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-[10px] font-body uppercase tracking-[0.28em] text-pink">
                                            <span className="text-pink">●</span>&nbsp;&nbsp;Brush Size
                                        </p>
                                        <span className="text-[13px] text-white font-body tabular-nums">
                                            {brushSize}px
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="10"
                                        max="100"
                                        step="5"
                                        value={brushSize}
                                        onChange={(e) => setBrushSize(Number(e.target.value))}
                                        className="w-full accent-[#ff1f6b] cursor-pointer"
                                    />
                                    <div className="flex justify-between mt-2 text-[10px] text-white/40 font-body tabular-nums">
                                        <span>10px</span>
                                        <span>100px</span>
                                    </div>
                                </div>

                                {/* Keyboard Shortcuts */}
                                <div className="border-2 hairline p-4">
                                    <p className="text-[10px] font-body uppercase tracking-[0.28em] text-pink mb-3">
                                        <span className="text-pink">●</span>&nbsp;&nbsp;Keyboard Shortcuts
                                    </p>
                                    <div className="space-y-2 text-[11px] text-white/70 font-body">
                                        <div className="flex justify-between items-center">
                                            <span>Erase Mode</span>
                                            <kbd className="px-2 py-1 bg-white/10 border hairline-white text-white/60 font-body">E</kbd>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span>Paint Mode</span>
                                            <kbd className="px-2 py-1 bg-white/10 border hairline-white text-white/60 font-body">B</kbd>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span>Smaller Brush</span>
                                            <kbd className="px-2 py-1 bg-white/10 border hairline-white text-white/60 font-body">[</kbd>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span>Larger Brush</span>
                                            <kbd className="px-2 py-1 bg-white/10 border hairline-white text-white/60 font-body">]</kbd>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span>Undo</span>
                                            <kbd className="px-2 py-1 bg-white/10 border hairline-white text-white/60 font-body">Ctrl+Z</kbd>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span>Redo</span>
                                            <kbd className="px-2 py-1 bg-white/10 border hairline-white text-white/60 font-body">Ctrl+Y</kbd>
                                        </div>
                                    </div>
                                </div>

                                {/* Instructions */}
                                <div className="border hairline p-4">
                                    <p className="text-[10px] font-body uppercase tracking-[0.28em] text-pink mb-3">
                                        <span className="text-pink">●</span>&nbsp;&nbsp;How to Use
                                    </p>
                                    <ol className="text-[11px] text-white/70 font-body space-y-2 list-decimal list-inside leading-[1.55]">
                                        <li>Choose Erase or Paint mode</li>
                                        <li>Adjust brush size with slider or [ ] keys</li>
                                        <li>Click/drag to clean up your design</li>
                                        <li>Use Undo/Redo to fix mistakes</li>
                                        <li>Click Save to update your layer</li>
                                    </ol>
                                    <p className="text-[10px] text-white/50 mt-3 font-body">
                                        Tip: Use a larger brush for quick cleanup, then switch to a smaller brush for detail work.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

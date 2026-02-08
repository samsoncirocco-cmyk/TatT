/**
 * ForgeCanvas - Enhanced with Konva Layer Management
 * 
 * Main canvas component with dynamic aspect ratio and layer rendering
 */

import { useRef, useEffect, useState } from 'react';
import { Stage, Layer as KonvaLayer, Image as KonvaImage, Circle } from 'react-konva';
import { motion, AnimatePresence } from 'framer-motion';
import { BodyPart } from '@/constants/bodyPartAspectRatios';
import { useCanvasAspectRatio } from '@/hooks/useCanvasAspectRatio';
import { CanvasSilhouette } from '@/components/generate/CanvasSilhouette';
import { LayerWithImages, getCompositeOperation } from '../services/canvasService';
import { loadImageWithCancel } from '@/services/imageLoadManager';
import TransformHandles from './Forge/TransformHandles';

interface ForgeCanvasProps {
    bodyPart: BodyPart;
    layers?: LayerWithImages[];
    selectedLayerId?: string | null;
    onSelectLayer?: (layerId: string | null) => void;
    onUpdateTransform?: (
        layerId: string,
        transform: Partial<LayerWithImages['transform']>,
        options?: { recordHistory?: boolean }
    ) => void;
    className?: string;
}

/**
 * Load image and return HTMLImageElement
 */
function useManagedImage(url?: string | null): HTMLImageElement | null {
    const [image, setImage] = useState<HTMLImageElement | null>(null);

    useEffect(() => {
        if (!url) {
            setImage(null);
            return;
        }

        const controller = new AbortController();
        const { promise, cancel } = loadImageWithCancel(url, { signal: controller.signal });
        let isActive = true;

        promise
            .then((img) => {
                if (!isActive) return;
                setImage(img);
            })
            .catch((error) => {
                if (!isActive) return;
                if (error?.message !== 'Image load aborted') {
                    console.error('Failed to load image:', url, error);
                }
                setImage(null);
            });

        return () => {
            isActive = false;
            controller.abort();
            cancel();
        };
    }, [url]);

    return image;
}

function useShiftKey() {
    const [isPressed, setIsPressed] = useState(false);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Shift') {
                setIsPressed(true);
            }
        };
        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.key === 'Shift') {
                setIsPressed(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    return isPressed;
}

/**
 * Konva Image component with layer data and Transformer
 */
function LayerImage({
    layer,
    canvasWidth,
    canvasHeight,
    isSelected,
    onSelect,
    onUpdateTransform
}: {
    layer: LayerWithImages;
    canvasWidth: number;
    canvasHeight: number;
    isSelected: boolean;
    onSelect: () => void;
    onUpdateTransform?: (
        layerId: string,
        transform: Partial<LayerWithImages['transform']>,
        options?: { recordHistory?: boolean }
    ) => void;
}) {
    const image = useManagedImage(layer.imageUrl);
    const keepRatio = useShiftKey();
    const shapeRef = useRef<any>(null);
    const rafRef = useRef<number | null>(null);
    const pendingTransformRef = useRef<Partial<LayerWithImages['transform']> | null>(null);

    // Initial positioning logic (only on first load if x/y are 0)
    // We don't want to override saved transform
    const imageAspect = image ? image.width / image.height : 1;
    const canvasAspect = canvasWidth / canvasHeight;

    // Calculate base dimensions (before transform)
    let baseWidth = canvasWidth;
    let baseHeight = canvasHeight;

    if (image) {
        if (imageAspect > canvasAspect) {
            baseHeight = canvasWidth / imageAspect;
        } else {
            baseWidth = canvasHeight * imageAspect;
        }
    }

    // Center offset
    const baseX = (canvasWidth - baseWidth) / 2;
    const baseY = (canvasHeight - baseHeight) / 2;
    const displayWidth = baseWidth * Math.abs(layer.transform.scaleX);
    const displayHeight = baseHeight * Math.abs(layer.transform.scaleY);
    const centerX = baseX + layer.transform.x + displayWidth / 2;
    const centerY = baseY + layer.transform.y + displayHeight / 2;

    useEffect(() => {
        return () => {
            if (rafRef.current !== null) {
                window.cancelAnimationFrame(rafRef.current);
            }
        };
    }, []);

    const scheduleTransformUpdate = (nextTransform: Partial<LayerWithImages['transform']>) => {
        if (!onUpdateTransform) return;
        pendingTransformRef.current = nextTransform;
        if (rafRef.current !== null) return;

        rafRef.current = window.requestAnimationFrame(() => {
            rafRef.current = null;
            if (!pendingTransformRef.current) return;
            onUpdateTransform(layer.id, pendingTransformRef.current, { recordHistory: false });
            pendingTransformRef.current = null;
        });
    };

    if (!image || !layer.visible) return null;

    return (
        <>
            <KonvaImage
                ref={shapeRef}
                image={image}
                x={baseX + layer.transform.x}
                y={baseY + layer.transform.y}
                width={baseWidth * Math.abs(layer.transform.scaleX)} // Absolute scale for drawing
                height={baseHeight * Math.abs(layer.transform.scaleY)}
                scaleX={Math.sign(layer.transform.scaleX)} // Handle flips
                scaleY={Math.sign(layer.transform.scaleY)}
                rotation={layer.transform.rotation}
                globalCompositeOperation={getCompositeOperation(layer.blendMode)}
                draggable={isSelected} // Only draggable if selected
                onClick={onSelect}
                onTap={onSelect}

                // Highlight when selected but not using Transformer (e.g. while dragging)
                // shadowEnabled={isSelected}
                // shadowColor="#154733"
                // shadowBlur={isSelected ? 10 : 0}
                // shadowOpacity={isSelected ? 0.5 : 0}

                // Drag End
                onDragEnd={(e) => {
                    if (onUpdateTransform) {
                        onUpdateTransform(layer.id, {
                            x: e.target.x() - baseX,
                            y: e.target.y() - baseY
                        });
                    }
                }}
                onDragMove={(e) => {
                    scheduleTransformUpdate({
                        x: e.target.x() - baseX,
                        y: e.target.y() - baseY
                    });
                }}

                // Transform End
                onTransformEnd={(e) => {
                    const node = shapeRef.current;
                    if (!node || !onUpdateTransform) return;

                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();

                    // Reset node scale to 1 (or -1 if flipped) to prevent compounding
                    // In Konva, scaling updates the scaleX/Y properties.
                    // We need to capture these and update our state, then reset if needed
                    // OR just sync state with node properties.

                    // Note: Transformer changes scaleX/scaleY directly on the node.
                    // We also need to capture rotation.

                    onUpdateTransform(layer.id, {
                        x: node.x() - baseX,
                        y: node.y() - baseY,

                        scaleX: scaleX,
                        scaleY: scaleY,
                        rotation: node.rotation()
                    });
                }}
                onTransform={() => {
                    const node = shapeRef.current;
                    if (!node) return;
                    scheduleTransformUpdate({
                        x: node.x() - baseX,
                        y: node.y() - baseY,
                        scaleX: node.scaleX(),
                        scaleY: node.scaleY(),
                        rotation: node.rotation()
                    });
                }}
            />
            {isSelected && (
                <Circle
                    x={centerX}
                    y={centerY}
                    radius={9}
                    fill="#0B1220"
                    stroke="#D1FAE5"
                    strokeWidth={2}
                    draggable
                    onDragMove={(e) => {
                        scheduleTransformUpdate({
                            x: e.target.x() - baseX - displayWidth / 2,
                            y: e.target.y() - baseY - displayHeight / 2
                        });
                    }}
                    onDragEnd={(e) => {
                        if (!onUpdateTransform) return;
                        onUpdateTransform(layer.id, {
                            x: e.target.x() - baseX - displayWidth / 2,
                            y: e.target.y() - baseY - displayHeight / 2
                        });
                    }}
                />
            )}
            <TransformHandles shapeRef={shapeRef} isSelected={isSelected} keepRatio={keepRatio} />
        </>
    );
}

export function ForgeCanvas({
    bodyPart,
    layers = [],
    selectedLayerId = null,
    onSelectLayer,
    onUpdateTransform,
    className = ''
}: ForgeCanvasProps) {
    const stageRef = useRef<any>(null);
    const { width, height, aspectRatio } = useCanvasAspectRatio(bodyPart);

    // Sort layers by z-index for proper rendering order
    const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

    const handleStageClick = (e: any) => {
        // If clicked on stage (not on a layer), deselect
        if (e.target === e.target.getStage()) {
            onSelectLayer?.(null);
        }
    };

    return (
        <div className={`flex items-center justify-center w-full h-full ${className}`}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={bodyPart}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="relative bg-black/20 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-glass-lg"
                    style={{
                        width: `${width}px`,
                        height: `${height}px`,
                        aspectRatio: `${aspectRatio}`,
                    }}
                >
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-0 forge-grid opacity-40" />
                        <div className="absolute inset-0 forge-scan opacity-30" />
                    </div>

                    {/* Silhouette overlay */}
                    <CanvasSilhouette bodyPart={bodyPart} opacity={0.12} />

                    {/* Konva Stage for layer rendering */}
                    <div className="absolute inset-0">
                        <Stage
                            ref={stageRef}
                            width={width}
                            height={height}
                            onClick={handleStageClick}
                            onTap={handleStageClick}
                        >
                            <KonvaLayer>
                                {sortedLayers.map((layer) => (
                                    <LayerImage
                                        key={layer.id}
                                        layer={layer}
                                        canvasWidth={width}
                                        canvasHeight={height}
                                        isSelected={layer.id === selectedLayerId}
                                        onSelect={() => onSelectLayer?.(layer.id)}
                                        onUpdateTransform={onUpdateTransform}
                                    />
                                ))}
                            </KonvaLayer>
                        </Stage>
                    </div>

                    {/* Placeholder when no layers */}
                    {layers.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center space-y-4 px-8">
                                <div className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/30">
                                    Canvas Ready
                                </div>
                                <p className="text-white/40 font-sans text-sm">
                                    Add a prompt or load a composition to begin.
                                </p>
                                <p className="text-white/20 font-mono text-xs">
                                    {width} × {height}px
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Corner indicators */}
                    <div className="absolute top-2 left-2 text-white/20 font-mono text-xs">
                        {aspectRatio.toFixed(2)}:1
                    </div>

                    {layers.length > 0 && (
                        <div className="absolute bottom-2 right-2 text-white/20 font-mono text-xs">
                            {layers.filter(l => l.visible).length}/{layers.length} visible
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

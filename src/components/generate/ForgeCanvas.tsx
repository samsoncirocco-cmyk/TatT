/**
 * ForgeCanvas - Enhanced with Konva Layer Management
 * 
 * Main canvas component with dynamic aspect ratio and layer rendering
 */

import { useRef, useEffect, useState } from 'react';
import { Stage, Layer as KonvaLayer, Image as KonvaImage, Transformer } from 'react-konva';
import { motion, AnimatePresence } from 'framer-motion';
import { BodyPart } from '../../constants/bodyPartAspectRatios';
import { useCanvasAspectRatio } from '../../hooks/useCanvasAspectRatio';
import { CanvasSilhouette } from './CanvasSilhouette';
import { Layer, getCompositeOperation } from '../../services/canvasService';

interface ForgeCanvasProps {
    bodyPart: BodyPart;
    layers?: Layer[];
    selectedLayerId?: string | null;
    onSelectLayer?: (layerId: string | null) => void;
    onUpdateTransform?: (layerId: string, transform: Partial<Layer['transform']>) => void;
    className?: string;
}

/**
 * Load image and return HTMLImageElement
 */
function useImage(url: string): HTMLImageElement | null {
    const [image, setImage] = useState<HTMLImageElement | null>(null);

    useEffect(() => {
        if (!url) {
            setImage(null);
            return;
        }

        const img = new window.Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            setImage(img);
        };

        img.onerror = (e) => {
            console.error('Failed to load image:', url, e);
            setImage(null);
        };

        img.src = url;

        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [url]);

    return image;
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
    layer: Layer;
    canvasWidth: number;
    canvasHeight: number;
    isSelected: boolean;
    onSelect: () => void;
    onUpdateTransform?: (layerId: string, transform: Partial<Layer['transform']>) => void;
}) {
    const image = useImage(layer.imageUrl);
    const shapeRef = useRef<any>(null);
    const trRef = useRef<any>(null);

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

    useEffect(() => {
        if (isSelected && trRef.current && shapeRef.current) {
            trRef.current.nodes([shapeRef.current]);
            trRef.current.getLayer().batchDraw();
        }
    }, [isSelected]);

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
            />
            {isSelected && (
                <Transformer
                    ref={trRef}
                    boundBoxFunc={(oldBox, newBox) => {
                        // Limit minimum size
                        if (newBox.width < 5 || newBox.height < 5) {
                            return oldBox;
                        }
                        return newBox;
                    }}
                    anchorStroke="#154733"
                    anchorFill="#D1FAE5"
                    anchorSize={10}
                    borderStroke="#154733"
                    borderDash={[4, 4]}
                    rotationSnaps={[0, 90, 180, 270]}
                />
            )}
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

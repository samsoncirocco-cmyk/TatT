/**
 * TransformHandles Component
 *
 * Konva Transformer wrapper for resize/rotate handles on selected layer.
 */

import { useEffect, useRef } from 'react';
import { Transformer } from 'react-konva';
import type Konva from 'konva';
import type React from 'react';

interface TransformHandlesProps {
    shapeRef: React.RefObject<Konva.Node>;
    isSelected: boolean;
    keepRatio?: boolean;
}

export default function TransformHandles({ shapeRef, isSelected, keepRatio = false }: TransformHandlesProps) {
    const transformerRef = useRef<Konva.Transformer | null>(null);

    useEffect(() => {
        if (!isSelected || !shapeRef.current || !transformerRef.current) return;
        transformerRef.current.nodes([shapeRef.current]);
        transformerRef.current.getLayer()?.batchDraw();
    }, [isSelected, shapeRef]);

    if (!isSelected) return null;

    return (
        <Transformer
            ref={transformerRef}
            keepRatio={keepRatio}
            enabledAnchors={[
                'top-left',
                'top-center',
                'top-right',
                'middle-left',
                'middle-right',
                'bottom-left',
                'bottom-center',
                'bottom-right'
            ]}
            rotateEnabled
            rotateAnchorOffset={28}
            anchorStroke="#154733"
            anchorFill="#D1FAE5"
            anchorSize={10}
            borderStroke="#154733"
            borderDash={[4, 4]}
            rotationSnaps={[0, 90, 180, 270]}
            boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 5 || newBox.height < 5) {
                    return oldBox;
                }
                return newBox;
            }}
        />
    );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { BodyPart, BODY_PART_CONFIGS } from "../constants/bodyPartAspectRatios";

interface CanvasDimensions {
    width: number;
    height: number;
    aspectRatio: number;
}

interface UseCanvasAspectRatioOptions {
    maxWidth?: number;
    maxHeight?: number;
    padding?: number;
}

/**
 * Custom hook to calculate canvas dimensions based on body part and viewport
 * Maintains anatomically-accurate aspect ratios while being responsive
 */
export function useCanvasAspectRatio(
    bodyPart: BodyPart,
    options: UseCanvasAspectRatioOptions = {}
): CanvasDimensions {
    const {
        maxWidth = 800,
        maxHeight = 900,
        padding = 40,
    } = options;

    const calculateDimensions = useCallback(
        (aspectRatio: number, maxW: number, maxH: number, pad: number): CanvasDimensions => {
            // Get viewport dimensions
            const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : maxW;
            const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : maxH;

            // Apply constraints
            const constrainedMaxWidth = Math.min(maxW, viewportWidth - pad * 2);
            const constrainedMaxHeight = Math.min(maxH, viewportHeight - pad * 2);

            let width: number;
            let height: number;

            // Calculate dimensions while maintaining aspect ratio
            if (constrainedMaxWidth / constrainedMaxHeight > aspectRatio) {
                // Height-constrained (canvas is taller relative to available space)
                height = constrainedMaxHeight;
                width = height * aspectRatio;
            } else {
                // Width-constrained (canvas is wider relative to available space)
                width = constrainedMaxWidth;
                height = width / aspectRatio;
            }

            return {
                width: Math.round(width),
                height: Math.round(height),
                aspectRatio,
            };
        },
        []
    );

    const [dimensions, setDimensions] = useState<CanvasDimensions>(() => {
        const config = BODY_PART_CONFIGS[bodyPart];
        return calculateDimensions(config.aspectRatio, maxWidth, maxHeight, padding);
    });

    // Update dimensions when body part changes
    useEffect(() => {
        const config = BODY_PART_CONFIGS[bodyPart];
        setDimensions(calculateDimensions(config.aspectRatio, maxWidth, maxHeight, padding));
    }, [bodyPart, maxWidth, maxHeight, padding, calculateDimensions]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            const config = BODY_PART_CONFIGS[bodyPart];
            setDimensions(calculateDimensions(config.aspectRatio, maxWidth, maxHeight, padding));
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [bodyPart, maxWidth, maxHeight, padding, calculateDimensions]);

    return dimensions;
}

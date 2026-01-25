"use client";

import { BodyPart } from "../../constants/bodyPartAspectRatios";
import { PlacementGrid } from "./PlacementGrid";

interface BodyPartSelectorProps {
    selectedBodyPart: BodyPart;
    onSelect: (bodyPart: BodyPart) => void;
    disabled?: boolean;
}

export function BodyPartSelector({
    selectedBodyPart,
    onSelect,
    disabled = false
}: BodyPartSelectorProps) {
    return (
        <PlacementGrid
            selectedBodyPart={selectedBodyPart}
            onSelect={onSelect}
            disabled={disabled}
        />
    );
}

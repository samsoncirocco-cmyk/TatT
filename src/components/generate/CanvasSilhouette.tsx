"use client";

import { motion } from "framer-motion";
import { BodyPart } from "../../constants/bodyPartAspectRatios";

interface CanvasSilhouetteProps {
    bodyPart: BodyPart;
    opacity?: number;
}

/**
 * CanvasSilhouette - Displays body part outline as canvas background
 * Provides spatial context for tattoo placement
 */
export function CanvasSilhouette({ bodyPart, opacity = 0.1 }: CanvasSilhouetteProps) {
    return (
        <motion.div
            key={bodyPart}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
        >
            {bodyPart === 'forearm' && <ForearmSilhouette opacity={opacity} />}
            {bodyPart === 'chest' && <ChestSilhouette opacity={opacity} />}
            {bodyPart === 'back' && <BackSilhouette opacity={opacity} />}
            {bodyPart === 'thigh' && <ThighSilhouette opacity={opacity} />}
            {bodyPart === 'shoulder' && <ShoulderSilhouette opacity={opacity} />}
            {bodyPart === 'full-sleeve' && <FullSleeveSilhouette opacity={opacity} />}
            {bodyPart === 'ribs' && <RibsSilhouette opacity={opacity} />}
            {bodyPart === 'calf' && <CalfSilhouette opacity={opacity} />}
        </motion.div>
    );
}

// Forearm Silhouette (1:3 aspect ratio)
function ForearmSilhouette({ opacity }: { opacity: number }) {
    return (
        <svg viewBox="0 0 100 300" className="w-full h-full">
            <path
                d="M 30,10 Q 25,10 25,15 L 20,150 Q 20,155 25,155 L 30,290 Q 30,295 35,295 L 65,295 Q 70,295 70,290 L 75,155 Q 80,155 80,150 L 75,15 Q 75,10 70,10 Z"
                fill={`rgba(0, 209, 255, ${opacity})`}
                stroke={`rgba(0, 209, 255, ${opacity * 2})`}
                strokeWidth="1"
            />
        </svg>
    );
}

// Chest Silhouette (4:5 aspect ratio)
function ChestSilhouette({ opacity }: { opacity: number }) {
    return (
        <svg viewBox="0 0 400 500" className="w-full h-full">
            <path
                d="M 50,50 Q 50,30 70,30 L 150,30 Q 170,30 180,50 L 200,100 L 220,50 Q 230,30 250,30 L 330,30 Q 350,30 350,50 L 350,200 Q 350,220 340,230 L 300,400 Q 295,420 280,430 L 200,470 L 120,430 Q 105,420 100,400 L 60,230 Q 50,220 50,200 Z"
                fill={`rgba(0, 209, 255, ${opacity})`}
                stroke={`rgba(0, 209, 255, ${opacity * 2})`}
                strokeWidth="2"
            />
        </svg>
    );
}

// Back Silhouette (3:4 aspect ratio)
function BackSilhouette({ opacity }: { opacity: number }) {
    return (
        <svg viewBox="0 0 300 400" className="w-full h-full">
            <path
                d="M 50,30 Q 50,20 60,20 L 100,20 Q 110,20 120,30 L 150,60 L 180,30 Q 190,20 200,20 L 240,20 Q 250,20 250,30 L 250,150 Q 250,160 245,170 L 220,350 Q 215,370 200,380 L 150,390 L 100,380 Q 85,370 80,350 L 55,170 Q 50,160 50,150 Z"
                fill={`rgba(0, 209, 255, ${opacity})`}
                stroke={`rgba(0, 209, 255, ${opacity * 2})`}
                strokeWidth="2"
            />
        </svg>
    );
}

// Thigh Silhouette (2:3 aspect ratio)
function ThighSilhouette({ opacity }: { opacity: number }) {
    return (
        <svg viewBox="0 0 200 300" className="w-full h-full">
            <path
                d="M 50,20 Q 45,20 45,25 L 40,150 Q 40,160 45,165 L 50,280 Q 50,290 55,290 L 145,290 Q 150,290 150,280 L 155,165 Q 160,160 160,150 L 155,25 Q 155,20 150,20 Z"
                fill={`rgba(0, 209, 255, ${opacity})`}
                stroke={`rgba(0, 209, 255, ${opacity * 2})`}
                strokeWidth="1.5"
            />
        </svg>
    );
}

// Shoulder Silhouette (1:1 aspect ratio)
function ShoulderSilhouette({ opacity }: { opacity: number }) {
    return (
        <svg viewBox="0 0 300 300" className="w-full h-full">
            <circle
                cx="150"
                cy="150"
                r="120"
                fill={`rgba(0, 209, 255, ${opacity})`}
                stroke={`rgba(0, 209, 255, ${opacity * 2})`}
                strokeWidth="2"
            />
            <path
                d="M 150,30 Q 120,40 100,70 L 80,120 Q 70,150 80,180 L 100,230 Q 120,260 150,270 Q 180,260 200,230 L 220,180 Q 230,150 220,120 L 200,70 Q 180,40 150,30 Z"
                fill={`rgba(0, 209, 255, ${opacity * 0.5})`}
                stroke="none"
            />
        </svg>
    );
}

// Full Sleeve Silhouette (1:4 aspect ratio)
function FullSleeveSilhouette({ opacity }: { opacity: number }) {
    return (
        <svg viewBox="0 0 100 400" className="w-full h-full">
            <path
                d="M 30,10 Q 25,10 25,15 L 20,200 Q 20,210 25,215 L 30,390 Q 30,395 35,395 L 65,395 Q 70,395 70,390 L 75,215 Q 80,210 80,200 L 75,15 Q 75,10 70,10 Z"
                fill={`rgba(0, 209, 255, ${opacity})`}
                stroke={`rgba(0, 209, 255, ${opacity * 2})`}
                strokeWidth="1"
            />
        </svg>
    );
}

// Ribs Silhouette (2:3 aspect ratio)
function RibsSilhouette({ opacity }: { opacity: number }) {
    return (
        <svg viewBox="0 0 200 300" className="w-full h-full">
            <path
                d="M 40,30 Q 35,30 35,35 L 30,150 Q 30,160 35,165 L 40,270 Q 40,280 45,280 L 155,280 Q 160,280 160,270 L 165,165 Q 170,160 170,150 L 165,35 Q 165,30 160,30 Z"
                fill={`rgba(0, 209, 255, ${opacity})`}
                stroke={`rgba(0, 209, 255, ${opacity * 2})`}
                strokeWidth="1.5"
            />
            {/* Rib lines for detail */}
            {[50, 80, 110, 140, 170, 200, 230].map((y, i) => (
                <line
                    key={i}
                    x1="50"
                    y1={y}
                    x2="150"
                    y2={y}
                    stroke={`rgba(0, 209, 255, ${opacity * 0.5})`}
                    strokeWidth="0.5"
                />
            ))}
        </svg>
    );
}

// Calf Silhouette (1:2.5 aspect ratio)
function CalfSilhouette({ opacity }: { opacity: number }) {
    return (
        <svg viewBox="0 0 100 250" className="w-full h-full">
            <path
                d="M 35,10 Q 30,10 30,15 L 25,120 Q 25,130 30,135 L 35,240 Q 35,245 40,245 L 60,245 Q 65,245 65,240 L 70,135 Q 75,130 75,120 L 70,15 Q 70,10 65,10 Z"
                fill={`rgba(0, 209, 255, ${opacity})`}
                stroke={`rgba(0, 209, 255, ${opacity * 2})`}
                strokeWidth="1"
            />
        </svg>
    );
}

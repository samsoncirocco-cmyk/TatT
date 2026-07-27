"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CollapsibleSidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
    width?: number;
    children: ReactNode;
}

export default function CollapsibleSidebar({
    isCollapsed,
    onToggle,
    width = 320,
    children,
}: CollapsibleSidebarProps) {
    return (
        <div className="relative">
            <button
                type="button"
                onClick={onToggle}
                className="absolute top-4 -left-10 z-20 flex h-8 w-8 items-center justify-center rounded-l border border-white/10 bg-black/60 text-white/70 hover:text-white"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                {isCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
            <motion.div
                className="overflow-hidden"
                animate={{ width: isCollapsed ? 0 : width, opacity: isCollapsed ? 0 : 1 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
            >
                <div style={{ width }} className="min-w-0">
                    {children}
                </div>
            </motion.div>
        </div>
    );
}

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

export const FadeIn = ({ children, delay = 0, duration = 0.5, className = '' }: { children: ReactNode, delay?: number, duration?: number, className?: string }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration, delay }}
        className={className}
    >
        {children}
    </motion.div>
);

export const SlideUp = ({ children, delay = 0, className = '' }: { children: ReactNode, delay?: number, className?: string }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5, delay, ease: "easeOut" }}
        className={className}
    >
        {children}
    </motion.div>
);

export const ScaleIn = ({ children, delay = 0, className = '' }: { children: ReactNode, delay?: number, className?: string }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.4, delay }}
        className={className}
    >
        {children}
    </motion.div>
);

export const Pulse = ({ children, className = '' }: { children: ReactNode, className?: string }) => (
    <motion.div
        animate={{
            scale: [1, 1.02, 1],
            opacity: [1, 0.8, 1]
        }}
        transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
        }}
        className={className}
    >
        {children}
    </motion.div>
);

import { motion, type HTMLMotionProps } from 'framer-motion';
import { type ReactNode } from 'react';

type CardVariant = 'default' | 'glass' | 'elevated';

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
    children: ReactNode;
    className?: string;
    hover?: boolean;
    variant?: CardVariant;
}

const variantStyles: Record<CardVariant, string> = {
    default: 'bg-[var(--bg-surface)] border-white/[0.05]',
    glass: 'studio-glass',
    elevated: 'bg-[var(--bg-elevated)] border-white/[0.08] shadow-[0_10px_28px_-6px_rgba(0,0,0,0.55)]'
};

const Card = ({
    children,
    className = '',
    hover = false,
    variant = 'default',
    ...props
}: CardProps) => {
    return (
        <motion.div
            initial={false}
            whileHover={hover ? {
                y: -4,
                transition: { duration: 0.2, ease: 'easeOut' }
            } : {}}
            className={`
                relative overflow-hidden rounded-2xl p-6
                border transition-all duration-200
                ${variantStyles[variant]}
                ${hover ? 'cursor-pointer hover:border-white/20' : ''}
                ${className}
            `}
            {...props}
        >
            {/* Subtle top highlight */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Content with proper z-index */}
            <div className="relative z-10">
                {children}
            </div>
        </motion.div>
    );
};

export default Card;
export type { CardProps, CardVariant };

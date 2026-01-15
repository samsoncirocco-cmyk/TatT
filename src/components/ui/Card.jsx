import { motion } from 'framer-motion';

const Card = ({
    children,
    className = '',
    hover = false,
    variant = 'default',
    ...props
}) => {
    const variants = {
        default: 'bg-[#0A0A0A] border-white/8',
        glass: 'glass-panel',
        elevated: 'bg-[#141414] border-white/10 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.5)]'
    };

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
                ${variants[variant]}
                ${hover ? 'cursor-pointer hover:border-white/20' : ''}
                ${className}
            `}
            {...props}
        >
            {/* Subtle top highlight */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

            {/* Content with proper z-index */}
            <div className="relative z-10">
                {children}
            </div>
        </motion.div>
    );
};

export default Card;

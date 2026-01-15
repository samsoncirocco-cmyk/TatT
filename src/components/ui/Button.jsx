import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const variants = {
    primary: `
        bg-ducks-yellow text-black font-black
        border border-ducks-yellow
        hover:bg-white hover:border-white
        active:bg-ducks-yellow/90
        shadow-[0_4px_14px_0_rgba(254,225,35,0.3)]
        hover:shadow-[0_6px_20px_0_rgba(254,225,35,0.4)]
    `,
    secondary: `
        bg-ducks-green text-white font-bold
        border border-ducks-green
        hover:bg-ducks-green/90 hover:border-ducks-green/90
        active:bg-ducks-green/80
        shadow-[0_4px_14px_0_rgba(21,71,51,0.3)]
        hover:shadow-[0_6px_20px_0_rgba(21,71,51,0.4)]
    `,
    outline: `
        bg-transparent text-white font-bold
        border border-white/20
        hover:bg-white/10 hover:border-white/40
        active:bg-white/5
    `,
    ghost: `
        bg-transparent text-gray-400 font-medium
        border border-transparent
        hover:text-white hover:bg-white/5
        active:bg-white/10
    `,
    danger: `
        bg-red-500/10 text-red-400 font-bold
        border border-red-500/30
        hover:bg-red-500/20 hover:border-red-500/50
        active:bg-red-500/30
    `
};

const sizes = {
    sm: "h-8 px-3 text-xs gap-1.5",
    md: "h-11 px-5 text-sm gap-2",
    lg: "h-14 px-7 text-base gap-2.5"
};

const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    isLoading = false,
    disabled = false,
    icon: Icon,
    ...props
}) => {
    return (
        <motion.button
            whileHover={!disabled && !isLoading ? { scale: 1.02 } : {}}
            whileTap={!disabled && !isLoading ? { scale: 0.98 } : {}}
            className={`
                relative inline-flex items-center justify-center
                font-display uppercase tracking-wider rounded-xl
                transition-all duration-200
                disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ducks-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-black
                ${variants[variant]} ${sizes[size]} ${className}
            `}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" aria-label="Loading" />}
            {!isLoading && Icon && <Icon className="w-4 h-4" aria-hidden="true" />}
            <span>{children}</span>
        </motion.button>
    );
};

export default Button;

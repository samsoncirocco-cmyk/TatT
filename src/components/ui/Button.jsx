import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const variants = {
    primary: "bg-ducks-yellow text-background shadow-glow hover:shadow-glow-active border-transparent",
    secondary: "glass-panel text-ducks-yellow border-ducks-green/30 hover:border-ducks-green hover:shadow-glow-green",
    ghost: "bg-transparent text-gray-400 hover:text-white border-transparent hover:bg-white/5",
    danger: "bg-red-500/10 text-red-500 border-red-500/50 hover:bg-red-500/20"
};

const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base"
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
        relative flex items-center justify-center gap-2 
        font-display font-bold uppercase tracking-wider rounded-xl transition-all duration-200 border
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {!isLoading && Icon && <Icon className="w-4 h-4" />}
            {children}
        </motion.button>
    );
};

export default Button;

import { motion, type HTMLMotionProps } from 'framer-motion';
import { Loader2, type LucideIcon } from 'lucide-react';
import { type ReactNode, forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
    children: ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
    className?: string;
    isLoading?: boolean;
    disabled?: boolean;
    icon?: LucideIcon;
}

const variants: Record<ButtonVariant, string> = {
    primary: `
        bg-studio-accent text-white font-bold
        border border-[rgba(255,62,0,0.8)]
        hover:bg-[rgba(255,62,0,0.9)] hover:border-studio-accent
        active:bg-[rgba(255,62,0,0.8)]
        shadow-[0_6px_18px_0_rgba(255,62,0,0.35)]
        hover:shadow-[0_8px_24px_0_rgba(255,62,0,0.45)]
    `,
    secondary: `
        bg-studio-neon text-black font-bold
        border border-[rgba(0,255,65,0.7)]
        hover:bg-[rgba(0,255,65,0.9)] hover:border-studio-neon
        active:bg-[rgba(0,255,65,0.8)]
        shadow-[0_6px_18px_0_rgba(0,255,65,0.3)]
        hover:shadow-[0_8px_24px_0_rgba(0,255,65,0.45)]
    `,
    outline: `
        bg-transparent text-white font-bold
        border border-white/15
        hover:bg-white/10 hover:border-white/30
        active:bg-white/5
    `,
    ghost: `
        bg-transparent text-white/60 font-medium
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

const sizes: Record<ButtonSize, string> = {
    sm: "h-8 px-3 text-xs gap-1.5",
    md: "h-11 px-5 text-sm gap-2",
    lg: "h-14 px-7 text-base gap-2.5"
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    isLoading = false,
    disabled = false,
    icon: Icon,
    ...props
}, ref) => {
    const isDisabled = disabled || isLoading;
    
    return (
        <motion.button
            ref={ref}
            whileHover={!isDisabled ? { scale: 1.02 } : {}}
            whileTap={!isDisabled ? { scale: 0.98 } : {}}
            className={`
                relative inline-flex items-center justify-center
                font-display uppercase tracking-wider rounded-xl
                transition-all duration-200
                disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-neon focus-visible:ring-offset-2 focus-visible:ring-offset-studio-bg
                ${variants[variant]} ${sizes[size]} ${className}
            `}
            disabled={isDisabled}
            {...props}
        >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" aria-label="Loading" />}
            {!isLoading && Icon && <Icon className="w-4 h-4" aria-hidden="true" />}
            <span>{children}</span>
        </motion.button>
    );
});

Button.displayName = 'Button';

export default Button;
export type { ButtonProps, ButtonVariant, ButtonSize };

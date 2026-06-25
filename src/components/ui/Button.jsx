import { Loader2 } from 'lucide-react';

// Punk-system Button. Hard edges, hairline borders, no gradients, no glow.
// `primary` is reserved as the emergency-tape CTA (one per screen ideally).
const variants = {
    primary: `
        tape text-black
    `,
    secondary: `
        bg-black text-white border-2 hairline
        hover:bg-pink hover:text-black hover:border-pink
        active:bg-pink-deep
    `,
    outline: `
        bg-transparent text-white border hairline-white
        hover:bg-pink hover:text-black hover:border-pink
        active:bg-pink-deep active:text-black
    `,
    ghost: `
        bg-transparent text-white/60 border border-transparent
        hover:text-pink hover:bg-white/5
        active:bg-white/10
    `,
    danger: `
        bg-black text-pink border-2 border-pink
        hover:bg-pink hover:text-black
        active:bg-pink-deep
    `
};

const sizes = {
    sm: "h-8 px-3 text-[10px] gap-1.5 tracking-[0.2em]",
    md: "h-11 px-5 text-[12px] gap-2 tracking-[0.22em]",
    lg: "h-14 px-7 text-[14px] gap-2.5 tracking-[0.24em]"
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
        <button
            className={`
                press relative inline-flex items-center justify-center
                font-display uppercase leading-none
                transition-colors duration-150
                disabled:opacity-40 disabled:cursor-not-allowed
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 focus-visible:ring-offset-black
                ${variants[variant]} ${sizes[size]} ${className}
            `}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" aria-label="Loading" />}
            {!isLoading && Icon && <Icon className="w-4 h-4" aria-hidden="true" />}
            <span>{children}</span>
        </button>
    );
};

export default Button;

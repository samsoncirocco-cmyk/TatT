import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: ReactNode;
    className?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
    {
        label,
        id,
        name,
        type = 'text',
        className = '',
        ...props
    },
    ref
) {
    const inputId = id || name;

    return (
        <label className="flex flex-col gap-2">
            {label && (
                <span className="text-[11px] font-display uppercase tracking-[0.3em] text-white/60">
                    {label}
                </span>
            )}
            <input
                ref={ref}
                id={inputId}
                name={name}
                type={type}
                className={`
                    w-full rounded-xl border border-white/[0.05] bg-[var(--studio-bg)]
                    px-4 py-3 text-sm text-white font-mono
                    placeholder:text-white/30
                    focus-visible:outline-none focus-visible:border-studio-neon
                    focus-visible:shadow-[0_0_14px_rgba(0,255,65,0.35)]
                    disabled:cursor-not-allowed disabled:opacity-50
                    ${className}
                `}
                {...props}
            />
        </label>
    );
});

Input.displayName = 'Input';

export default Input;
export type { InputProps };

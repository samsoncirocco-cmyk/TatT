"use client";

/**
 * Punk form field — mono micro-label above a hard 2px-bordered input,
 * pink on focus. The form-input pattern from the site-redesign handoff;
 * used by Sign Up, Log In, and Settings.
 *
 * `quiet` (ADR-0032): the calm register's version — sentence-case label,
 * warm-gray hairline, body type, no pink.
 */
type Props = {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  /** Rendered right-aligned next to the label (e.g. a "Forgot?" link). */
  labelAside?: React.ReactNode;
  quiet?: boolean;
};

export default function FormField({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  labelAside,
  quiet = false,
}: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label
          htmlFor={id}
          className={
            quiet
              ? "block text-[12px] text-quiet-dim font-body"
              : "block text-[10px] uppercase tracking-[0.24em] text-white/55 font-body"
          }
        >
          {label}
        </label>
        {labelAside}
      </div>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={
          quiet
            ? "w-full bg-black text-quiet placeholder-white/30 focus:outline-none text-[16px] leading-[1.4] border hairline-quiet-soft focus:border-quiet p-4 transition-colors font-body"
            : "w-full bg-black text-white placeholder-white/30 focus:outline-none text-[20px] leading-[1.4] tracking-tight border-2 hairline focus:border-pink p-4 transition-colors font-display"
        }
      />
    </div>
  );
}

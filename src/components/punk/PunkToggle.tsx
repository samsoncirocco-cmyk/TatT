"use client";

/**
 * Toggle switch — the missing pattern from DESIGN_SYSTEM.md. Hard
 * 52×26 rectangle (no radius), ON = pink with the knob pushed right,
 * OFF = white/15. Hard cut, no easing beyond the press affordance.
 */
type Props = {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
};

export default function PunkToggle({ id, label, description, checked, onChange }: Props) {
  return (
    <div className="flex items-center justify-between gap-6 py-4 border-b hairline-soft last:border-b-0">
      <label htmlFor={id} className="cursor-pointer">
        <div className="text-[11px] uppercase tracking-[0.22em] text-white font-body">
          {label}
        </div>
        {description && (
          <p className="mt-1 text-[11px] leading-[1.5] text-white/50 font-body">
            {description}
          </p>
        )}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative w-[52px] h-[26px] shrink-0 press ${
          checked ? "bg-pink" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-[3px] w-[20px] h-[20px] bg-black transition-none ${
            checked ? "right-[3px]" : "left-[3px]"
          }`}
        />
      </button>
    </div>
  );
}

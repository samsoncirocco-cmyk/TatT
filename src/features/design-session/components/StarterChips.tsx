'use client';

/**
 * First-run idea starters for the empty design session — the scaffolding a
 * TikTok first-timer gets instead of a blank box. Each chip is nothing more
 * than a prefilled first message: tapping one sends its text through the
 * exact same path as typing it, so the conversation engine's own routing
 * decides what happens next (intake follow-ups for the vague ones, ADR-0019;
 * fast lane only if the engine judges it complete, ADR-0028). No separate
 * code path, no client-side routing.
 *
 * The chips are deliberately underspecified — none carries placement or
 * meaning, so they feed INTO the bot's opening questions rather than
 * replacing them. Voice: loud register, lowercase-comfortable (ADR-0035).
 */
export const STARTER_CHIPS = [
  'fine-line florals',
  'a memorial piece for someone',
  'something from my favorite album',
  'geometric sleeve fragment',
  'my first tattoo — something small',
  'surprise me',
] as const;

// The stakes-lowering line above the chips. One line, loud voice.
export const STARTER_LINE = 'no idea yet? that’s the point. tap something or just talk.';

export function StarterChips({
  onPick,
  disabled = false,
}: {
  onPick: (text: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="font-body text-[13px] leading-[1.55] text-white/50">{STARTER_LINE}</p>
      <div className="flex flex-wrap gap-2">
        {STARTER_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            disabled={disabled}
            onClick={() => onPick(chip)}
            className="press min-h-[44px] border hairline-white px-4 py-2.5 font-body text-[13px] text-white/80 hover:bg-pink hover:text-black hover:border-pink disabled:opacity-40"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}

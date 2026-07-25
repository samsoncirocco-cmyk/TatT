'use client';

import { ChatInput } from './ChatInput';

/**
 * A binary refinement question ("Bolder lines or keep them fine?") renders
 * as two tappable choices; anything else falls back to free text. Kept
 * deliberately dumb — the question's phrasing is the server's job.
 */
export function parseBinaryChoices(question: string): [string, string] | null {
  const stripped = question.trim().replace(/\?+$/, '');
  const match = stripped.match(/^(.{1,60}?),?\s+or\s+(.{1,60})$/i);
  if (!match) return null;
  const a = match[1].trim();
  const b = match[2].trim();
  if (!a || !b || a.includes(',') || b.includes(',')) return null;
  return [a, b];
}

/** The single refinement reply (ADR-0013: one round, then hard stop). */
export function RefinementPrompt({
  question,
  onAnswer,
  disabled = false,
}: {
  question: string;
  onAnswer: (answer: string) => void;
  disabled?: boolean;
}) {
  const choices = parseBinaryChoices(question);

  if (choices) {
    return (
      <div className="flex flex-wrap gap-3">
        {choices.map((choice) => (
          <button
            key={choice}
            type="button"
            disabled={disabled}
            onClick={() => onAnswer(choice)}
            className="press font-body text-[10px] uppercase tracking-[0.2em] text-white/70 hover:text-black hover:bg-pink border hairline px-3 py-2 disabled:opacity-40"
          >
            {choice}
          </button>
        ))}
      </div>
    );
  }

  return (
    <ChatInput
      placeholder="Tell it straight…"
      ariaLabel="Your refinement answer"
      onSubmit={onAnswer}
      disabled={disabled}
    />
  );
}

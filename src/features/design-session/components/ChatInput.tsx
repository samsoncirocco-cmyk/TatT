'use client';

import { useState, type FormEvent } from 'react';

/**
 * Free-text reply line for the conversation. Space Mono body text — the
 * design system has no form-input pattern yet, so this stays minimal:
 * hairline border, pink focus, hard edges.
 */
export function ChatInput({
  placeholder,
  ariaLabel,
  onSubmit,
  disabled = false,
}: {
  placeholder: string;
  ariaLabel: string;
  onSubmit: (text: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = value.trim();
    if (!text || disabled) return;
    onSubmit(text);
    setValue('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        disabled={disabled}
        className="flex-1 min-w-0 bg-transparent border hairline-white px-4 py-3 font-body text-[15px] text-white placeholder:text-white/30 focus:outline-none focus:border-pink"
      />
      <button
        type="submit"
        disabled={disabled}
        className="press bg-pink text-black font-display text-[16px] tracking-[0.02em] uppercase px-5 py-3 disabled:opacity-40"
      >
        Send&nbsp;▸
      </button>
    </form>
  );
}

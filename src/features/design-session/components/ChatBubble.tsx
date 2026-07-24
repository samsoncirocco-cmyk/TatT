import type { ReactNode } from 'react';

/**
 * One turn of the design-session conversation. Intake is chat, never a
 * labeled form (ADR-0009) — the bot speaks from the left, the first-timer
 * answers from the right. Hard edges only (design system: no radii).
 */
export function ChatBubble({
  role,
  children,
}: {
  role: 'bot' | 'user';
  children: ReactNode;
}) {
  const isBot = role === 'bot';
  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[85%] px-4 py-3 font-body text-[14px] leading-[1.55] ${
          isBot
            ? 'border hairline-soft bg-white/[0.03] text-white/90'
            : 'bg-pink text-black'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

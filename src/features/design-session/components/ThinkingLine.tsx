/**
 * The bot's working state — a simple animated line while a session call is
 * in flight. Once the real response lands, the flow swaps this for the
 * Council's logged axis rationale (ADR-0012: selection is never silent).
 */
export function ThinkingLine({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-label="Working"
      className="flex items-center gap-3 font-body text-[10px] uppercase tracking-[0.28em] text-white/50"
    >
      <span className="text-pink animate-pulse">●</span>
      <span className="animate-pulse">{label}…</span>
    </div>
  );
}

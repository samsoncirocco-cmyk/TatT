/**
 * Gear 2 — plain-language tools, one tap deeper (ADR-0038).
 *
 * For someone who knows exactly what they want and doesn't feel like typing
 * it. Nothing new happens here: three of the four seed gear 1's own box with
 * the words the user would have typed (routing through the same inpainting
 * pipeline, the same budget), and undo is the canvas history already in place.
 *
 * Visible, but never crowding gear 1 — one quiet row under the canvas.
 */

const TOOLS = [
    {
        id: 'redraw',
        label: 'redraw area',
        instruction: ''
    },
    {
        id: 'erase',
        label: 'erase',
        instruction: 'erase this — leave clean empty space behind, no new detail'
    },
    {
        id: 'resize',
        label: 'resize part',
        instruction: 'make this part bigger, keep everything around it the same'
    }
];

export default function PlainToolsRow({ onSeed, onUndo, canUndo = false, disabled = false }) {
    return (
        <div
            data-testid="plain-tools"
            role="group"
            aria-label="Plain-language tools"
            className="flex flex-wrap gap-2"
        >
            {TOOLS.map((tool) => (
                <button
                    key={tool.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSeed?.({ id: tool.id, instruction: tool.instruction })}
                    className="press min-h-[44px] px-4 border hairline-white font-body text-[11px] lowercase tracking-[0.18em] text-white/70 hover:text-black hover:bg-pink hover:border-pink disabled:opacity-40"
                >
                    {tool.label}
                </button>
            ))}
            <button
                type="button"
                disabled={disabled || !canUndo}
                onClick={onUndo}
                className="press min-h-[44px] px-4 border hairline-white font-body text-[11px] lowercase tracking-[0.18em] text-white/70 hover:text-black hover:bg-pink hover:border-pink disabled:opacity-40"
            >
                undo
            </button>
        </div>
    );
}

export { TOOLS as PLAIN_TOOLS };

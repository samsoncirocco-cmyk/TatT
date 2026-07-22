# Bot prompt construction extends the Council

The autonomous design bot adds a Council mode that accepts the structured intake record (closed style tags + placement + freeform meaning) and emits four axis-divergent enhanced prompts with negatives. With structured input, the Council's enhancement job shifts from interpretation ("Goku fighting Trunks" → usable prompt) to axis differentiation — all existing prompt craft, provider fallbacks, and caching stay. Extends ADR-0002.

## Considered Options

- **Replace the Council** — rejected: a rewrite with active blast radius across its live consumers (API route, health probe, UI).
- **Bypass it with a separate bot prompt constructor** — rejected: two prompt builders drift apart; the vocabulary problem restated for prompts.

## Consequences

The Council's discussion-update callback becomes the bot's narration channel — axis-selection logging (ADR-0012) and placement-tradeoff talk (ADR-0014) flow through one maintained place.

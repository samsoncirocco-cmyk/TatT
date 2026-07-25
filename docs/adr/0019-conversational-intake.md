# Conversational intake supersedes the two-turn script

The design bot's intake becomes a genuine LLM-driven conversation (the TalkToVeri shape: the chat is the interface, and the structured record is built as a side effect). The bot still opens on placement and meaning — ADR-0009's insight about where the signal lives survives — but reacts, asks follow-ups, and chases threads ("a memorial for your dad — what did he love?") while filling the intake record turn by turn. Supersedes ADR-0009's two-turn mechanism.

## Considered Options

- **Fully open conversation** (no steering) — rejected: tattoo sessions have a destination movie-chat doesn't; an unsteered chat can run ten turns without learning placement, which is a hard generation constraint.
- **Hard placement/meaning gate over free chat** — rejected in favor of steering: leading with the two openers gets the constraint early without feeling like a form.

## Consequences

The conversation LLM runs behind a council-style provider fallback chain (Vertex Gemini → OpenRouter) so a live model is effectively always available. If every provider is down, the flow degrades gracefully to the v1 scripted two-question intake (ADR-0009 code stays load-bearing as the degraded mode); demo mode uses a short deterministic script, never a live model.

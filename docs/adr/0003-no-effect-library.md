# Plain TypeScript modules instead of the Effect library

The article that prompted this refactor recommended Effect for enforcing module
boundaries, and its typed errors and built-in retry/fallback vocabulary would
genuinely fit the generation pipeline. We rejected it: Effect is infectious
(callers of an Effect function must also speak Effect), reads foreign to AI
agents (which cuts against our primary goal of an agent-safe codebase), and adds
translation layers at every promise-based boundary (Next.js, Firebase, Vercel
Edge). Plain TypeScript modules with explicit interfaces give most of the
benefit with no framework lock-in. Revisit only if plain modules prove too weak
in practice.

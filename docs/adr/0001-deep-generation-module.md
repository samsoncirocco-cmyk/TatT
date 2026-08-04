# One deep generation module with a single public entry point

The generation stack was seven interdependent shallow files (`generationService`,
`generationRouter`, `replicateService`, three Vertex variants, `councilService`)
that callers imported directly, making changes risky for humans and AI agents
alike. We decided to collapse it into one `generation` module with a single
public entry point; Replicate and Vertex become hidden internals behind a shared
provider interface, and everything inside the module is TypeScript so the
boundary is compiler-enforced.

## Considered Options

- Thin gateway file over the existing modules (boundaries by convention only) — rejected: nothing stops direct imports
- Merging only the three Vertex files (minimal dedupe) — rejected: leaves the module web intact

## Amendment: two public entries, split by bundling target (2026-08-04)

The single entry point held until webpack met it. `routeGeneration` is pure —
no I/O — and `index.ts` exports it so feature code can preview which model a
request would get without generating anything. But importing it *from the
barrel* pulls `index.ts` in behind it, and `index.ts` imports both providers.
The Studio page is a client component, so it had been bundling the entire
server generation module invisibly for as long as it has imported
`replicateService`.

That surfaced as a build failure the day something in the chain first needed a
node-only module — the render text guard (#297) imports the budget tracker,
which imports `node:crypto`, which webpack cannot resolve for the browser:

```
node:crypto -> src/lib/budget-tracker.ts -> generation/internal/textGuard.ts
  -> generation/index.ts -> features/generate/services/replicateService.js
  -> components/generate/AdvancedOptions.jsx -> features/Generate.jsx
  -> app/studio/page.tsx
```

So the module now has **two** public entries, split by where the importer runs:
`index.ts` is the server entry and may reach anything; `routing.ts` is the
client-safe entry and carries only the pure routing helper and the types.
`internal/` stays private to both, and the original argument is unchanged —
this is not a return to boundaries by convention, it is one more compiler-
checked boundary drawn along the line webpack already enforces.

Recorded because an unrecorded exception to a recorded decision invites a
future cleanup to collapse the two entries back into one and silently restore
the leak. If that ever looks tempting, the import trace above is the reason it
is not.

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

# Spec: Deep Generation Module

Status: ready-for-agent
Source: architecture grill session 2026-07-20 (ADRs 0001–0003) + caller census.

## Problem Statement

Generating a tattoo design currently flows through four overlapping Imagen
implementations, a Replicate service that lives in two places, and routing
logic split across three layers. Nobody — human or AI agent — can change how
generation works without understanding seven files and their hidden callers,
and almost none of it is tested. Bugs here burn metered API spend.

## Solution

One deep **Generation** module with a single public entry point. Callers say
"generate this design"; the module privately decides which **Provider**
(Replicate SDXL or Vertex Imagen) runs, handles retries and fallback, and
returns images. **Council** (prompt enhancement) becomes its own small module
that Generation and the API routes call through one entry point. Everything
else in the app imports only these two entry points.

## User Stories

1. As a user, I want my design request to produce images without me knowing which AI backend ran, so that generation "just works".
2. As a user, I want generation to automatically fall back to another provider when one fails, so that transient outages don't break my flow.
3. As a user, I want my prompt enhanced by the Council before generation, so that my rough idea produces better designs.
4. As a developer, I want one function to call for generation, so that I never have to pick between four Imagen clients.
5. As a developer, I want the provider choice expressed in one place, so that routing changes are one-file edits.
6. As a developer, I want compile errors when I misuse the generation interface, so that mistakes surface before runtime.
7. As an AI agent, I want the module boundary enforced by TypeScript, so that my changes can't silently reach into internals.
8. As an AI agent, I want tests at the module seam, so that I know immediately whether my change broke behavior.
9. As a maintainer, I want the duplicate Imagen/Replicate/embedding files deleted, so that there is exactly one implementation to maintain.
10. As a maintainer, I want telemetry and retry behavior preserved from the current `generateWithRetry`, so that hardening isn't lost in the refactor.
11. As an operator, I want Edge-runtime routes to keep working, so that deployment characteristics don't change.
12. As an operator, I want cost-relevant behavior (model choice, output count) unchanged by default, so that the refactor doesn't alter spend.

## Implementation Decisions

- New module `generation` with a single public entry point `generate(request)`; internals (providers, routing, retry, fallback) are not exported (ADR-0001).
- A **Provider** is an internal interface with two implementations: Replicate (SDXL variants) and Vertex Imagen. Provider selection ports the existing `routeGeneration` logic (style/mode/stencil → model → provider) into the module.
- Fallback chain preserved: Vertex failure falls back to Replicate when allowed, with the retry/backoff + relaxed-safety behavior currently in `generateWithRetry`, including its telemetry events.
- Both Node and Edge runtimes must be supported; auth strategy is injected per runtime rather than baked into providers (the Edge route uses the access-token helper, Node uses the Google auth library).
- `council` becomes its own module with entry point `enhance(request)` (ADR-0002); the existing `councilService` implementation moves inside it. The inline council pipeline in the v1 council generate route is a known duplicate to be absorbed or explicitly deprecated.
- All module internals are TypeScript; no Effect (ADR-0003).
- API routes (`/api/generate`, `/api/v1/generate`, `/api/v1/tasks/generate`) become thin adapters over `generate()`; council routes become thin adapters over `enhance()`.
- Expand–contract sequencing: new module lands beside old files; callers migrate; old files (`generationService`, `generationRouter`, `vertex-ai-edge` generation path, `lib/vertex-imagen-client`, the `replicateService` shim) are deleted only in the final contract step.
- Embedding functionality inside `vertex-ai-service.js` / `vertex-embedding-service.ts` is NOT part of the generation module — it stays put for the later matching/data deepening (see todolist).

## Testing Decisions

- Tests live at the module seam: call `generate()` / `enhance()` with mocked external HTTP (Replicate/Vertex/Gemini), assert returned images/prompts and provider selection — never internal function calls.
- Each ticket lands with its tests (piece-by-piece decision from the grill; no big upfront suite).
- Routing logic (pure) gets direct unit tests — it's the cheapest high-value coverage in the stack.
- Prior art: `src/services/councilService.test.js` and `src/test/services/replicateService.test.js` show the existing vitest + mock patterns.
- `npm test` and `npm run build` must pass at every ticket boundary.

## Out of Scope

- Embeddings (text and image), Vision-based layer decomposition, and the matching stack — later todolist items.
- Any behavior change: model defaults, output counts, safety settings, and API response shapes stay as-is.
- UI changes beyond import-path updates.
- The data/schema layer cleanup.

## Further Notes

- Caller census (2026-07-20): four Imagen implementations hit the same
  `imagen-3.0-generate-001:predict` endpoint; only `generateWithRetry` has
  retry/telemetry — that one is the porting source of truth.
- `vertex-embedding-service.ts` has a single importer (a seed script) and is
  likely dead; flagged for the later embeddings pass, not deleted here.

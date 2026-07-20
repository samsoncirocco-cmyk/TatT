# 04 — Council module with single entry point

**What to build:** Prompt enhancement is reachable only through the new
`council` module's `enhance(request)` entry point (ADR-0002). The existing
`councilService` implementation moves inside the module (stays TypeScript);
the enhance/health API routes and UI components (`PromptEnhancer`,
`GenerateContent`, `Generate.jsx`) call the entry point. The duplicate inline
pipeline in `/api/v1/council/generate` is either switched to the module or
explicitly marked deprecated in the ticket outcome.

**Blocked by:** None — can start immediately (parallel to 01–03).

**Status:** done

- [x] `enhance()` is the module's only public export surface (plus types)
- [x] Existing councilService tests moved/adapted and passing at the new seam
- [x] Routes and UI import only the entry point
- [x] Decision recorded on `/api/v1/council/generate` duplicate
- [x] `npm test` and `npm run build` pass

## Outcome notes (2026-07-20)

- **Module shape:** `src/services/council/` mirrors the generation module —
  `index.ts` is the sole public entry, implementation in
  `internal/councilService.ts` (git mv, history preserved), seam tests in
  `__tests__/`.
- **Public surface:** `enhance(request)` (wraps `enhancePrompt`), plus
  `CouncilEnhanceRequest` / `CouncilEnhanceResult` types and
  `CouncilProviderError` (part of the enhance() contract — callers are told to
  catch it). Caller census confirmed every external importer used only
  `enhancePrompt`; `refinePrompt` / `getStyleRecommendations` /
  `validatePrompt` have zero external callers, so they are deliberately NOT
  exported (they remain internal and can be surfaced later if a caller
  appears).
- **Migrated importers (no compat shim left — zero shims):**
  `src/app/api/v1/council/enhance/route.ts`, `src/app/api/health/council/route.ts`,
  `src/api/routes/councilEnhancement.js` (dynamic import; its old
  `../../../services/councilService.ts` path was one level too deep and
  pointed outside `src/` — corrected to `../../services/council/index.ts`),
  `src/features/Generate.jsx`, `src/components/PromptEnhancer.jsx`,
  `src/components/GenerateContent.jsx`.
- **Tests:** `councilService.test.js` and `councilService.verification.test.js`
  moved to `src/services/council/__tests__/`. The verification file also
  contained `generateWithRetry` tests against the LEGACY
  `src/services/generationService.ts` — those are not council tests, so they
  were split out to `src/services/__tests__/generationService.retry.test.js`
  to die alongside the legacy file in the contract step.
- **`/api/v1/council/generate` decision:** NOT rewritten. Its inline
  brief→composition→style→prompt pipeline duplicates the council module; a
  header comment now marks it as slated for consolidation and forbids
  extending the inline pipeline. Consolidation is deferred to a later ticket.
- **Boundary enforcement:** eslint `no-restricted-imports` extended with
  `**/council/internal/*` + `@/services/council/internal/*` (message cites
  ADR-0002); `src/services/council/**` added to that rule block's ignores.
- **Lint note:** the ported internal file keeps its legacy `any`s under a
  justified file-level `eslint-disable @typescript-eslint/no-explicit-any`;
  the public contract is typed at the boundary. Tightening internals is a
  later cleanup, not part of the move.
- **Gates:** `npx vitest run src/services/council/` green, full `npm test`
  green (297 passed / 7 skipped), `npm run build` green,
  `npx eslint src/services/council/ eslint.config.mjs` clean, and grep
  confirms no file outside `src/services/council` imports `councilService`
  or `council/internal`.

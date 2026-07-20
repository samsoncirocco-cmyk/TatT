# 04 — Council module with single entry point

**What to build:** Prompt enhancement is reachable only through the new
`council` module's `enhance(request)` entry point (ADR-0002). The existing
`councilService` implementation moves inside the module (stays TypeScript);
the enhance/health API routes and UI components (`PromptEnhancer`,
`GenerateContent`, `Generate.jsx`) call the entry point. The duplicate inline
pipeline in `/api/v1/council/generate` is either switched to the module or
explicitly marked deprecated in the ticket outcome.

**Blocked by:** None — can start immediately (parallel to 01–03).

**Status:** ready-for-agent

- [ ] `enhance()` is the module's only public export surface (plus types)
- [ ] Existing councilService tests moved/adapted and passing at the new seam
- [ ] Routes and UI import only the entry point
- [ ] Decision recorded on `/api/v1/council/generate` duplicate
- [ ] `npm test` and `npm run build` pass

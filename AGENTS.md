# TatT Agent Notes

This repo is the TatT design studio. Focus on the Generate page (“The Forge”) and its supporting services/hooks/components.

## Where to start
- Main UI: `src/pages/Generate.jsx`
- Canvas + layers: `src/components/generate/ForgeCanvas.tsx`, `src/hooks/useLayerManagement.ts`, `src/services/canvasService.ts`
- Generation: `src/hooks/useImageGeneration.js`, `src/services/replicateService.js`
- Versions: `src/hooks/useVersionHistory.js`, `src/services/versionService.js`, `src/components/generate/VersionTimeline.jsx`, `src/components/generate/VersionComparison.jsx`
- Match Pulse: `src/components/generate/MatchPulseSidebar.jsx`, `src/components/generate/ArtistMatchCard.jsx`, `src/hooks/useArtistMatching.js`, `src/services/matchService.js`, `src/services/neo4jService.js`
- Inpainting: `src/components/InpaintingEditor.jsx`, `src/services/inpaintingService.js`
- Stencil: `src/services/stencilService.js`, `src/components/StencilExport.jsx`

## Local run
- `npm run dev`

## Implementation conventions
- Prefer URLs over base64 in storage. Keep localStorage payloads small.
- Use `useLayerManagement` for any layer mutations.
- Use `useImageGeneration` for high-res/refine flows; low-res previews use `useSmartPreview`.
- Match Pulse updates should be debounced (2s) and recover with retry on failure.
- Maintain accessibility: focus-visible outlines, ARIA labels, and live regions for dynamic updates.

## Recent changes to keep in mind
- Blend modes now render in Konva with `globalCompositeOperation`.
- Version history auto-saves on generation and example load; comparisons are modal-based.
- Inpainting + restyle flows are wired into the Generate page.

## Testing notes
- No formal test suite updates were run in this session.
- Smoke test: open `/generate`, load a trending example, generate a new layer, check timeline + Match Pulse updates.

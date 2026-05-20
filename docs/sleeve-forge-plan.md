# Sleeve / Large-Piece Workflow — Plan

**Status:** plan-of-record as of 2026-05-20. Companion to `docs/council-plan.md` — that doc covers single-element generation; this doc covers multi-element sleeves and large pieces by decoupling generation from arrangement.

## The insight

The image model is **great at one element and bad at six interacting elements** (proven by the MHA/DBZ test runs on 2026-05-19 and 2026-05-20: every multi-character render either drops characters or smushes them into one style). Three approaches to fix that exist (per-character compositing, ComfyUI IP-Adapter, per-character LoRAs); they're all heavy.

The Forge already has a **layered canvas editor** (`ForgeCanvas`, `LayerStack`, `useLayerManagement`, `CanvasSilhouette`, `PlacementGrid`, `RegenerateElementModal`, `CleanupTool`). The smart move is to use it: have the council render each element individually with a transparent background, then drop them into the Forge as layers for the human to arrange.

This is roughly Flow B1 from `council-plan.md`, but the **compositor is the human**, not a Pillow agent. No automated compositing code to build. The customer gets agency over arrangement, which is also a better tattoo-design UX.

## The two flows side by side

**Flow A — single-element (already shipped at `/api/v1/council/generate`):**
1. Customer types one idea
2. Council generates one finished image
3. Customer iterates

Best for: "one koi fish on my forearm," "my grandmother's portrait," "the word HOPE in fineline."

**Flow B — multi-element sleeve (this plan):**
1. Customer types a large-piece idea ("MHA arm sleeve with Deku Bakugo Todoroki vs Goku Gohan Trunks")
2. Backend decomposes into N elements; for each element runs a focused single-element council pass with transparent background
3. Backend returns N layer-ready objects with suggested placement on the canvas
4. Forge auto-populates the `LayerStack` with those layers on a body-shaped canvas (sleeve silhouette)
5. Customer drags, scales, rotates each layer; regenerates individual elements as needed via `RegenerateElementModal`
6. Customer exports the composed design

Best for: sleeves, half-sleeves, back pieces, chest panels, anything with multiple interacting subjects.

## What's new vs reused

**Reused (the Forge already has this):**
- `ForgeCanvas.tsx` — the canvas surface
- `LayerStack.tsx` + `useLayerManagement.ts` — layer state + UI
- `CanvasSilhouette.tsx` + `BodyPartSelector.tsx` + `bodyPartAspectRatios.ts` — body-shape canvas
- `PlacementGrid.tsx` — snap / suggested placement zones
- `RegenerateElementModal.jsx` — per-layer regeneration
- `CleanupTool.jsx` — element refinement
- `BlendModeSelector.jsx` — layer composition mode

**New (this plan adds):**
- Backend route `POST /api/v1/council/decompose` — takes customer text + placement, returns array of layer-ready elements
- One additional council agent: **decomposition agent** — given the brief, splits "MHA sleeve with 6 characters" into 6 single-element prompts plus a suggested layout
- Transparent-background generation — Flux Pro can do this with the right prompt anchor ("isolated subject, transparent background"); fallback is `bria-rmbg` Replicate model for background removal
- Frontend wiring — `/generate` page calls `/decompose` when `subject_type=named-characters` and `subject_count > 1` (or when the customer explicitly hits a "sleeve mode" toggle)

## API contract

```
POST /api/v1/council/decompose
Body:
  {
    "customerText": "MHA arm sleeve featuring deku bakugo and todoroki fighting trunks gohan and goku",
    "placement": "sleeve",           // optional; council infers if missing
    "references": {                  // optional; per-subject reference image URLs
      "Deku":   "https://...",
      "Goku":   "https://..."
    }
  }

Response:
  {
    "success": true,
    "brief":   { ... },              // same shape as /generate
    "layout":  {                     // suggested placement from composition agent
      "canvas":   { "width": 768, "height": 1792, "shape": "sleeve" },
      "elements": [
        {
          "id":             "deku",
          "subject":        "Deku",
          "x":              140,     // canvas coords
          "y":              200,
          "width":          280,
          "height":         360,
          "rotation":       0,
          "blend_mode":     "normal"
        },
        // ... one entry per generated element
      ]
    },
    "elements": [                    // the layer-ready images
      {
        "id":        "deku",
        "subject":   "Deku",
        "image_url": "https://replicate.delivery/...",
        "background_removed": true,
        "council":   { ... }         // per-element brief/prompt/style for audit
      },
      // ...
    ],
    "metadata": { ... }
  }
```

Frontend reads `layout` + `elements` and dispatches a single `addMultipleLayers` action against `useLayerManagement`. Each layer pre-positioned on the canvas; customer takes it from there.

## Build order

1. **Backend: write `/api/v1/council/decompose`** — same six agents as `/generate` but the decomposition agent fires up front, then the per-element generation loop runs N times in sequence (or in parallel if Replicate rate limit allows). Returns the contract above. **~2 hrs.**
2. **Backend: transparent-background prompt anchors** — add "isolated subject, no scene, transparent background, white background or alpha" to the prompt agent for decomposition-mode generations. Test that Flux Pro produces clean cutouts. If not, chain `bria-rmbg` per element. **~30 min.**
3. **Frontend: wire `/decompose` into the Forge** — call from `/generate` page when `sleeve mode` is active (a toggle the UI work already in flight can add). On response, push elements into `useLayerManagement`. **~1-2 hrs.**
4. **Frontend: sleeve silhouette as canvas** — reuse `CanvasSilhouette.tsx` with a `placement=sleeve` body-shape preset. **~30 min** (likely already exists or near-existing).
5. **End-to-end test** — actually run the MHA/DBZ case, confirm 6 layered characters land on the canvas, confirm regenerate-one works. **~30 min.**

Total: roughly a half-day of work, mostly backend, then UI wire-up alongside whatever UI work is in flight.

## Cost ballpark

Per sleeve generation (assuming 6 elements):
- 1 brief agent (Haiku) — $0.001
- 1 decomposition agent (Haiku) — $0.002
- 6 × { composition + style + prompt agents (Haiku) + Flux 1.1 Pro image + critic (vision Haiku) } — 6 × $0.06 = **$0.36**
- Optional 6 × bria-rmbg if Flux's transparent-bg prompt doesn't suffice — 6 × $0.005 = $0.03

**~$0.40 per sleeve generation.** Versus ~$0.05 for a single-element generation. Reasonable for a high-value design surface.

## Out of scope (explicitly defer)

- **Auto-arrangement of layers without human input.** The whole point is the human is the compositor. If we later want an "AI arranges them automatically" mode, that's a separate effort using the composition agent's output to call `setLayerPosition` for each element. Not in this plan.
- **Cross-element interaction at the image-model level** (e.g. characters actually touching / clashing). Per-element generation produces independent characters. Customer arranges them to imply interaction. If you want characters physically touching in the pixels, that requires ComfyUI IP-Adapter (out of scope here, deferred to a later plan).
- **Multi-page customer-uploaded reference per element.** v1 of the candidate-picker UI from `council-plan.md` returns one reference per subject. Multi-reference handling is a future enhancement.
- **Background removal quality at the pixel level.** If `bria-rmbg` outputs aren't clean enough for tattoo work, switch to `flux-pulid` (face-aware) for portraits or a dedicated matting model. Pick the better one *after* we have real outputs to compare.

## Naming

The codebase already uses **"the Forge"** for the canvas editor (per `ForgeCanvas.tsx`, `ForgeGuide.jsx`). Keep that name. The new mode is **"sleeve mode"** in the UI (or "multi-element mode" if "sleeve" is too placement-specific later).

## Supersedes

This plan replaces any informal "MULTI_LAYER" / "MULTI_CHARACTER" doc claims from the older docs graveyard insofar as they describe how multi-element generation should work going forward:
- `docs/MULTI_CHARACTER_FIX.md` — pre-this-plan, describes a prompt-engineering approach that doesn't actually solve the problem
- `docs/MULTI_LAYER_OUTPUT_IMPLEMENTATION.md` — pre-this-plan, may describe partial work; reconcile or archive when executing step 3

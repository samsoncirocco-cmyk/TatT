# ADR 0024 — Live AR is untracked, and MindAR is not a dependency

**Status:** Accepted
**Date:** 2026-07-25

## Context

`directives/ar-preview.md` specified a live AR preview built on "MindAR body
tracking", detecting shoulder / elbow / wrist landmarks with confidence scores,
feeding a depth map and a perspective-corrected overlay at 60fps with ±2cm
accuracy.

Four files existed against that spec — `mindarLoader.js`, `mindarSession.js`,
`depthMappingService.js`, `arService.js` — plus `/api/v1/ar/visualize` and
`utils/anatomicalMapping.js`. None of it ran. `loadMindAR()` always returned
`null`, so the MindAR branch was unreachable; MindAR was in no manifest and was
never fetched. The one component that consumed any of it,
`VisualizeContent.jsx`, had zero importers, and `/visualize` was a "Coming
Soon" page. Live AR was reachable from the homepage and led nowhere.

The parts that did compute produced invented numbers:

- `estimateMonocularDepth()` returned a radial gradient unrelated to the camera
  image. Surface normals and curvature were then derived from it.
- `detectBodyPart()` returned `forearm` if the frame was taller than wide, else
  `shoulder`, at a hardcoded `0.85` confidence.
- `validatePlacementAccuracy()` was `0.95 - Math.random() * 0.05`, rendered in
  the UI as a "±2cm ACCURACY" badge.
- `/api/v1/ar/visualize` returned `success: true` and a `visualization_url` of
  `https://storage.example.com/...` — a file that has never existed.

## Decision

### 1. The live preview is untracked

The design does not follow the body. The user positions it. No body detection,
no depth, no perspective warp, no accuracy figure.

Two independent reasons:

- **Scope.** Body detection, lighting normalization and skin-tone matching are
  explicitly v2.
- **Feasibility.** The specified approach cannot be built. See below.

Placement is not inferred from the camera either — it is resolved during intake
and carried on `Brief.placement`. The AR step trusts that tag.

### 2. MindAR is not added as a dependency

**MindAR has no body tracking.** It supports image-target and face tracking
only. Its README lists body tracking under "Roadmaps" as an aspiration, and the
source tree contains only `face-target/` and `image-target/` modules. There is
no API that returns a shoulder, elbow or wrist. The directive's central premise
was never buildable, which is why the loader was a permanent stub.

Adding it anyway would cost, for nothing we need:

- `mind-ar@1.2.5` was last published January 2024 — no release in ~2.5 years.
- It hard-depends on native `canvas` (node-canvas 2.x), used only by its
  Node-side offline compiler but still installed, with the node-gyp/Cairo build
  risk that implies.
- It pulls full `@tensorflow/tfjs` as a production dependency, and peer-depends
  on three.js.
- Its face path hard-codes runtime fetches to `cdn.jsdelivr.net` and
  `storage.googleapis.com` with no override hook, and needs `wasm-unsafe-eval`
  and `worker-src blob:`. This repo sets no CSP today, so nothing blocks it now
  — but that is an absence of policy, not a sanction, and self-hosting would
  mean forking the library.

**If tracking is ever wanted, the library is MediaPipe Tasks Vision
`PoseLandmarker`** — actively released, browser-native WASM, and it returns the
33 landmarks including shoulders, elbows and wrists. Notably, MindAR already
depends on `@mediapipe/tasks-vision` itself, so MindAR would be a wrapper we do
not need around the package that actually does the work. That remains v2.

### 3. Code that fabricates output is deleted, not left dormant

Every item listed in Context is removed rather than commented out or left
behind a flag. A stub that returns a plausible number is worse than a missing
feature: it is indistinguishable from a working one until a user trusts it.

### 4. The overlay is guarded by a hard precondition

A design can only be composited if its background lifts to real alpha. An
on-skin render has no white to remove, so the whole rectangle would survive
opaque and the preview would paste a stranger's skin onto the user's camera.

The classification and the alpha ramp are **not reimplemented here**. They live
in `src/lib/designBackdrop.ts`, shared with the placement-preview composite
(#125), which states plainly: import it, do not write a second copy that
drifts. `src/services/ar/designSource.ts` is a DOM adapter over it — it reads
an `<img>`/`<canvas>` into a pixel buffer and returns a renderable canvas (or
`null`), and owns no thresholds of its own. Only the rejection *copy* differs,
because the AR surface pastes onto a live camera rather than an uploaded photo.

Both implementations were written independently before #125 merged, and the AR
suite passed unchanged when swapped onto the shared module — a useful
confirmation that the two agreed on the underlying judgement.

## Consequences

- `/visualize` is a working feature instead of a placeholder, and honest about
  what it does.
- Users who want the design to *stay stuck* to a moving arm will not get that.
  This is the correct trade against showing them a fabricated tracking quality.
- No new runtime dependency; the preview is entirely client-side and free.
- Anyone picking up tracking in v2 starts from PoseLandmarker, and does not
  re-litigate MindAR.

## Verification note

Everything except "does it look right on real skin" is covered by tests. The
live camera path was driven in a real browser using `canvas.captureStream()` as
a synthetic camera — a genuine `MediaStream` through the real `getUserMedia`
code path, needing no Chrome flags and no Playwright. What remains for a human
with a phone is recorded in the PR's hand-check list.

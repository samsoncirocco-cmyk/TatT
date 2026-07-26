# AR Preview (Live Camera Mirror)

## Goal
Let a user point their phone at their skin and see a design sitting on it, in
real time, before they commit. This is a **trust artifact** — it exists to make
someone confident enough to book. It is not a stencil, and the artist does not
work from it. The artist works from the brief.

## When to Use
- User wants to see a design on their own body before booking
- Route: `/visualize` (reachable from the homepage card)
- Component: `ARMirror` (`src/features/ar/components/ARMirror.tsx`)

## What this is — and what it deliberately is not

**It is:** a live camera feed with the user's own generated design composited
over it, positioned by the user, exportable as a PNG.

**It is not tracked.** The design does not follow the arm. There is no body
detection, no landmark estimation, no depth mapping, no perspective warp.

This is a deliberate scope decision, not a gap left for later convenience:

1. **Body/limb tracking is explicitly v2**, alongside lighting normalization
   and skin-tone matching.
2. **MindAR cannot do it anyway.** MindAR supports *image-target* and *face*
   tracking only. Body tracking appears in its README roadmap as an aspiration
   and is not implemented — there is no MindAR API that returns a shoulder,
   elbow or wrist. Earlier versions of this directive described a "MindAR body
   tracker" returning those landmarks; that was never buildable. See
   `docs/adr/0024-live-ar-is-untracked.md`.
3. **Placement is not inferred.** It is resolved during intake and carried on
   `Brief.placement`. The AR step displays that tag; it never guesses from the
   camera.

An untracked preview that is honest about being untracked is worth more than a
tracked one that invents its numbers. The previous implementation reported a
"±2cm" accuracy badge computed as `0.95 - Math.random() * 0.05`.

## Hard prerequisite: flash art on white

**The design's background must be strippable to transparency.** This is a hard
dependency, not a nicety.

Providers do not reliably return RGBA — most reveal renders are ink on a white
square. `stripWhiteBackground()` lifts near-white (the 235..255 ramp) to real
alpha so only the linework composites.

**An on-skin render fails this completely.** Nothing in it is white enough to
remove, so the whole rectangle survives opaque, and overlaying it pastes *a
stranger's forearm* onto the user's camera feed.

So the guard runs first and fails closed.

**Classification and strip:** `src/lib/designBackdrop.ts` — shared with the
placement-preview composite. One threshold, one ramp, one place to change it.
It samples the border ring, because ink sits in the middle of both a flash
render and an on-skin render, so the edge is what distinguishes paper from
skin. Flash art measures ~1.0; an on-skin render measures ~0.0, since skin
fails the all-channels-≥235 test even at very pale tones.

**AR adapter:** `src/services/ar/designSource.ts` — DOM plumbing only. Reads an
`<img>`/`<canvas>` back into a pixel buffer, delegates the verdict, and returns
something renderable.

- Images already carrying real alpha are accepted as-is.
- **Unreadable pixels are rejected**, not guessed at. A tainted cross-origin
  canvas means the guard cannot verify the background, and rendering anyway is
  exactly the failure it exists to prevent. Design images are therefore loaded
  with `crossOrigin = 'anonymous'`.
- `prepareDesignForOverlay()` returns `canvas: null` for a rejected design, so
  no caller can render one by forgetting to check the verdict.

A blocked design shows the user why, and offers no export.

## Steps

### 1. Check support before offering the camera
**Location:** `src/services/ar/arService.js` → `checkArSupport()`

Returns `{ supported, reason, message }`. Missing `getUserMedia` or an insecure
origin is answered *up front*, so an unsupported device never taps into a dead
viewport. `http://localhost` is a secure context; a LAN IP is not.

### 2. Open the camera
**Location:** `src/features/ar/useArSession.ts`

`start()` walks `idle → requesting → starting → active`. Every failure lands on
a terminal state carrying a machine-readable `reason` and a sentence the user
can act on:

| reason | cause |
|---|---|
| `permission-denied` | user declined the prompt |
| `no-camera` | no video input device |
| `camera-busy` | device held by another app |
| `stream-timeout` | camera opened but never delivered a frame |
| `insecure-context` | page not on https/localhost |
| `no-camera-api` | browser has no getUserMedia |

There is no state meaning "still trying, indefinitely". A spinner that never
resolves is the bug class this replaced.

### 3. Place the design
The user drags it, and sets size, rotation and ink strength. Composited with
`mix-blend-mode: multiply` so ink sinks into skin tone instead of floating like
a sticker — white paper multiplies to skin, black ink stays black.

### 4. Export
`capture()` flattens the current video frame plus the overlay at the same
transform, and downloads a PNG. What was on screen is what is saved.

### 5. Release the camera
`stop()` ends every track, clears `srcObject` and returns to `idle`. Unmount
does the same. A stream arriving *after* the user cancelled is torn down rather
than orphaned — otherwise the camera light stays on until the tab closes.

## Edge Cases

| Case | Behaviour |
|---|---|
| Permission denied | Terminal error + "Try again" / "Go back" |
| Camera busy | Terminal error naming the cause |
| Camera opens, no frames | 12s timeout, then a specific error |
| Unsupported browser / insecure origin | Said before the camera is offered |
| On-skin design selected | Blocked, explained, no export |
| Design image unreadable | Blocked — never rendered on a guess |
| No generated designs | Entry button disabled with the reason |

## Testing

Headless (`npm test`): `designSource` (12), `arService` (15), `useArSession`
(9), `ARMirror` (8). jsdom is backed by node-canvas here, so the alpha-strip and
the on-skin guard run against **real pixels**, not mocked verdicts.

A live camera cannot be tested in jsdom. Two options for a real browser:

- **`canvas.captureStream()`** — publish an animated canvas as a genuine
  `MediaStream` and override `navigator.mediaDevices.getUserMedia`. Needs no
  flags and no new dependency; this is how the feature was verified.
- **Chrome fake-camera flags** — `--use-fake-device-for-media-stream` plus
  `--use-file-for-fake-video-capture=/abs/path.y4m` (the first is required for
  the second to do anything; the file must be I420 `yuv420p`). Would require
  adding Playwright, which the repo does not have.

## Cost
Free. Entirely client-side — no API calls, no server render, no storage unless
the user exports (and that download is local).

## Related
- `generate-design.md` — produces the design (must be flash art on white)
- `docs/adr/0024-live-ar-is-untracked.md` — why untracked, and the MindAR call

## Future (v2)
- Body/limb tracking via **MediaPipe Tasks Vision PoseLandmarker** (not MindAR)
- Lighting normalization; skin-tone matching
- Sharing an AR clip rather than a still

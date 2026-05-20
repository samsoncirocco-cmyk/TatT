# TatT Design System — Punk Edition

Direction: Machine Gun Kelly *Tickets to My Downfall*. Hot pink on pitch black, Anton crashing through Space Mono, hard edges, halftone screenprint dots, diagonal slashes, sharpie marks, sticker-tape pricetags. Loud, deliberate, monochromatic with one screaming accent. **This is not goth, not web3, not gradient-y.** If it feels safe or rounded, it's wrong.

Reference implementation: `src/app/generate/stencil/page.tsx` + `src/components/studio/StudioShell.tsx`. All tokens live in `tailwind.config.js` and `src/app/globals.css`.

---

## Tokens

### Colors

| Token | Hex | Tailwind | When to use |
|---|---|---|---|
| Hot pink | `#ff1f6b` | `pink` / `text-pink` / `bg-pink` | The accent. CTAs, slashes, dots, hover states, focus rings. One thing pink per screen — make it count. |
| Deep pink | `#d6004f` | `pink-deep` | Rare. Only when hot pink needs depth (pressed state, layered shadow). Avoid as primary. |
| Pitch black | `#0a0a0a` | `ink` / `bg-black` | Base background. Always. |
| Bleached white | `#f5f5f0` | `bone` / `text-white` | Body text, hairlines at low alpha, hard shadow on tape CTA. |
| Cream | `#e8d9b8` | `cream` / `bone-dark` | Sticker pricetag paper only. Nothing else. |
| `ink.soft` | `#9a9690` | — | Legacy. Don't reach for it. |
| `oxblood` | `#ff1f6b` | — | Legacy alias mapped to pink. If you see `bg-oxblood` in old code, leave it; it renders correctly. |

Alpha conventions (use directly in Tailwind, e.g. `text-white/70`):
- `/70` — secondary body copy
- `/50` — meta labels (status bars, footers)
- `/40` — tertiary metadata, timestamps
- `/30` — placeholder text
- `/20` — `hairline-white` border
- `/10` — `hairline-soft` border, ghosted iconography

### Typography

Two faces. Never a third.

| Role | Font | Tailwind | Size | Weight | Tracking | Case |
|---|---|---|---|---|---|---|
| Hero display | Anton | `font-display` | `text-[72px] sm:text-[112px] md:text-[148px]` | 400 | `tracking-[0.005em]` | UPPERCASE (auto via `.font-display`) |
| Section heading | Anton | `font-display` | `text-[20px]` | 400 | `tracking-wide` | UPPERCASE |
| Button (tape CTA) | Anton | `font-display` | `text-[32px] sm:text-[38px]` | 400 | `tracking-[0.02em]` | UPPERCASE |
| Iteration title | Anton | `font-display` | `text-[16px]` | 400 | `tracking-wide` | UPPERCASE |
| Body lede | Space Mono | `font-body` | `text-[15px]` | 400 | normal | sentence case |
| Input text | Anton | `font-display` | `text-[20px] md:text-[24px]` | 400 | `tracking-tight` | as typed |
| System label | Space Mono | `font-body` | `text-[10px]` | 400 | `tracking-[0.25em]` to `tracking-[0.28em]` | UPPERCASE |
| Chip | Space Mono | `font-body` | `text-[10px]` | 400 | `tracking-[0.2em]` | UPPERCASE |
| Timestamp | Space Mono | `font-body` + `tabular-nums` | `text-[10px]` | 400 | `tracking-[0.18em]` | UPPERCASE |
| Sticker callout | Anton + Space Mono | mixed | `text-[11px]` / `text-[8px]` | 400 | `tracking-widest` | UPPERCASE |

Line heights: `leading-[0.88]` for hero display, `leading-[1.4]` for input, `leading-[1.55]` for body. System labels are always `leading-none` or default.

### Spacing

Tailwind defaults. Notable rhythms in the stencil page:
- Page gutter: `px-6 md:px-12`
- Editorial canvas vertical: `py-16 md:py-24`
- Hero → lede: `mt-10`
- Lede → input: `mt-16`
- Input → action row: `mt-10`
- Section breaks: `mt-24 pt-10 border-t-2 hairline`

### Borders & corners

**No radii.** `tailwind.config.js` overrides `borderRadius` so `rounded`, `rounded-sm`, `rounded-md`, `rounded-lg` all resolve to `0`. The only exception is `rounded-full` (sticker dots, status pips). Default border is `border-2 hairline` (pink at 35% alpha) or `hairline-white` (white at 20%).

### Motion

One animation: `snap` — a hard 6-step cut-in (`steps(6, end)`). Use `.rise .rise-1` through `.rise-5` for staggered entrances. No fades. No spring curves. Press feedback is `.press` (1px Y translate on `:active`).

---

## Component Patterns

### Slash headline

**When:** Hero headline. One word per headline gets slashed. Never two.

**How:**
```tsx
<h1 className="font-display text-white leading-[0.88] text-[72px] sm:text-[112px] md:text-[148px]">
  Describe<br />the&nbsp;
  <span className="slash"><span>tattoo</span></span>
  <span className="text-pink">.</span>
</h1>
```

Trailing pink period is part of the pattern — it's the second pink accent against the slash itself, and it's the only place a period lives in display type. The `.slash::after` pseudo-element is a `-6deg` pink bar at 48% top, 14% height.

**Example:** `src/app/generate/stencil/page.tsx:100-106`

### Emergency-tape CTA

**When:** The single primary action on a screen. Maximum one per view.

**How:**
```tsx
<button className="tape press inline-flex items-center justify-center px-10 py-5 font-display text-[32px] sm:text-[38px] leading-none tracking-[0.02em]">
  GENERATE
  <span className="ml-3 text-[20px]">▸</span>
</button>
```

The `.tape` utility provides: pink fill, black text, `6px 6px 0 0 white` hard shadow at rest, `10px 10px` on hover (with `-2px,-2px` translate), `2px 2px` on active (with `3px,3px` translate). All hard edges, no easing curves beyond 120ms linear-ish.

**Example:** `src/app/generate/stencil/page.tsx:147-153`

### Sticker pricetag chip

**When:** A small editorial overlay on the canvas. Maximum one per screen. Rotated, paper-colored, looks like it was slapped on.

**How:**
```tsx
<div className="sticker px-3 py-1 absolute -top-4 right-0 z-10">
  <div className="font-display text-[11px] tracking-widest leading-none">EXPLICIT</div>
  <div className="font-body text-[8px] uppercase tracking-widest leading-none mt-0.5">Content</div>
</div>
```

`.sticker` rotates `-3deg`, cream background, black text, soft black drop shadow. Two text lines — Anton stacked on Space Mono — read like a pricetag.

**Example:** `src/app/generate/stencil/page.tsx:90-97`

### Suggestion chip (outlined)

**When:** Low-emphasis tag actions next to (never instead of) the tape CTA.

**How:**
```tsx
<button className="text-[10px] uppercase tracking-[0.2em] text-white/70 hover:text-black hover:bg-pink border hairline px-3 py-2 press font-body">
  Traditional Japanese
</button>
```

Hover inverts to pink-on-black. No radius, hairline border, Space Mono, full uppercase.

**Example:** `src/app/generate/stencil/page.tsx:134-142`

### Status bar / meta labels

**When:** Top and bottom of any full-page view. The "studio HUD" framing.

**How:**
```tsx
<div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
  <div className="max-w-4xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
    <span><span className="text-pink">●</span>&nbsp;&nbsp;Step&nbsp;01/04 — Describe</span>
    <span>Status:&nbsp;<span className="text-pink">Ready</span></span>
  </div>
</div>
```

Always Space Mono, always uppercase, always `tabular-nums`, always wrapped in a pink dot or a pink word. Borders are `hairline` (pink alpha).

**Example:** `src/app/generate/stencil/page.tsx:77-84` (top) and `:177-184` (bottom).

### Halftone background overlay

**When:** Every full-page view inside the studio shell. It's the screenprint texture under everything.

**How:** Add `halftone` to a root container. `::before` paints a fixed, pointer-events-none pink dot grid at 14px pitch, 18% opacity, screen blend.

```tsx
<div className="halftone grain min-h-screen text-white font-body bg-black">…</div>
```

**Example:** `src/components/studio/StudioShell.tsx:15`

### VHS noise grain overlay

**When:** Same as halftone — pair them. Grain alone is too clean; halftone alone is too flat.

**How:** Add `grain` to the same root container. `::after` paints an inline SVG `feTurbulence` noise tinted toward pink, fixed, 12% opacity, overlay blend.

**Example:** `src/components/studio/StudioShell.tsx:15`

### RGB-glitch logo hover

**When:** The brand wordmark in the top-left of the studio shell. Nowhere else.

**How:**
```tsx
<span className="font-display text-white text-3xl leading-none tracking-[0.01em] glitch">TatT</span>
```

`.glitch:hover` adds `text-shadow: -1px 0 var(--pink), 2px 0 #00f0ff` with a 2-step transition. Cyan + pink chromatic aberration. The cyan is the *only* place a non-palette color is allowed.

**Example:** `src/components/studio/StudioShell.tsx:20`

### Sharpie scribble accent

**When:** One word inside the lede paragraph. Marks the emotional payload of the copy.

**How:**
```tsx
<span className="scribble text-pink">Loud is fine.</span>
```

`.scribble` is an inline SVG squiggle painted under the text at half-em height. Pair with `text-pink` so the underline disappears into the stroke.

**Example:** `src/app/generate/stencil/page.tsx:112`

### Hairline divider

**When:** Any section break, any container border.

**How:** `border-2 hairline` (pink at 35%, prominent), `border hairline` (1px pink at 35%), `border hairline-soft` (1px white at 10%), `border hairline-white` (1px white at 20%). Never use Tailwind's default border-gray.

---

## Do / Don't

**DO**
- Caps-lock all system labels: `STATUS: READY`, `STEP 01/04`.
- Pair `halftone` and `grain` on the page root — they're a unit.
- Use Anton for anything 16px+ that needs presence. Use Space Mono for anything 15px or smaller.
- Leave aggressive negative space. Punk uses silence too.
- Keep exactly one tape CTA, one sticker, one slashed word per screen.
- Use `tabular-nums` on every numeric label.
- Animate with `.rise rise-1..5` for staggered entrances, nothing else.
- Reach for `hairline` (pink at 35%) before `hairline-white`.

**DON'T**
- Don't add gradients. No purple-to-pink, no fades, no glow.
- Don't introduce a third typeface. Anton + Space Mono only.
- Don't round corners. `rounded`, `rounded-md`, etc. are tokenized to `0` — using them is a no-op, which signals intent issues.
- Don't use cream for anything but the sticker pricetag.
- Don't use the cyan from `.glitch:hover` outside the logo.
- Don't use Framer Motion springs or `transition-all`. Hard cuts only.
- Don't add a second pink accent in close visual proximity to the slash + period combo — it dilutes both.
- Don't use grey. `text-gray-*` and `border-gray-*` are forbidden; reach for white alpha or `hairline*`.

---

## What's NOT in the system yet

These are gaps. Tomorrow's work will surface more.

- **Form inputs beyond textarea.** No text input, select, checkbox, radio, or toggle exists in the punk style. Only the `textarea` on the stencil page.
- **Error / validation states.** No "invalid input", no inline error message styling.
- **Loading state for the tape CTA.** The button has no in-flight / disabled / spinner treatment.
- **Modal / dialog.** No overlay, no confirm/cancel pattern.
- **Toast / notification.** No transient feedback pattern.
- **Mobile navigation drawer.** `StudioShell` has a left+right sidebar layout; mobile collapse behavior isn't designed.
- **Empty states.** History sidebar assumes content exists; no "no cuts yet" pattern.
- **Data table / list rows beyond `IterationRow`.** That row pattern is one-off for the history sidebar.
- **Image / generated-output card.** `IterationRow` uses a placeholder `✕`; the real card with image, actions, layer toggles doesn't exist.
- **Tooltip / popover.**
- **Tabs / segmented control.**
- **Avatar / artist card** for the matching flow.
- **Step indicator** beyond the inline `Step 01/04` text — no visual progress component.

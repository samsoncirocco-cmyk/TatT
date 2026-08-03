# Handoff: TatT Full-Site Redesign (Punk Edition)

## Overview
A cohesive redesign of the TatT customer-facing site — 11 screens — rebuilt in the existing **"Tickets to My Downfall" punk design system**. The goal was to elevate the current pages (real portfolio imagery instead of color blocks, tighter hierarchy) and fill the gaps flagged in `DESIGN_SYSTEM.md` ("What's NOT in the system yet"): generation output cards, empty states, an artist profile, a step indicator, and punk form inputs.

## About the Design Files
The file in this bundle (`TatT Site.dc.html`) is a **design reference created in HTML** — a single-canvas prototype showing the intended look and layout of every screen. **It is not production code to copy.** Your task is to recreate these designs **in the existing TatT Next.js app** using its established components and utilities. The system already exists — this redesign is expressed *in* it, so most of the work is composition, not new CSS.

> ⚠️ Do **not** port the inline styles or the helmet `<style>` utility classes from the HTML. They are a standalone re-implementation of your real system so the prototype could run outside your repo. In the codebase, use the real Tailwind tokens and components below.

## Fidelity
**High-fidelity.** Final colors, type, spacing, and component patterns — all matching your existing system. Recreate pixel-faithfully using the real components. The one intentional deviation: the prototype uses CSS variables (`--acc`, `--halo`, etc.) to power a live "feel" tweaker (accent color / loudness / screenprint density). That is a *prototype affordance for design review*, **not** a feature to ship unless you want a theming system — your production accent stays `#ff1f6b`.

## Map to existing code (READ FIRST)
Everything here already exists in the repo. Reuse it; don't rebuild.

- **Shell / nav / footer** → `src/components/studio/StudioShell.tsx` (wraps every page; provides the unified nav, account dropdown, mobile drawer) and `src/components/studio/PunkFooter.tsx`. Every screen in the prototype uses this shell — in code, just wrap page content in `<StudioShell>`.
- **Slash headline** → `src/components/punk/SlashHeadline.tsx` (`<SlashHeadline before="The" slashed="roster" />`). One slashed word per screen.
- **Tape CTA** → `src/components/punk/TapeCTA.tsx` (`<TapeCTA href|onClick size="lg|md|sm" variant="pink|ghost">`). Max one pink tape per screen.
- **Artist card** → `src/components/punk/ArtistCard.tsx` (already used by `/artists`).
- **Tokens & utilities** → `src/app/globals.css` + `tailwind.config.js`. Use `font-display`/`font-body`, `hairline`/`hairline-white`/`hairline-soft`, `.tape`, `.slash`, `.sticker`, `.scribble`, `.glitch`, `.halftone`, `.grain`, `text-pink`/`bg-pink`, `rise rise-1..5`. **No radii** (tokenized to 0). **Anton + Space Mono only.**

## Screens / Views
Each screen has a stable badge id in the prototype (`#home`, `#forge`, etc.). Existing route in parentheses.

### 1. Home (`/` — `src/app/page.tsx`) — *revise existing*
- **Purpose:** Convert first-time visitors; explain the model; showcase artists.
- **Layout:** `StudioShell` > full-bleed hero (~620px) with the studio photo as background, left-weighted gradient scrim (`linear-gradient(90deg,#0a0a0a 22%,…transparent)`) + `.halftone` overlay > "How it works" 3-col > "Featured artists" 4-col.
- **Key change from current:** Hero uses **`public/images/hero.png`** as a full-bleed background (currently a plain black hero). Featured artist cards use **real portfolio images** (`public/portfolio/*.png`) via `ArtistCard`, not `bg-pink`/`bg-cream` color blocks.
- **Components:** `NEW / Side B Out Now` sticker (`.sticker`, rotate ~-3°); eyebrow `▸ THINK IT. INK IT.` (Space Mono, 11px, `tracking-[0.28em]`, `text-pink`); `<SlashHeadline before={<>Tattoo<br/>your</>} slashed="way" size="hero" />`; lede with `.scribble text-pink` on "find the artist"; primary `<TapeCTA size="lg">Start your design</TapeCTA>` + ghost "Browse artists".

### 2. Forge (`/generate` — `src/features/Generate.jsx`) — *fills output-card gap*
- **Purpose:** Core create screen — prompt in, four generated cuts out.
- **Layout:** `StudioShell` with **right sidebar** (`rightSidebar` prop) = Pipeline (3 steps) + brief checklist. Meta bar top (`● The Forge — Generate Mode` / `Model: SDXL v2`). Main: prompt textarea (Anton 24px, `border-2` focus `border-pink`) > suggestion chips > action row (status + `Regenerate` tape) > **2×2 results grid**.
- **NEW — Output card** (the missing pattern): `border-2 hairline` cell; `aspect-square` image on `bg-bone`; footer row (`border-t-2 hairline`) with `Cut 0N · 1024²` label + actions `Layers / Save / Iterate`. **Selected** state = `border-pink`, 6px pink top bar, `PICK / Selected` sticker top-right.

### 3. Artists (`/artists` — `src/app/artists/page.tsx`) — *revise existing*
- **Purpose:** Browse/filter the roster.
- **Layout:** meta bar > `<SlashHeadline before="The" slashed="roster" />` > search input (Anton 24px) > **sticky filter chip row** (`border-y hairline`, active chip = `bg-pink text-black`) > responsive card grid (`sm:2 / lg:3 / xl:4`).
- **Key change:** `ArtistCard` thumbnails use real `public/portfolio/*.png`. Favorite heart top-right (`♥` filled `text-pink` when saved, else `♡`); style tag bottom-left on a `bg-cream` chip.

### 4. Artist Profile (`/artists/[slug]` — `src/app/artists/[slug]/page.tsx`) — *NEW pattern, fills gap*
- **Purpose:** Prove an artist, then book.
- **Layout:** breadcrumb meta > two-col hero (`420px` portfolio image | info panel) > portfolio grid (`4-col`, `aspect-square`, last cell `+17 more`).
- **Components:** `★ 4.9 / 212 reviews` sticker top-right of info panel; `▸ Fineline · Blackwork` eyebrow; `<SlashHeadline slashed="Volkov" before="Kira" />`; stat row (`10yr` / `840` pieces / `$180/hr`, big Anton numbers in `text-pink`, `border-t hairline`); `<TapeCTA>Book the chair</TapeCTA>` + ghost `♥ Favorite`.

### 5. My Designs (`/designs` — `src/app/designs/page.tsx`) — *revise + fills empty-state gap*
- **Purpose:** Saved-design dashboard.
- **Layout:** `<SlashHeadline slashed="designs" before="My" />` > 3-col card grid. Cards: `aspect-square` image + footer with title (Anton, sentence case) + status (`Saved 2d ago · Draft` in white/45, or `Sent to artist` in `text-pink`).
- **NEW — Empty state:** centered `//` glyph (Anton ~90px, `text-pink/25`), `No cuts yet.` headline, one-line explainer, `<TapeCTA>Open the Forge</TapeCTA>`. Show when `designs.length === 0` (store is `useDesigns()` in `src/lib/tattStorage`).

### 6. Pricing (`/pricing` — `src/app/pricing/page.tsx`) — *matches current, refined*
- **Layout:** `<SlashHeadline slashed="tier" before="Pick your" />` > 3-col tier grid. Pro card = `border-pink` + rotated `Most Popular` tape badge (`rotate-[8deg]`, top-right, `-top-3 -right-3`). Each card: `.sticker` tier tag, big `$` price (Anton 60px), feature list (`▸` bullets `text-pink`, `border-t hairline`), CTA (Pro = tape, others = ghost).

### 7. Sign Up (`/signup` — `src/app/signup/page.tsx`) — *fills form-input gap; replaces glitchy login*
- **Layout:** two equal cols. Left = brand panel (hero photo @ 0.5 opacity + `.halftone` + bottom scrim, `Think it. / Ink it.` display, testimonial). Right = form.
- **NEW — Form input pattern:** label (Space Mono 10px `tracking-[0.24em]` uppercase white/55) above field; field = `border-2 hairline`, focus/active `border-pink`. Primary `Create account` tape (full width). OAuth = 3 ghost buttons (Google/Apple/GitHub). Divider `Or continue with` (hairline rules). **Replaces the old glitched login** (offset white box behind the button, slashed headline, all-caps mono placeholders reading as filled text).

### 8. About (`/about` — `src/app/about/page.tsx`) — *revise existing*
- **Layout:** `.halftone` manifesto hero (`<SlashHeadline slashed="rules" before={<>Your body.<br/>Your</>} />` + `.scribble` lede) > 4-col stat strip (`border` dividers, Anton numbers `text-pink`) > 3-col values (`01/02/03`).

### 9. Book Flow (`/book` — `src/app/book/`) — *NEW step-indicator, fills gap*
- **Purpose:** design → artist & time → confirm/deposit.
- **NEW — Step indicator:** full-width 3-cell bar under nav; active cell = `bg-pink/6` + 4px pink top bar + `text-pink` number; done cell shows `✓ <design name>`; future cell dimmed.
- **Layout:** main (artist options as selectable rows — selected = `border-pink` + `PICKED` sticker; time-slot chip grid, selected slot = `bg-pink text-black`) + right summary rail (line items, `$80` deposit in big Anton, `Confirm & pay` tape). *(The `$80` is placeholder mock copy — real deposits are size-tiered $75/$150/$300/$500 per ADR-0040; render `depositDollarsForSize`.)*

### 10. Matches / Swipe (`/matches` — `src/app/matches/page.tsx`) — *revise existing*
- **Purpose:** Tinder-style artist matching (uses `react-tinder-card`).
- **Layout:** meta bar (`Card 3 / 18`) > centered card stack (`440×520`, two rotated `hairline` ghost cards behind, front card `border-pink` + `10px 10px` pink-alpha hard shadow) > controls row: Skip `✕` (`64px` hairline square), Rewind `↺` (`52px`), Match `♥` (`76px` `.tape` square).
- **Card:** 360px portfolio image (`bg-bone`) + style `bg-cream` tag; body = name (Anton 30px) + `★ rating`, meta line, one-line match blurb (`94%`).

### 11. Settings (`/settings` — `src/app/settings/page.tsx`) — *revise existing*
- **Layout:** two-col — left `220px` section nav (active item = `bg-pink text-black`, Danger zone = `text-pink`), right content.
- **Components:** profile fields (2-col, same input pattern as Sign Up); current-plan card (`border-pink` + `bg-pink/6`, `Pro $19/mo`, ghost `Manage`) — *the `Pro $19/mo` mock is dead copy: there is no consumer subscription (ADR-0041); a plan card, if kept, shows free-generation/credit balance instead*; **toggle switches** (`52×26` hard rectangle, ON = `bg-pink` with knob pushed right, OFF = `bg-white/15`); danger-zone card (`border-pink`, solid `bg-pink` Delete button).

## Interactions & Behavior
- **Nav active state:** current route link = `text-pink`, others `text-white/70 hover:text-pink` (see `StudioShell`).
- **Tape CTA:** rest shadow `6px 6px 0 0 white`; hover `10px 10px` + translate `-2px,-2px`; active `2px 2px` + translate `3px,3px`. 120ms linear-ish.
- **Chips / ghost buttons:** hover inverts to `bg-pink text-black`.
- **Motion:** entrances only via `.rise rise-1..5` (hard `steps(6,end)` cut-in). **No fades, no springs, no `transition-all`.**
- **Glitch:** `.glitch:hover` on the wordmark only — pink + cyan (`#00f0ff`) chromatic shift. Cyan is allowed *nowhere else*.
- **Forge generation loading (recommended, per DESIGN_SYSTEM gaps):** the tape CTA has no in-flight state yet — add a disabled/`Cutting…` state during generation.
- **Empty states:** `/designs` and any list should render the `No cuts yet.` pattern when empty.

## State Management
Existing Zustand + localStorage stores in `src/lib/tattStorage` — reuse, don't add new ones:
- `useDesigns()` — saved designs (drives My Designs grid vs empty state, header `◆ N` count).
- `useFavorites()` — favorited artists (heart state, `♥ N` count, Matches).
- `useBookings()` — bookings (`▣ N` count, Book flow result).
- `useDemoUser()` — auth stub (account dropdown; Sign Up / Settings). Note: still localStorage-only — not wired to Firebase Auth.
- Forge state → `useForgeStore` (`src/stores`).

## Design Tokens (all already in the repo)
- **Colors:** pink `#ff1f6b` (`--pink` / `text-pink`), pink-deep `#d6004f`, ink `#0a0a0a` (`bg-black`), bone `#f5f5f0` (`text-white`), cream `#e8d9b8` (`bg-cream` — sticker paper only). Hairlines: pink `/0.35`, white `/0.20`, soft white `/0.10`. **No greys.**
- **Type:** Anton (`font-display`, uppercase, headings/buttons/numbers 16px+); Space Mono (`font-body`, everything ≤15px, all system labels uppercase `tracking-[0.18em–0.28em]`, `tabular-nums` on numbers).
- **Radius:** `0` everywhere (tokenized). Only `rounded-full` for dots/pips.
- **Texture:** `.halftone` (pink dot grid, 14px pitch, 0.18 opacity, screen blend) + `.grain` (feTurbulence, 0.12, overlay) — pair them on full-page roots.

## Assets
Real files already in `public/` (also copied into this bundle under `assets/` for reference):
- `public/images/hero.png` — studio "in-progress" photo; Home hero bg + Sign Up brand panel.
- `public/portfolio/artist_*.png` — generated tattoo art used for artist thumbnails, Forge output cards, My Designs, portfolio grids, and the Matches card. In production, pull real artist portfolio images from the artist records rather than hardcoding these.

## Files
- `TatT Site.dc.html` — the design reference (open in a browser to view all 11 screens; badges `#home`, `#forge`, `#artists`, `#profile`, `#designs`, `#pricing`, `#signup`, `#about`, `#book`, `#matches`, `#settings`).
- `assets/` — the images referenced above.

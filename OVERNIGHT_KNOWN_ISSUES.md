# Overnight — Known Issues / Not Done

Honest list of things noticed but not fixed during this session, with
the reason.

## Tier 2 (Forge) — done except one minor

- ~~**Forge "Save to Portfolio" doesn't write to `tatt:designs`.**~~
  **Resolved in `65bb843`.** `handleGenerate(finalize=true)` now calls
  a new non-hook `addDesignToStorage` helper from `tattStorage.ts`
  that persists the enhanced (or raw) prompt to the same key the
  stencil page uses. Refine generations intentionally skip
  persistence — only finalize commits show up on /designs.
- **"BACK TO STENCIL" tape CTA in the Forge chrome.** Still not
  added. Low priority — the Forge is the actual studio, stencil is
  the entry point, and the existing top nav already has a Forge link.
  Worth adding if user testing shows people getting lost in the
  Forge and wanting to start a new prompt fresh.

## Tier 3 (shared components) — page adoption deferred

- **No page adopts the new TapeCTA / SlashHeadline / etc. yet.** The
  components were shipped as net-new files only. Refactoring the ~15
  inlined sites is a follow-up — adoption produces zero visual diff
  since the components match the existing class output exactly.
- **`ArtistCard` not extracted.** Inlined in /artists, /matches,
  /artists/[slug] related, /designs. Same follow-up.

## Tier 4 (mobile polish) — light pass shipped

- ~~Mobile sweep not attempted.~~ **Resolved in `a011be3`.** Desktop
  count chips (◆ designs, ▣ bookings) now show from md (≥768px)
  instead of lg (≥1024px) so tablet users see them. Mobile drawer
  surfaces counts inline next to each nav item label (only when
  non-zero), plus a "My Bookings N" row when bookings exist. Artist
  profile tabs row scrolls cleanly on narrow viewports via
  `overflow-x-auto` + negative-margin bleed. Other grids already
  collapsed to 1-col on mobile and the booking stepper already
  stacked vertically — those were correct from prior sessions.
- **Untested on a real 375px device.** Code-reading only. If anything
  breaks on a real iPhone SE viewport, it's likely the hero text on
  `/` ("Tattoo your way." at 72px) or the `/artists/[slug]` name
  header at 56px when the name is long. Both fit on paper; verify
  live before declaring done.

## Tier 5 (loading/error/empty) — gaps

- **`error.tsx` exists at `src/app/pitch/error.tsx` and
  `src/app/generate/error.tsx`.** I did not redesign these — they're
  out-of-system but pitch is explicitly off-limits and generate is
  being actively rewritten by the parallel session.
- ~~**No `error.tsx` for /artists, /matches, /designs, /book,
  /bookings, /login, /signup, /settings.**~~ **Resolved in `77b811a`.**
  All nine routes now have their own `error.tsx` delegating to a
  shared `PunkErrorBoundary` component with scoped label, description,
  and contextual back-CTA (e.g. /matches errors offer "Browse Roster
  Instead" rather than the generic "Go Home"). `/designs/[id]` also
  has its own error boundary (`e482adb`).
- ~~**Empty state for `/matches`**~~ **Resolved in `fbe1912`.** Page
  adapts its headline ("Your matches." vs "Explore the roster."),
  status bar, body copy, and adds a hairline banner with a "Browse
  Roster" CTA when no favorites exist. The 12 mock artists are still
  rendered, but framed as a warm-up exploration instead of "your
  matches" — honest about the demo state.
- **Empty state for `/bookings`** — confirmed in a subsequent commit:
  the page does have a punk empty state ("No bookings yet." + tape CTA
  back to /book). Shipped as part of `a2690f2`. Verified.

## Tier 6 (stretch) — not attempted

- Theme toggle. Not attempted — would require duplicating every color
  token decision in DESIGN_SYSTEM.md for a light variant. Big surface
  area, low value for a demo.
- ~~Real placeholder design generation that routes to `/designs/[id]`.~~
  **Fully resolved.** `/designs/[id]` shipped in `e482adb`; /designs
  grid tiles deep-link into it (`1283882`). The Forge's
  finalize-generate also writes to tatt:designs (`65bb843`), so real
  generations populate the route too. The only follow-up is making
  the detail page's "Iterate" CTA pre-fill the stencil prompt with
  the saved design's prompt — currently it routes to a blank stencil
  page. One-line change once the stencil page accepts a `?prompt=`
  query param.
- ~~Footer on app pages.~~ **Resolved in `1283882`.** PunkFooter now
  rendered by StudioShell on every app route (default-on, opt out
  with `footer={false}`). Removed six redundant manual `<PunkFooter />`
  instances from the marketing pages so there's a single source of
  truth.
- Live design count + favorite count in top nav — **shipped** in
  `5910cde`: the desktop nav now surfaces `◆ N` (designs), `▣ N`
  (bookings), and `♥ N` (favorites) when each store is non-empty,
  all hydration-gated.

## Tech debt / observations

- **Pre-existing `error.tsx` files in `pitch/` and `generate/` still
  use the legacy purple gradient.** Worth a focused cleanup pass.
- **Two sessions on one branch is risky.** We managed it via strict
  add-vs-modify discipline; future overnight runs should pick one
  session per branch.
- ~~**Build verification not run end-to-end overnight.**~~ Ran
  `npm run build` after the final commit (`a011be3`); build
  succeeded, all 18 routes compiled including the new dynamic
  `/designs/[id]`. Zero errors, zero warnings. Only side effect was
  the known `next-env.d.ts` drift, reverted before pushing.
- **`next-env.d.ts` drift on build.** Running `npm run build` in this
  checkout strips one `<reference>` line from `next-env.d.ts` every
  time (Next 16 quirk). Reverted before every commit so the working
  diff stays clean. Not introduced by this session.
- **`npx tsc --noEmit` outside `next build` is unreliable here.** It
  reports "Cannot find module 'react/jsx-runtime'" against every file
  in the project, even untouched ones, even after `npm install`. The
  authoritative typecheck path is `next build` (which one of the two
  sessions did run, and it stayed green).
- **Two sessions confusion.** Each session wrote an `OVERNIGHT_REPORT.md`
  and `OVERNIGHT_KNOWN_ISSUES.md` independently. The second-to-write
  session clobbered the first's, noticed via the +150/-141 diff stat,
  restored the first's version, and then augmented it. If two
  overnight sessions are ever run on the same branch again, the
  reports should be split into per-session files
  (`OVERNIGHT_REPORT_A.md` / `..._B.md`).

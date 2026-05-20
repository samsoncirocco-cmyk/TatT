# Overnight Known Issues — 2026-05-19/20

Things I noticed but did not fix in the Cowork session. Honest reasons.

## Tier 2 — Forge integration was deferred

The prompt assumed `src/app/generate/page.tsx` "wraps the legacy
`@/features/Generate` in `StudioShell`, creating a double-header" and
asked me to remove the inner header. Two problems with that as a
starting point:

1. `src/features/Generate/index.ts` exports only named symbols, no
   `default`. `dynamic(() => import('@/features/Generate'))` therefore
   has nothing to render — the current page shows the StudioShell
   chrome + an empty body, not a double-header. Fixing this needs a
   product decision about which underlying component the page is
   supposed to mount (`GenerateContent.jsx`?
   `DesignGeneratorRefactored.jsx`?), not a UI edit.
2. There is no "Save to Portfolio" action anywhere in the codebase
   today (grepped `portfolio` — only matches are `portfolioImages` on
   artist cards in match-pulse). Tier 2.2 had nothing to wire.
3. The parallel agent shipped multiple `forge(visual):` commits
   restyling the Forge subcomponents while my session was active.
   Touching the Forge mount point at the same time would have
   guaranteed conflicts.

**Recommended follow-up:** decide what `/generate` is supposed to
render today, then re-scope Tier 2 in one focused commit.

## Tier 4 — Mobile sweep not attempted

The prompt called for a methodical responsive sweep across
`/artists`, `/matches`, `/artists/[slug]`, `/book`, `/pricing`,
the top-nav drawer, and `/generate/stencil`. I'd already touched
five of those files in Tier 1 work; piling responsive class
additions on top in the same session felt risky and unlikely to
land a coherent mobile pass. Honest answer: ran out of time + did
not want to break the parallel agent's work.

The known mobile rough spots are:
- `/artists` and `/matches` grid is 1 col mobile, 2 col `sm`, etc. —
  the prompt asks for 1-col mobile (currently working) but verify.
- `/book` calendar stays 7-col even on narrow viewports; cells get
  very small below 360px.
- `/pricing` already wraps decently; verify "MOST POPULAR" diagonal
  badge stays readable.
- `/bookings` (my new route) is single-column already; should be fine.
- Sticky filter chips on `/artists` use horizontal `overflow-x-auto`,
  which I confirmed works in dev — but I didn't test on a real device.

## Tier 6 — Most stretch items skipped

Only shipped the live design/booking nav counts. Did not attempt:
- Theme toggle (light variant of the punk system).
- `/generate/stencil` CTA actually routing to a `/designs/[id]`
  view that shows the new design — would require a real
  `/designs/[id]` route plus a placeholder asset.
- Real app-vs-marketing footer split — the existing `PunkFooter`
  exists but isn't mounted in `StudioShell`, and deciding where it
  belongs is a product decision I didn't want to make alone.

## Misc

- `next-env.d.ts` gets modified every time `npm run build` runs in
  this checkout (Next 16 strips one `<reference>` line, the original
  file restores it). I reverted it before each commit so the diff
  stays clean. Not a problem I introduced and not worth investigating
  during overnight work.
- `npx tsc --noEmit` outside of `next build` reports phantom errors
  ("Cannot find module 'react/jsx-runtime'") for every file in the
  project, including untouched ones, even after `npm install`. The
  authoritative typecheck path here is `next build`. Pre-existing.
- The `<FavoriteButton/>` heart SVG path is hand-rolled to look like
  a sharpie stroke. Whether it actually reads as "sharpie" vs. just
  "wonky heart" is a subjective call — first review may want to nudge
  it.
- I added `confirm()` dialogs to the delete buttons on `/designs` and
  `/bookings`. These are browser-default UI, not in the punk system.
  A punk-styled confirm modal would be the right follow-up, but that's
  net-new design surface area (`DESIGN_SYSTEM.md` notes "Modal /
  dialog" as a gap).
- ArtistCard was the one Tier-3 component I didn't extract. The three
  current usages (favorite-toggle card on `/artists`, match-% sticker
  card on `/matches`, hero block on `/artists/[slug]`) have enough
  divergent affordances that forcing a single component would mostly
  shuffle prop plumbing. Easier to extract once a fourth usage clarifies
  the shape.

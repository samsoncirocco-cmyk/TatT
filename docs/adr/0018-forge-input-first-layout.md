# The Forge is input-first: prompt and GENERATE above the fold for everyone

Decided 2026-07-22 (grill session on issue #102, with Samson). Trigger: first
real outside user feedback — "trying to mess around with your website and it's
actually hard to do" — plus a walk of the same path confirming the prompt box
and GENERATE button sat below the fold behind a manifesto block and two side
panels at laptop size.

The Forge page (`/generate/stencil`) leads with the action: prompt box, style
chips, and GENERATE visible without scrolling for every user on every visit.
The manifesto is one line of context under the input. The Checklist
(subject/placement/mood/constraint) survives as a compact hint row near the
prompt box. The decorative Pipeline panel and the site-wide floating dock are
deleted.

## Considered Options

- **Special first-run mode** (minimal page for new users, full ceremony after
  first generation) — rejected: the state is not reliably detectable (cleared
  cookies, incognito, new devices), so it breaks in obvious ways, and it doubles
  the layouts to build and test.
- **Trim the copy but keep the layout** — rejected: too timid; the core
  problem is the action below the fold, not the word count.
- **Reorder for everyone** — chosen: one layout, no state, returning users
  also came to type, not to read.
- **Pipeline panel: keep (moved below results)** — rejected: its rows are
  buttons wired to nothing, i.e. dead UI; the same "honest, not vaporware"
  rule that relabeled AR (PR #90) applies to chrome.
- **Checklist: delete entirely** — rejected for now: it is honest advice that
  helps first-timers write a better prompt; kept as a hint row, cheap to remove
  later if chips + placeholder prove sufficient.
- **Floating dock: keep or restyle** (Home/Demo/Forge/Pitch, old ducks-green
  theme) — rejected: redundant with the top nav, violates the no-old-theme
  rule, and advertises the investor pitch deck in public product chrome.
  Deleted; `/demo` and `/pitch` remain reachable by direct URL.

## Consequences

- "Done" check for any future Forge change: on a fresh laptop-size window,
  prompt + GENERATE visible with zero scrolling, and a real generation works.
- `/demo` and `/pitch` lose their in-product discoverability on purpose —
  they are Samson-driven show-and-tell pages, not user destinations.
- If the checklist hints later prove redundant, removing them is a one-line
  decision, not a re-litigation of this ADR.

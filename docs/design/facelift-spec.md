# Facelift spec — the working bible

Decisions: ADR-0032 (two-register system), ADR-0033 (copy laws). Locked
2026-07-27. This file is the implementer-facing expansion; if it ever
contradicts the ADRs, the ADRs win.

## North star

One brand, two volumes. Pop-punk face (pink-on-black, DIY, tape/scrawl,
*Tickets to My Downfall*-era energy — aesthetic anchor only, never referenced),
calm hands on every commitment screen. The calm screens are the acoustic track
on the pop-punk record, not a different band.

## Register map

| Surface | Register | Notes |
|---|---|---|
| `/` home | Loud | showcase stays honest (AI-generated example labels) |
| `/design` shell + reveal | Loud | conversation content itself follows ADR-0023 consultant voice |
| `/gallery`, `/artists` browse, `/visualize`, `/about` | Loud | |
| `/swipe` | Loud | **Book CTA + confirm sheet = quiet** |
| `/artists/[slug]` | Split | loud showcase top; quiet booking module + provenance label |
| `/book`, slot picking, checkout summary, `/book/success` | Quiet | |
| `/bookings`, `/claim/*`, `/console`, `/settings`, `/pricing`, `/legal/*`, `/login`, `/signup` | Quiet | |

## Quiet dark (the calm register's look)

- Same black world; volume down. Warm grays (`#c9c5be` / `#a8a49c` band), white
  space doubled, no pink except one small accent maximum per screen, no tape /
  sticker / slash / scribble components.
- Optional single accent: a light "receipt" card (`#f2efe9`-family) for the
  final money summary only.
- Type: same family, smaller display sizes, sentence case. No ALL-CAPS
  tracking-wide headers in quiet screens.
- Never a light-theme page. Never a theme flip mid-funnel.

## Voice: the pop-punk confidant

The tattooed friend who's been through it. Lowercase-comfortable on loud
surfaces; plain, warm, exact on quiet ones. Same person, different rooms.

- Loud sample: "four cuts, fresh off the machine. one of these is yours —
  you'll know it when you see it."
- Quiet sample: "Your deposit goes to Nadia. All of it. Our fee is separate —
  you'll see both numbers before anything happens."
- Never: corporate filler ("unlock your journey"), hype-absurdism at money
  moments, fake urgency, fake counts (pre-launch honesty bar: no invented
  metrics, ever — see TAT-14's "no fake screens").

## Copy laws (ADR-0033, enforced in review)

1. TattTester everywhere user-facing; TatT is internal-only. Image2Ink only as
   the generator feature name / the image2ink.com door.
2. The money sentence on every money surface: who pays what, who keeps what.
3. The provenance label + claim door on every unclaimed artist profile
   (wording pending counsel; stance locked).

## Process: the preview gate

Every facelift PR must include: the Vercel preview URL, the list of changed
routes, and a one-line register declaration per route ("quiet dark applied to
/book"). Samson approves the look before merge; code review is separate and
does not substitute. Surgical diffs still apply — restyle a surface, don't
rewrite its logic.

## Build items (tracked in Linear)

1. Copy flip + money sentences + provenance labels (site-wide strings pass).
2. Quiet-dark treatment of the quiet-register screens.
3. Loud-surface systematization + the Studio facelift (`/generate`).
4. image2ink.com landing (copy exists: `docs/brand/image2ink-landing-copy.md`)
   + domain canonicalization (tatt-t.com → 301 tatttester.com).

# TatT — YC Demo Day Script (2 Minutes)

**Speaker:** Samson Cirocco
**Product:** TatT — AI-Powered Tattoo Design Platform
**Demo URL:** https://tatt-production.up.railway.app
**Backup:** Local `npm run dev` on laptop (pre-loaded, tested)

---

## Script (120 Seconds)

### OPENING — The Problem (0:00 – 0:20)

> *[Slide: Stats on screen]*
>
> "145 million Americans have a tattoo. Most of them went through the same broken process: scroll Instagram for hours, DM an artist, wait weeks for a sketch, show up to the appointment, and hope it looks right on your body.
>
> The $3.5 billion tattoo industry runs on guesswork. There's no way to iterate on a design before it's permanent. And there's no way to know if the artist you picked actually matches your style.
>
> **TatT fixes both of those problems.**"

### THE PRODUCT — Live Demo (0:20 – 1:10)

> *[Switch to live demo — browser on tatt-production.up.railway.app]*
>
> "Let me show you. I want a Japanese-style dragon wrapping around my forearm."
>
> *[Type prompt into generate page, click Generate]*
>
> "TatT doesn't just send this to an image model. It runs a **council of three AI agents** — Creative, Technical, and Style — that collaborate to enhance my prompt before generation. Think of it as having three tattoo experts brainstorm together.
>
> *[Results appear — 4-layer design]*
>
> "The output isn't a flat image. It's **four separate layers** — outline, shading, color, detail — just like a real tattoo artist works. These layers are print-ready stencils.
>
> *[Click to AR/Visualize page]*
>
> "But here's the real unlock: I can **preview this on my actual body** using AR. Resize it, move it, see exactly what it'll look like before I commit.
>
> *[Show AR overlay on arm — resize and rotate]*
>
> "And when I'm ready, TatT's **Smart Match** engine uses vector search and a graph database to find artists whose portfolios align with this exact style — not just keyword matching, actual semantic similarity.
>
> *[Show match results with artist cards]*
>
> "From idea to design to artist — in under 60 seconds."

### MARKET + BUSINESS MODEL (1:10 – 1:35)

> "$3.5 billion US market. 30% of adults under 30 have a tattoo, and the fastest-growing segment is first-timers who don't know where to start. That's our user.
>
> **Three revenue streams:**
> 1. **Consumer SaaS** — Free tier gets 3 designs/month. Pro at $12/month gets unlimited + AR + stencil export.
> 2. **Artist marketplace** — Verified artists pay $29/month for a storefront with AI-powered client matching. We take 10% on bookings.
> 3. **Enterprise** — Tattoo parlor chains get white-label design tools and booking management.
>
> **Unit economics work at scale:** AI generation costs $0.02/design. Consumer LTV at $12/month with 8-month retention = $96. CAC target: under $15 via organic + artist network effects."

### THE ASK (1:35 – 1:50)

> "We're raising $500K to:
> 1. Launch the marketplace and onboard 500 artists in 3 cities
> 2. Ship the mobile app with native AR
> 3. Hit 10,000 monthly active users
>
> Tattoos are forever. The process of getting one shouldn't be this broken."

### CLOSE (1:50 – 2:00)

> *[Back to landing page]*
>
> "TatT. From idea to ink.
>
> I'm Samson Cirocco — try the demo at **tatt.ai**."
>
> *[QR code on screen]*

---

## Demo Flow — Step by Step

| Time | Action | Screen | Fallback |
|------|--------|--------|----------|
| 0:00 | Open pitch page | `/pitch` | Slides (Google Slides backup) |
| 0:20 | Navigate to Generate | `/generate` | Pre-recorded video |
| 0:25 | Type prompt: "Japanese dragon forearm wrap, black and gray" | Generate input | Pre-typed in URL params |
| 0:30 | Click "Generate" | Loading animation | Have pre-generated result cached |
| 0:40 | Show 4-layer output | Generation results | Screenshot fallback |
| 0:50 | Click "Preview on Body" → AR | `/visualize` | Video of AR working |
| 0:55 | Resize/rotate design on arm | AR canvas | Same video |
| 1:00 | Click "Find Artists" | Match results | Static artist cards |
| 1:05 | Show top 3 artist matches | Match detail | Screenshot |
| 1:10 | Switch to market slide | Pitch page | Google Slides |

---

## Pre-Demo Checklist

- [ ] Laptop on power, display mirrored to projector
- [ ] Browser open to `tatt-production.up.railway.app`
- [ ] Pre-generate 2-3 designs (cache warm)
- [ ] Test AR on phone (mobile fallback)
- [ ] Backup: pre-recorded 60s demo video ready
- [ ] WiFi tested + mobile hotspot backup
- [ ] QR code printed on cards for audience
- [ ] `npm run dev` pre-started locally (offline fallback)

---

## Key Numbers to Memorize

| Metric | Number | Source |
|--------|--------|--------|
| US tattoo market | $3.5B | IBISWorld 2025 |
| Americans with tattoos | 145M (~40%) | Pew Research 2023 |
| Under-30 with tattoos | 30%+ | Harris Poll 2024 |
| Average tattoo cost | $200-$400 | Industry avg |
| Design generation cost | ~$0.02 | Replicate SDXL |
| Council enhancement | ~$0.02 | Vertex Gemini |
| Full workflow cost | ~$0.06 | All services |
| Target consumer price | $12/mo | Pro tier |
| Artist storefront | $29/mo | Marketplace tier |
| Marketplace cut | 10% | On bookings |

---

## Potential Q&A

**"Why not just use Midjourney/DALL-E?"**
> Generic image models don't understand tattoo anatomy — placement, skin tone adaptation, layer separation, or stencil conversion. Our council system and multi-layer output are tattoo-specific.

**"What's your moat?"**
> Three things: (1) The artist graph — network effects make matching better with every artist who joins. (2) Tattoo-specific AI training data. (3) The AR body mapping, which requires proprietary depth calibration per body part.

**"How do you acquire artists?"**
> Artists come for the clients. We start in 3 cities with in-person onboarding at conventions and shops. Artists who join get a verified profile, AI-powered portfolio tagging, and matched leads. It's a lead-gen tool for them.

**"How do you acquire consumers?"**
> SEO + content ("what tattoo should I get" has 150K monthly searches). Organic sharing of AR previews on social. Artist referrals. The design tool is free — conversion to Pro happens when they want stencil export or unlimited generations.

**"What if someone generates something offensive?"**
> Content policy + automated safety classifiers on all prompts. Same approach as major AI platforms, with additional tattoo-specific guidelines (no face tattoos on minors, cultural sensitivity checks).

---

*Last updated: March 12, 2026*
*Prepared by: Paul (AI Assistant)*

# TatT Council — Plan

**Status:** plan-of-record as of 2026-05-20. **Supersedes** the older docs listed under [Obsolete docs](#obsolete-docs) below.

## What the council is

A short pipeline that turns a customer's plain-English tattoo idea into an image they can iterate on. Six agents, sequential, single file, no orchestration framework.

```
customer text
   ↓
[1. brief]            structured intent (placement, style, subjects, vibes)
   ↓
[2. research]         3–6 reference image candidates per named subject
   ↓ (customer picks one per subject, or uploads their own, or skips)
   ↓
[3. composition]      spatial layout for the placement
   ↓
[4. style]            visual treatment for the brief
   ↓
[5. prompt + image]   routes to flux-pulid / flux-redux / flux-1.1-pro
   ↓
[6. critic]           vision-model check vs the brief; one revision pass max
```

Reference implementation: `~/tatt_council.py` on killua (~400 lines, working end-to-end as of 2026-05-20). Search backend uses `ddgs` (benchmarked 0 rate-limits, 5/5 queries returned valid images).

## The two flows it serves

**Flow A — single-subject tattoo** (~70% of requests).
One character, one animal, one portrait, one piece of typography. Customer types idea → app shows 3–6 reference candidates → customer picks → council generates. Image model is `flux-pulid` for faces, `flux-redux` for other single subjects with a reference, `flux-1.1-pro` for text-only.
Per-generation cost: **~$0.05–$0.10**.

**Flow B — multi-subject scene** (~30% of requests).
Sleeve with multiple characters fighting; family portraits; "dragons vs knights" scenes. Two sub-paths:
- **B1 — generate per character, then composite.** Loop Flow A per subject, then a compositing agent (Pillow + the composition agent's layout instructions) arranges them. Slower, more accurate per character.
- **B2 — multi-reference at once.** ComfyUI workflow via `fofr/any-comfyui-workflow` with IP-Adapter Plus. One call, several references. Faster, may smush characters together.

Per-generation cost: **~$0.30–$1.00**.

## What's shared

The first four agents (brief, research, composition, style), the critic, and ~all UI hooks are the same in both flows. Only step 5 (image routing) and the compositor differ.

## Build order

1. **Wire `~/tatt_council.py` into TatT as a server-side service** (`src/services/council.ts` or equivalent). One existing `/api/generate` route consumes it. Make `/generate` render an actual tattoo for one customer request.
2. **Add the candidate-picker UI on `/generate`.** Grid of thumbnails per subject from step 2 above, click to select, upload-my-own, skip. This is the linchpin for *both* flows.
3. **Flow A end-to-end.** Single-subject path live in production. This is the MVP — most customer requests fall here, and it's the simplest path.
4. **Flow B1 (per-character compositing).** Loop + Pillow compositor + background removal. Two to three weeks after Flow A ships.
5. **Flow B2 (ComfyUI / IP-Adapter)** *only if* B1 quality isn't good enough.

Do not start step 2 before step 1 works.
Do not start step 3 before step 2 works.

## What the council does NOT solve

Plain Flux text-to-image cannot reliably draw named anime characters from text alone — verified 2026-05-20 by generating the MHA/DBZ sleeve example three times, all three of which collapsed to DBZ aesthetic. The fix is the **reference-image path** above, not better prompt engineering. If a customer wants a specific named character, the council needs an actual image of that character to condition on.

For franchises we want to support without forcing the customer to find a reference, the longer-term path is per-character LoRAs trained on official art. This is **explicitly out of scope** for the current build order; revisit only after Flow A ships and we have real customer data on which franchises drive revenue.

## Honest cost note

Generation runs on OpenRouter (text agents) + Replicate (image gen). At ~$0.07/generation and 100 designs/day that's ~$210/month. Charge accordingly.

## Secrets

All keys live in `~/.openclaw/workspace/.env` on killua (0600) and in Vercel's project env vars for the production deploy. Rotation log lives at `infra-state/SECRETS-ROTATION-LOG.md`. Do not commit keys to this repo.

## Obsolete docs

The following are pre-this-plan and should be moved to `docs/archive/` or deleted as part of step 1's PR:

- `docs/COUNCIL_QUICKSTART.md`
- `docs/LLM_COUNCIL_INTEGRATION.md`
- `docs/MULTI_CHARACTER_FIX.md`
- `docs/CHARACTER_ENHANCEMENT_SUMMARY.md`
- `docs/CHARACTER_ENHANCEMENT_TEST.md`
- `docs/ARCHITECTURE_REVIEW_CHARACTER_ENHANCEMENT.md`
- `docs/PHASE_2C_COUNCILSERVICE_MIGRATION.md`

Their content is either superseded by this plan or describes work that didn't actually ship to customers. Any genuinely-still-true facts in them should be folded into this plan, not preserved separately.

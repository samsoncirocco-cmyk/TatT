# ADR 0032 — Retire simulated artist verification

**Status:** Accepted
**Date:** 2026-07-27
**Issues:** TAT-33, TAT-23

## Context

Two scripts under `scripts/data_acquisition/` called themselves artist
validators:

- `artist_validator.js`, described as a prototype
- `production_validator.js`, described as production and as a Gemini
  integration

Both assigned `verified`, styles, quality, portfolio size, and engagement values
with `Math.random()`. In the production-named script, setting `GEMINI_API_KEY`
selected a function whose real API call was commented out and which returned
the same simulation. Its output defaulted to
`verified_artists_production.json`, and automatic runners passed that file to a
Neo4j importer that wrote `a.verified = true`.

An archived session recap says commit `4febacd` replaced the fake validator with
Gemini. The repository at this decision does not contain that implementation in
either validator. Historical completion language is not evidence of current
behavior.

The supported acquisition path is `execution/scrape_artists.py`. It explicitly
replaces these abandoned prototypes and emits observed candidate fields without
calling them verified.

## Decision

1. **No simulated result may use a production or verification label.** The two
   fake validators and the direct automatic runner/import chain are removed.
   There is no environment flag that implies real AI without a real request,
   response parser, and tests.
2. **Discovery is not verification.** A crawler may establish that a shop page
   links a handle or image. It does not establish professional identity,
   portfolio ownership, consent, tattoo-content percentage, quality, style, or
   suitability to receive money.
3. **Verification must carry provenance.** A future automated verifier must
   persist its method, model/version or reviewer, evidence timestamp, and an
   explicit result. Errors and missing configuration fail closed; they never
   mint a positive result.
4. **Identity and consent remain separate gates.** Even a real portfolio
   classifier would not prove that the claimant controls the artist identity or
   that TatT may host the work.

## Consequences

- No repository script now manufactures a “verified artist” dataset from random
  values.
- The canonical acquisition pipeline can continue producing candidate data for
  review and enrichment.
- Previously generated output is untrusted unless independently re-verified.
- A real automated validation pipeline is new implementation work, not a flag
  flip or a documentation correction.

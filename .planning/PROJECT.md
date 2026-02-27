# TatTester — GCP Infrastructure Migration

## What This Is

TatTester is an AI-powered tattoo design generator and visualization platform that helps first-time tattoo seekers overcome commitment anxiety. The creative pipeline (prompt enhancement, multi-model image generation, layer-based canvas editing, stencil/AR export, and hybrid artist matching) is built and functional. The infrastructure underneath is prototype-grade: fake embeddings, browser-only storage, no auth, no real security. This project migrates the entire backend to production-grade Google Cloud Platform services while keeping Neo4j for the artist relationship graph, and introduces a DOE (Directives-Orchestration-Execution) framework for maintainability and self-annealing.

## Core Value

Real artist matching powered by real embeddings, backed by infrastructure that won't embarrass you in a live investor demo or break when real users show up.

## Requirements

### Validated

<!-- Existing features confirmed working from codebase map -->

- ✓ AI Council prompt enhancement (Gemini fallback chain) — MVP
- ✓ Multi-model image generation routing (Replicate + Vertex AI Imagen) — MVP
- ✓ Layer-based canvas editing with Konva.js (transforms, blend modes, drag-and-drop) — MVP
- ✓ Export pipeline (PNG, AR asset, stencil B&W, PDF) — MVP
- ✓ Body part aspect ratio system — MVP
- ✓ Version history with branching and merging — MVP
- ✓ Neo4j artist relationship graph (mentor chains, style influences) — MVP
- ✓ Match Pulse real-time updates via Firebase — MVP
- ✓ Swipe-based artist discovery UI — MVP
- ✓ Demo mode for investor walkthroughs — MVP

### Active

<!-- Current scope: GCP migration + DOE framework -->

- [ ] Firebase Auth user accounts with cross-device session persistence
- [ ] Firestore for designs, versions, preferences (replace localStorage)
- [ ] Vertex AI text-embedding-004 for real semantic embeddings (replace mock Math.sin hash)
- [ ] Cloud Run as unified backend (replace Express proxy + scattered Next.js API routes)
- [ ] API Gateway + Cloud Armor for security, rate limiting, DDoS protection
- [ ] Cloud Storage + Cloud CDN for generated images (replace signed URLs)
- [ ] Secret Manager for all credentials (eliminate hardcoded dev tokens)
- [ ] BigQuery analytics pipeline for usage, spend, and match quality tracking
- [ ] Cloud Tasks for generation request queuing with per-user concurrency limits
- [ ] Neo4j proper backend integration (connection pooling, query timeouts, pagination)
- [ ] DOE framework (directives/ + execution/) for operational maintainability
- [ ] Self-annealing loop: errors update directives and execution scripts automatically
- [ ] Real artist data seeding with proper embeddings
- [ ] Server-side budget enforcement (replace client-side localStorage tracking)
- [ ] Onboarding documentation for new team members

### Out of Scope

- UI/UX redesign — creative pipeline UI works, don't touch it
- Canvas editor changes — Konva.js layer system is solid, no modifications
- AI Council architecture changes — fallback chain works, leave it
- Multi-model routing logic changes — generation router is functional
- Export format additions (SVG, etc.) — defer to post-migration
- Real-time collaboration (CRDTs) — defer to v2
- Mobile app — web-first, defer to v2
- Replacing Neo4j — first hire is a Neo4j expert, it stays

## Context

**Existing codebase:** ~50+ source files, Next.js 16 + React 19, TypeScript/JavaScript mix. Full creative pipeline functional. Infrastructure is the weak point.

**Team:** Founder + incoming Neo4j expert hire. Must be onboarding-friendly.

**Pressure:** Investor demos currently route around broken matching. Real users expected soon. No hard launch date but "flip the switch ready" is the bar.

**Critical gaps from codebase audit:**
- `hybridMatchService.ts` uses `Math.sin(hash)` mock embeddings — matching is effectively random
- `rate-limit.ts` always returns `true` — $500 Replicate budget unprotected
- Hardcoded `'dev-token-change-in-production'` across 5+ files
- CORS allows any `*.vercel.app` domain
- localStorage caps at 5-10MB but app needs ~15MB for heavy users
- Canvas service (458 lines) and hybrid matching (467 lines) have zero test coverage

**DOE operating philosophy:**
- Layer 1 (Directives): Markdown SOPs in `directives/` defining goals, inputs, tools, outputs, edge cases
- Layer 2 (Orchestration): AI routes between directives and execution scripts
- Layer 3 (Execution): Deterministic scripts in `execution/` for API calls, data processing, migrations
- Self-annealing: When something breaks → fix script → test → update directive → system is stronger

## Constraints

- **Stack**: Google Cloud Platform only (except Neo4j). No new non-GCP services.
- **Neo4j**: Must keep Neo4j for artist graph. First hire is an expert.
- **Budget**: $500 Replicate budget still applies. Server-side enforcement required.
- **Creative pipeline**: Do not modify canvas, council, routing, or export code.
- **Onboarding**: All infrastructure must be documented via DOE directives for new team members.
- **Security**: No secrets in client code, no hardcoded tokens, no wildcard CORS in production.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep Neo4j, don't replace with Firestore graph queries | First hire is Neo4j expert; graph traversal is Neo4j's strength | — Pending |
| GCP-only stack (drop Supabase) | Single cloud provider = unified billing, auth, monitoring | — Pending |
| DOE framework for ops | Deterministic scripts > AI doing everything; self-annealing improves over time | — Pending |
| Firestore over Cloud SQL | Flexible schema matches design data; real-time sync built in | — Pending |
| Vertex AI embeddings over third-party | Already on GCP; text-embedding-004 is production-grade; one less vendor | — Pending |
| Cloud Run over Cloud Functions | Need long-running requests for image generation polling; unified service | — Pending |

---
*Last updated: 2026-02-15 after project initialization*

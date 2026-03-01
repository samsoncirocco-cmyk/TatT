# TatT Documentation Hub

> Complete documentation index for the TatT AI-powered tattoo design platform.

## 🚀 Start Here

| If you want to... | Read this |
|-------------------|-----------|
| Get TatT running locally in 5 minutes | [QUICKSTART.md](QUICKSTART.md) |
| Understand the entire architecture | [../ARCHITECTURE.md](../ARCHITECTURE.md) |
| Debug a problem | [TROUBLESHOOTING.md](TROUBLESHOOTING.md) |
| Verify production readiness | [VERIFICATION.md](VERIFICATION.md) |
| Call the API | [API_REFERENCE.md](API_REFERENCE.md) |

---

## Architecture & Design

### System Overview

- **[ARCHITECTURE.md](../ARCHITECTURE.md)** — System diagrams, core flows, tech stack, deployment topology
- **[ARCHITECTURE_MAP_2026.md](ARCHITECTURE_MAP_2026.md)** — Detailed component map (2026 edition)

### Phase Documentation

TatT's infrastructure was rebuilt in 6 phases. These docs explain what was built and why:

| Phase | Focus | Status | Summary |
|-------|-------|--------|---------|
| 1 | Firebase Auth + Secret Manager | ✅ Complete | [../\.planning/phases/01-firebase-auth-secret-manager/](../.planning/phases/01-firebase-auth-secret-manager/) |
| 2 | Cloud Run + API Gateway | ✅ Complete | **[phase-2-summary.md](phase-2-summary.md)** |
| 3 | Firestore + Cloud Storage | ✅ Complete | **[PHASE3_SUMMARY.md](PHASE3_SUMMARY.md)** |
| 4 | Real Embeddings + Matching | ✅ Complete | [../\.planning/phases/04-real-embeddings-matching/](../.planning/phases/04-real-embeddings-matching/) |
| 5 | Analytics + Monitoring | ✅ Complete | [../\.planning/phases/05-analytics-monitoring/](../.planning/phases/05-analytics-monitoring/) |
| 6 | DOE Framework + CI/CD | ✅ Complete | [../\.planning/phases/06-doe-framework-cicd/](../.planning/phases/06-doe-framework-cicd/) |

### API Documentation

- **[API_REFERENCE.md](API_REFERENCE.md)** — Full API surface: endpoints, request/response schemas, auth headers
- **[API_V1_DOCUMENTATION.md](API_V1_DOCUMENTATION.md)** — Version 1 API specifics

---

## Setup Guides

### Local Development

1. **[QUICKSTART.md](QUICKSTART.md)** — Fastest path to running locally
2. **[COMPLETE_PROJECT_GUIDE.md](COMPLETE_PROJECT_GUIDE.md)** — Full walkthrough for beginners
3. **[VERIFICATION.md](VERIFICATION.md)** — End-to-end verification procedures

### Deployment

| Platform | Guide |
|----------|-------|
| **Vercel** (frontend) | [VERCEL_ENVIRONMENT_SETUP.md](VERCEL_ENVIRONMENT_SETUP.md) |
| **Railway** (backend proxy) | [RAILWAY_SETUP.md](RAILWAY_SETUP.md) |
| **GCP Cloud Run** (future) | [QUICK_START_GCP.md](QUICK_START_GCP.md), [gcp-setup.md](gcp-setup.md) |

### External Services

| Service | Guide |
|---------|-------|
| **Firebase** (auth) | [firebase-setup.md](firebase-setup.md) |
| **Supabase** (vector DB) | [SUPABASE_SETUP.md](SUPABASE_SETUP.md), [SUPABASE_VECTOR_SETUP.md](SUPABASE_VECTOR_SETUP.md) |
| **Neo4j** (graph DB) | [NEO4J_INTEGRATION_SUMMARY.md](NEO4J_INTEGRATION_SUMMARY.md) |
| **Google Cloud Storage** | [gcs-setup.md](gcs-setup.md) |
| **OpenRouter** (LLMs) | [OPENROUTER_SETUP.md](OPENROUTER_SETUP.md), [OPENROUTER_INTEGRATION.md](OPENROUTER_INTEGRATION.md) |

---

## Feature Documentation

### AI Design Generation

- **[LLM_COUNCIL_INTEGRATION.md](LLM_COUNCIL_INTEGRATION.md)** — Multi-model prompt enhancement (Claude + GPT-4 + Gemini)
- **[COUNCIL_QUICKSTART.md](COUNCIL_QUICKSTART.md)** — Getting started with the LLM Council
- **[MULTI_MODEL_ROUTING_ARCHITECTURE.md](MULTI_MODEL_ROUTING_ARCHITECTURE.md)** — Style-based model selection
- **[MULTI_MODEL_ROUTING_GUIDE.md](MULTI_MODEL_ROUTING_GUIDE.md)** — How to configure model routing
- **[CHARACTER_ENHANCEMENT_SUMMARY.md](CHARACTER_ENHANCEMENT_SUMMARY.md)** — Character reference detection

### Artist Matching (Neural Ink)

- **[NEURAL_INK_IMPLEMENTATION_SUMMARY.md](NEURAL_INK_IMPLEMENTATION_SUMMARY.md)** — Semantic artist matching
- **[HYBRID_MATCHING.md](HYBRID_MATCHING.md)** — Vector + keyword hybrid scoring

### Forge Canvas

- **[MAJOR_MILESTONE_FORGE_COMPLETE.md](MAJOR_MILESTONE_FORGE_COMPLETE.md)** — Layer-based design editor
- **[MULTI_LAYER_OUTPUT_IMPLEMENTATION.md](MULTI_LAYER_OUTPUT_IMPLEMENTATION.md)** — Layer decomposition

---

## Testing & Verification

- **[VERIFICATION.md](VERIFICATION.md)** — 📋 **Complete verification guide** with:
  - API key requirements
  - Feature verification matrix
  - End-to-end test procedures
  - Known issues
  - Production readiness checklist
- **[TESTING.md](TESTING.md)** — Test suite documentation (Vitest + pytest)
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** — Common problems and solutions

---

## Operational Runbooks

The DOE (Directive-Orchestration-Execution) framework lives in [`directives/`](../directives/):

| Runbook | Purpose |
|---------|---------|
| [deploy.md](../directives/deploy.md) | Production deployment procedure |
| [seed-artists.md](../directives/seed-artists.md) | Seed artist data to databases |
| [generate-embeddings.md](../directives/generate-embeddings.md) | Generate vector embeddings |
| [migrate-data.md](../directives/migrate-data.md) | Data migration procedures |
| [monitor-budget.md](../directives/monitor-budget.md) | Budget monitoring and alerts |
| [rotate-secrets.md](../directives/rotate-secrets.md) | Secret rotation procedure |
| [onboard-engineer.md](../directives/onboard-engineer.md) | New engineer onboarding |

Execution scripts live in [`execution/`](../execution/):
- `validate_env.py` — Environment validation
- `run_health_checks.py` — Service health checks
- `seed_artists.py` — Artist seeding automation
- `generate_embeddings.py` — Embedding generation
- `check_budget.py` — Budget status check
- `migrate_localStorage.py` — localStorage migration

---

## Migration History

These docs track TatT's evolution. Useful for understanding why things are the way they are:

### TypeScript Migration

- **[PHASE_2_TYPESCRIPT_MIGRATION_SUMMARY.md](PHASE_2_TYPESCRIPT_MIGRATION_SUMMARY.md)** — Migration strategy
- **[PHASE_2B_TYPESCRIPT_MIGRATION_COMPLETE.md](PHASE_2B_TYPESCRIPT_MIGRATION_COMPLETE.md)** — Phase 2b completion
- **[PHASE_2C_MIGRATION_COMPLETE.md](PHASE_2C_MIGRATION_COMPLETE.md)** — Phase 2c completion
- **[MIGRATION_STATUS.md](MIGRATION_STATUS.md)** — Current migration status

### Infrastructure Evolution

- **[GCP_CONSOLIDATION_COMPLETE.md](GCP_CONSOLIDATION_COMPLETE.md)** — GCP-only stack decision
- **[CORS_AND_API_FIX_SUMMARY.md](CORS_AND_API_FIX_SUMMARY.md)** — CORS resolution
- **[PRODUCTION_HARDENING_SUMMARY.md](PRODUCTION_HARDENING_SUMMARY.md)** — Security hardening

### Handoff Documents

- **[HANDOFF_PHASE_2C_TO_PHASE_3.md](HANDOFF_PHASE_2C_TO_PHASE_3.md)** — Phase 2c → 3 handoff
- **[handoff.md](handoff.md) ** — General handoff notes
- **[PR_DESCRIPTION.md](PR_DESCRIPTION.md)** — PR template/description

---

## Quick Reference

### Environment Variables

```bash
# Required for local development
REPLICATE_API_TOKEN=r8_...
FRONTEND_AUTH_TOKEN=$(openssl rand -hex 32)
VITE_FRONTEND_AUTH_TOKEN=$FRONTEND_AUTH_TOKEN

# Optional for full features
VITE_OPENROUTER_API_KEY=sk-or-...
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
SUPABASE_URL=https://xxx.supabase.co
NEO4J_URI=bolt://localhost:7687
```

Full variable reference: [VERIFICATION.md#api-keys--environment-variables](VERIFICATION.md#api-keys--environment-variables)

### Common Commands

```bash
# Development
npm run dev          # Start Next.js (port 3000)
npm run server       # Start Express proxy (port 3002)
npm run lint         # ESLint
npm run test         # Vitest

# Build & Deploy
npm run build        # Production build
vercel --prod        # Deploy to Vercel

# DOE Scripts
python3 execution/validate_env.py
python3 execution/run_health_checks.py --base-url http://localhost:3000
python3 execution/check_budget.py --dry-run
```

### Project Structure

```
TatT/
├── src/
│   ├── app/              # Next.js App Router (pages + API routes)
│   ├── services/         # Core business logic
│   ├── components/       # React components
│   ├── stores/           # Zustand state
│   ├── hooks/            # Custom hooks
│   └── config/           # Configuration
├── server.js             # Express proxy (Railway)
├── directives/           # DOE runbooks
├── execution/            # DOE scripts
├── generated/            # Seed data artifacts
├── docs/                 # 📍 You are here
└── tests/                # Test files
```

---

## Contributing

1. Read [ARCHITECTURE.md](../ARCHITECTURE.md) for system understanding
2. Check [VERIFICATION.md](VERIFICATION.md) to ensure tests pass
3. Follow the TypeScript migration pattern for new code
4. Use the DOE framework for operational tasks

---

**Questions?** Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) first, then open an issue.

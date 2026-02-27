# Requirements: TatTester GCP Migration

**Defined:** 2026-02-15
**Core Value:** Real artist matching powered by real embeddings, backed by infrastructure that won't break in front of investors or real users.

## v1 Requirements

### Authentication (AUTH)

- [ ] **AUTH-01**: User can sign up with email and password via Firebase Auth
- [ ] **AUTH-02**: User session persists across browser refresh and tab close
- [ ] **AUTH-03**: API routes reject unauthenticated requests (no more shared bearer token)
- [ ] **AUTH-04**: Middleware auth guards protect all /api/v1/* endpoints

### Data Persistence (DATA)

- [ ] **DATA-01**: User designs stored in Firestore (not localStorage)
- [ ] **DATA-02**: Version history stored in Firestore with branching/merging intact
- [ ] **DATA-03**: User preferences and settings stored in Firestore
- [ ] **DATA-04**: Progressive migration: app works with Firestore, falls back to localStorage for anonymous users
- [ ] **DATA-05**: No localStorage quota freezes — large data lives server-side

### Embeddings & Matching (MATCH)

- [ ] **MATCH-01**: Vertex AI text-embedding-004 replaces Math.sin mock embeddings
- [ ] **MATCH-02**: Semantic search returns meaningful results ("Japanese traditional" ≈ "Japanese old-school")
- [ ] **MATCH-03**: Artist portfolio embeddings generated and stored from real data
- [ ] **MATCH-04**: RRF weights configurable (not hardcoded 50/50)
- [ ] **MATCH-05**: Neo4j queries have timeouts (5s) and pagination (LIMIT 50)
- [ ] **MATCH-06**: Hybrid matching works end-to-end in live demo without faking

### Infrastructure (INFRA)

- [ ] **INFRA-01**: Cloud Run serves the unified backend (replace Express proxy + Next.js API routes)
- [ ] **INFRA-02**: API Gateway routes all external traffic with per-endpoint rate limits
- [ ] **INFRA-03**: Cloud Armor provides DDoS protection and WAF rules
- [ ] **INFRA-04**: CORS restricted to specific production domains (no wildcard *.vercel.app)
- [ ] **INFRA-05**: Cloud Tasks queues generation requests with per-user concurrency limits
- [ ] **INFRA-06**: Generated images served via Cloud Storage + Cloud CDN

### Security (SEC)

- [ ] **SEC-01**: All secrets in Secret Manager (zero hardcoded tokens in source)
- [ ] **SEC-02**: No API keys exposed to client-side code
- [ ] **SEC-03**: Server-side budget enforcement (not client-side localStorage tracking)
- [ ] **SEC-04**: Rate limiting actually works (not always-return-true stub)
- [ ] **SEC-05**: Firebase Auth tokens validated on every API request

### Analytics & Monitoring (MON)

- [ ] **MON-01**: BigQuery receives API usage events (generation, matching, council)
- [ ] **MON-02**: Budget spend tracked per model in BigQuery (Replicate vs Vertex)
- [ ] **MON-03**: Cloud Monitoring dashboards for error rates and API latency
- [ ] **MON-04**: Budget alerts trigger before $500 Replicate limit hit
- [ ] **MON-05**: Match quality events tracked (which matches users engage with)

### DOE Framework (DOE)

- [ ] **DOE-01**: directives/ directory with markdown SOPs for all operational tasks
- [ ] **DOE-02**: execution/ directory with deterministic Python scripts for ops
- [ ] **DOE-03**: Self-annealing loop: script failures update directive "Known Issues" sections
- [ ] **DOE-04**: validate_env.py checks all required env vars and service connectivity on startup
- [ ] **DOE-05**: Onboarding path: new engineer reads directives/ and is productive within a day

### CI/CD & Deployment (CICD)

- [ ] **CICD-01**: GitHub Actions pipeline: lint, test, build, deploy to Cloud Run
- [ ] **CICD-02**: Execution scripts tested in CI before merge
- [ ] **CICD-03**: Secrets injected from Secret Manager at deploy time (not in repo)

## v2 Requirements

### Real-time Collaboration

- **COLLAB-01**: Multiple users can view the same design simultaneously
- **COLLAB-02**: Artist can annotate client designs with suggestions

### Advanced Export

- **EXPORT-01**: SVG vector export for professional stencil resizing
- **EXPORT-02**: Direct stencil printer integration

### User Profiles

- **PROF-01**: User profile with design history and preferences
- **PROF-02**: Public portfolio sharing links

### Notifications

- **NOTF-01**: Email notifications for artist match updates
- **NOTF-02**: Push notifications for design comments from artists

## Out of Scope

| Feature | Reason |
|---------|--------|
| Canvas editor modifications | Working fine, not part of infrastructure migration |
| AI Council architecture changes | Fallback chain works, leave it |
| Multi-model routing changes | Generation router is functional |
| UI/UX redesign | Creative pipeline UI works |
| Mobile app | Web-first, defer to v2+ |
| Replacing Neo4j | First hire is Neo4j expert, it stays |
| OAuth social login | Email/password sufficient for v1 |
| Stripe payments | No monetization in v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| SEC-01 | Phase 2 | Pending |
| SEC-02 | Phase 2 | Pending |
| SEC-03 | Phase 2 | Pending |
| SEC-04 | Phase 2 | Pending |
| SEC-05 | Phase 2 | Pending |
| INFRA-01 | Phase 2 | Pending |
| INFRA-02 | Phase 2 | Pending |
| INFRA-03 | Phase 2 | Pending |
| INFRA-04 | Phase 2 | Pending |
| INFRA-05 | Phase 3 | Pending |
| INFRA-06 | Phase 3 | Pending |
| DATA-01 | Phase 3 | Pending |
| DATA-02 | Phase 3 | Pending |
| DATA-03 | Phase 3 | Pending |
| DATA-04 | Phase 3 | Pending |
| DATA-05 | Phase 3 | Pending |
| MATCH-01 | Phase 4 | Pending |
| MATCH-02 | Phase 4 | Pending |
| MATCH-03 | Phase 4 | Pending |
| MATCH-04 | Phase 4 | Pending |
| MATCH-05 | Phase 4 | Pending |
| MATCH-06 | Phase 4 | Pending |
| MON-01 | Phase 5 | Pending |
| MON-02 | Phase 5 | Pending |
| MON-03 | Phase 5 | Pending |
| MON-04 | Phase 5 | Pending |
| MON-05 | Phase 5 | Pending |
| DOE-01 | Phase 6 | Pending |
| DOE-02 | Phase 6 | Pending |
| DOE-03 | Phase 6 | Pending |
| DOE-04 | Phase 6 | Pending |
| DOE-05 | Phase 6 | Pending |
| CICD-01 | Phase 6 | Pending |
| CICD-02 | Phase 6 | Pending |
| CICD-03 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0

---
*Requirements defined: 2026-02-15*
*Last updated: 2026-02-15 after initial definition*

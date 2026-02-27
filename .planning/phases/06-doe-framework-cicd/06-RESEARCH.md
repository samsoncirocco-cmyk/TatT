# Phase 6: DOE Framework + CI/CD - Research

**Researched:** 2026-02-16
**Domain:** Operational documentation, CI/CD pipelines, self-healing systems
**Confidence:** HIGH

## Summary

Phase 6 focuses on operational excellence through the Directives of Execution (DOE) framework and automated CI/CD pipelines. The phase combines operational documentation patterns (runbooks/SOPs) with execution scripts and GitHub Actions automation to create a self-annealing system that maintains itself and enables rapid onboarding.

The project is a Next.js 16 + React app with a polyglot codebase (Node.js primary, Python operational scripts), currently deployed manually. The DOE framework provides a structured approach to operational documentation with executable counterparts, while GitHub Actions enables automated testing, building, and deployment to Google Cloud Run.

**Primary recommendation:** Use GitHub Actions for CI/CD with Docker multi-stage builds, implement operational runbooks in `directives/` with executable Python scripts in `execution/`, configure Cloud Run startup probes to run `validate_env.py` for environment validation, and adopt a self-annealing documentation pattern where script failures trigger directive updates.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| GitHub Actions | Native | CI/CD automation | Native GitHub integration, event-driven, free for public repos, 2000 min/month free for private |
| Docker Buildx | Latest | Multi-platform builds with advanced caching | Extended Docker with BuildKit, layer caching, multi-stage optimization |
| google-github-actions/auth | v2 | GCP authentication | Official Google action, supports Workload Identity Federation (zero-trust) |
| google-github-actions/deploy-cloudrun | v2 | Cloud Run deployment | Official Google action, handles revision management and traffic splitting |
| google-github-actions/get-secretmanager-secrets | v2 | Secret injection | Official Google action, fetches secrets at deploy time, masks in logs |
| Python 3.12 | 3.12-slim | Operational scripts | Current stable, slim image (70% smaller than full), LTS until 2028 |
| pytest | 8.x | Python test framework | Industry standard, BDD/TDD support, rich plugin ecosystem |
| Vitest | 4.x | JavaScript test runner | Already in project (v4.0.18), fast, Vite-native, Jest-compatible API |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| actions/cache | v4 | Dependency caching | Cache npm, pip, Docker layers between runs (2-10x speedup) |
| actions/upload-artifact | v4 | Test result uploads | Store JUnit XML, coverage reports, build artifacts |
| act | Latest | Local testing | Test workflows locally before push (`brew install act`) |
| pytest-cov | Latest | Python coverage | Generate coverage reports for Python scripts |
| @vitest/coverage-v8 | Latest | JS coverage | Already likely in project for Vitest coverage |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| GitHub Actions | Cloud Build (GCP-native) | Cloud Build has tighter GCP integration but less flexible, paid only, steeper learning curve |
| Docker multi-stage | Single-stage | Single-stage simpler but 500MB+ images vs 100-200MB multi-stage, security risk (build tools in prod) |
| Workload Identity | Service Account Key JSON | Key JSON simpler setup but violates zero-trust, key rotation burden, leaked keys = full account compromise |
| Python scripts | Node.js for everything | Node.js consistent language but Python clearer for ops scripts, better stdlib for file/process management |

**Installation:**
```bash
# No npm packages needed for CI/CD infrastructure
# Python dependencies for execution/ scripts:
pip install pytest pytest-cov google-cloud-secret-manager google-cloud-firestore google-cloud-storage neo4j-driver

# Local workflow testing:
brew install act  # macOS
# or: curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```

## Architecture Patterns

### Recommended Project Structure
```
.github/
└── workflows/
    └── ci-cd.yml           # Main pipeline: lint, test, build, deploy

directives/                 # Operational runbooks (markdown SOPs)
├── deploy.md               # Cloud Run deployment procedure
├── seed-artists.md         # Neo4j artist data import
├── generate-embeddings.md  # Vertex AI embedding generation
├── migrate-data.md         # Firestore data migration steps
├── monitor-budget.md       # Budget tracking and alerts
├── onboard-engineer.md     # New team member onboarding
└── rotate-secrets.md       # Secret Manager key rotation

execution/                  # Executable scripts (Python)
├── seed_artists.py         # Imports Neo4j data from JSON/CSV
├── generate_embeddings.py  # Generates embeddings for existing data
├── validate_env.py         # Startup environment validation
├── check_budget.py         # Query GCP billing API for spend
├── migrate_localStorage.py # Migrate browser localStorage to Firestore
└── run_health_checks.py    # Smoke tests for all services

tests/
├── execution/              # Unit tests for Python scripts
│   ├── test_seed_artists.py
│   ├── test_generate_embeddings.py
│   ├── test_validate_env.py
│   └── test_check_budget.py
└── ... (existing JS tests)
```

### Pattern 1: DOE Framework (Directives + Execution)
**What:** Pair each operational procedure (directive) with an executable script that automates it. Directives are human-readable SOPs; execution scripts are deterministic implementations.

**When to use:** For any operational task that will be repeated (deployments, data seeding, environment validation, migrations). Onboarding, monitoring, and incident response procedures.

**Example structure:**
```markdown
# directives/deploy.md

## Purpose
Deploy the application to Cloud Run production.

## Prerequisites
- [ ] All tests passing in CI
- [ ] Change approved in Slack #deployments
- [ ] Staging deployment validated

## Procedure
1. Trigger deployment:
   ```bash
   cd execution/
   python deploy_to_cloud_run.py --env production
   ```
2. Verify deployment:
   ```bash
   python run_health_checks.py --env production
   ```
3. Monitor logs for 5 minutes:
   ```bash
   gcloud run services logs read pangyo-production --limit 100
   ```

## Known Issues
### Issue: Cold start timeouts (2026-02-10)
**Symptom:** First request after idle period returns 504
**Root cause:** Startup probe timeout too aggressive (10s)
**Resolution:** Increased timeout to 30s in cloud-run.yaml
**Directive updated:** 2026-02-10 by @alice
```

### Pattern 2: Self-Annealing Documentation
**What:** When an operational script fails or a new issue is discovered, the engineer who fixes it MUST update the corresponding directive's "Known Issues" section. This creates a feedback loop where documentation self-improves based on real production experience.

**When to use:** After every incident, script failure, or manual intervention. Part of the definition of "done" for any operational fix.

**Example:**
```markdown
## Known Issues

### Issue: Neo4j connection timeout (2026-01-15)
**Symptom:** `seed_artists.py` fails with "ConnectionTimeout: Could not connect to Neo4j"
**Root cause:** Neo4j Aura paused after 72h inactivity
**Resolution:** Resume database in console, re-run script
**Prevention:** Added connection retry logic with exponential backoff in v2
**Directive updated:** 2026-01-15 by @bob
**Script updated:** execution/seed_artists.py commit abc123

### Issue: Embedding generation rate limit (2026-02-01)
**Symptom:** `generate_embeddings.py` fails halfway with "429 Too Many Requests"
**Root cause:** Vertex AI default quota 60 req/min
**Resolution:** Added --batch-size 10 --delay 1.0 flags
**Prevention:** Script now respects rate limits, shows progress bar
**Directive updated:** 2026-02-01 by @charlie
**Script updated:** execution/generate_embeddings.py commit def456
```

### Pattern 3: GitHub Actions CI/CD Pipeline
**What:** Event-driven pipeline that runs lint → test (Node.js + Python) → build Docker image → deploy to Cloud Run, with parallelization for independent steps and caching for speed.

**When to use:** Every push to `main` (full pipeline), every PR (lint + test only), manual workflow_dispatch (deployments).

**Example:**
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  test-js:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run test:coverage
      - uses: actions/upload-artifact@v4
        with:
          name: js-coverage
          path: coverage/

  test-python:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'
      - run: pip install -r execution/requirements.txt
      - run: pytest tests/execution/ --cov=execution --cov-report=xml
      - uses: actions/upload-artifact@v4
        with:
          name: python-coverage
          path: coverage.xml

  build:
    needs: [lint, test-js, test-python]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: actions/cache@v4
        with:
          path: /tmp/.buildx-cache
          key: ${{ runner.os }}-buildx-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-buildx-
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: false
          tags: pangyo:${{ github.sha }}
          cache-from: type=local,src=/tmp/.buildx-cache
          cache-to: type=local,dest=/tmp/.buildx-cache-new,mode=max
      # Rotate cache to prevent unbounded growth
      - run: |
          rm -rf /tmp/.buildx-cache
          mv /tmp/.buildx-cache-new /tmp/.buildx-cache

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}
      - uses: google-github-actions/get-secretmanager-secrets@v2
        id: secrets
        with:
          secrets: |-
            REPLICATE_API_TOKEN:projects/${{ secrets.GCP_PROJECT_ID }}/secrets/replicate-api-token
            NEO4J_PASSWORD:projects/${{ secrets.GCP_PROJECT_ID }}/secrets/neo4j-password
      - uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: pangyo-production
          region: us-central1
          image: gcr.io/${{ secrets.GCP_PROJECT_ID }}/pangyo:${{ github.sha }}
          env_vars: |
            NODE_ENV=production
          secrets: |
            REPLICATE_API_TOKEN=${{ steps.secrets.outputs.REPLICATE_API_TOKEN }}
            NEO4J_PASSWORD=${{ steps.secrets.outputs.NEO4J_PASSWORD }}
```

### Pattern 4: Cloud Run Startup Probe with Environment Validation
**What:** Use Cloud Run's startup probe feature to run `validate_env.py` before accepting traffic. If validation fails, the container is terminated and restarted.

**When to use:** Always for production deployments. Prevents bad configurations from serving traffic.

**Example:**
```yaml
# cloud-run.yaml (deployed via gcloud or GitHub Actions)
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: pangyo-production
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/startup-cpu-boost: 'true'
    spec:
      containerConcurrency: 80
      timeoutSeconds: 300
      containers:
      - image: gcr.io/PROJECT_ID/pangyo:latest
        ports:
        - containerPort: 3000
        startupProbe:
          httpGet:
            path: /api/health/startup
            port: 3000
          initialDelaySeconds: 10
          timeoutSeconds: 30
          periodSeconds: 10
          failureThreshold: 3
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 0
          periodSeconds: 10
        resources:
          limits:
            cpu: '2'
            memory: 2Gi
```

```javascript
// src/app/api/health/startup/route.ts
import { validateEnvironment } from '@/lib/validate-env';

export async function GET() {
  try {
    const results = await validateEnvironment();

    if (results.some(r => !r.healthy)) {
      return new Response(JSON.stringify({
        status: 'unhealthy',
        checks: results
      }), { status: 503 });
    }

    return new Response(JSON.stringify({
      status: 'healthy',
      checks: results
    }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      error: error.message
    }), { status: 503 });
  }
}
```

```python
# execution/validate_env.py
"""
Validates all required environment variables and service connectivity.
Called by Cloud Run startup probe via /api/health/startup endpoint.
"""
import os
import sys
from google.cloud import secretmanager, firestore, storage
from neo4j import GraphDatabase

def validate_secrets():
    """Verify Secret Manager is accessible and required secrets exist."""
    required_secrets = [
        'replicate-api-token',
        'neo4j-password',
        'firebase-private-key',
        'openrouter-api-key'
    ]

    project_id = os.environ.get('GCP_PROJECT_ID')
    if not project_id:
        return False, "GCP_PROJECT_ID not set"

    client = secretmanager.SecretManagerServiceClient()

    for secret in required_secrets:
        try:
            name = f"projects/{project_id}/secrets/{secret}/versions/latest"
            response = client.access_secret_version(request={"name": name})
            if not response.payload.data:
                return False, f"Secret {secret} is empty"
        except Exception as e:
            return False, f"Failed to access {secret}: {str(e)}"

    return True, "All secrets accessible"

def validate_firestore():
    """Verify Firestore connection."""
    try:
        db = firestore.Client()
        db.collection('_health_check').document('ping').set({'timestamp': firestore.SERVER_TIMESTAMP})
        return True, "Firestore connected"
    except Exception as e:
        return False, f"Firestore failed: {str(e)}"

def validate_neo4j():
    """Verify Neo4j connection."""
    uri = os.environ.get('NEO4J_URI')
    user = os.environ.get('NEO4J_USER', 'neo4j')

    if not uri:
        return False, "NEO4J_URI not set"

    try:
        driver = GraphDatabase.driver(uri, auth=(user, os.environ['NEO4J_PASSWORD']))
        with driver.session() as session:
            result = session.run("RETURN 1 AS num")
            if result.single()['num'] != 1:
                return False, "Neo4j query returned unexpected result"
        driver.close()
        return True, "Neo4j connected"
    except Exception as e:
        return False, f"Neo4j failed: {str(e)}"

def validate_storage():
    """Verify Cloud Storage access."""
    bucket_name = os.environ.get('GCS_BUCKET_NAME', 'pangyo-tattoo-images')
    try:
        client = storage.Client()
        bucket = client.bucket(bucket_name)
        if not bucket.exists():
            return False, f"Bucket {bucket_name} does not exist"
        return True, f"Storage bucket {bucket_name} accessible"
    except Exception as e:
        return False, f"Storage failed: {str(e)}"

def main():
    """Run all validation checks."""
    checks = [
        ('Secret Manager', validate_secrets),
        ('Firestore', validate_firestore),
        ('Neo4j', validate_neo4j),
        ('Cloud Storage', validate_storage),
    ]

    results = []
    all_healthy = True

    for name, check_fn in checks:
        healthy, message = check_fn()
        results.append({'service': name, 'healthy': healthy, 'message': message})
        if not healthy:
            all_healthy = False
            print(f"❌ {name}: {message}", file=sys.stderr)
        else:
            print(f"✅ {name}: {message}")

    if not all_healthy:
        sys.exit(1)

    print("\n✅ All environment validation checks passed!")
    sys.exit(0)

if __name__ == '__main__':
    main()
```

### Pattern 5: Docker Multi-Stage Build (Node.js + Python)
**What:** Three-stage Dockerfile: deps stage (install only dependencies), builder stage (compile/build), runner stage (minimal runtime). Optionally add a Python stage if operational scripts need to run inside the container.

**When to use:** Always for production Docker images. Reduces image size by 60-80%, improves security by removing build tools from runtime.

**Example:**
```dockerfile
# Dockerfile (enhanced with Python for execution/ scripts)

# ── Stage 1: Node.js Dependencies ──────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# ── Stage 2: Node.js Builder ───────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .

# Build-time env vars (injected from GitHub Actions)
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID

ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID

RUN npm run build

# ── Stage 3: Python Operational Scripts ───────────────
FROM python:3.12-slim AS python-builder
WORKDIR /app
COPY execution/requirements.txt ./execution/
RUN python -m venv /venv && \
    /venv/bin/pip install --no-cache-dir -r execution/requirements.txt

# ── Stage 4: Final Production Image ────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Install Python runtime (Alpine: py3-pip)
RUN apk add --no-cache python3 py3-pip

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy Node.js app
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Python scripts and virtual environment
COPY --from=python-builder --chown=nextjs:nodejs /venv /venv
COPY --chown=nextjs:nodejs execution/ ./execution/

ENV PATH="/venv/bin:$PATH"
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

USER nextjs
EXPOSE 3000

# Health check endpoint must respond within startup probe timeout
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

CMD ["node", "server.js"]
```

### Anti-Patterns to Avoid

- **Manual deployments without version control**: Every deployment MUST be triggered by CI or documented in git (even manual triggers via `workflow_dispatch` are auditable).

- **Secrets in Dockerfile or committed .env files**: Use Secret Manager and inject at runtime. ARG/ENV in Dockerfile is only for build-time non-secret config.

- **Untested operational scripts**: Every script in `execution/` MUST have corresponding tests in `tests/execution/`. Scripts that break in production erode trust in automation.

- **Stale directives**: If a directive's "Last Updated" is more than 90 days old and the system has changed, it's probably wrong. Schedule quarterly reviews.

- **Overly complex CI pipelines**: GitHub Actions workflows can become unreadable YAML soup. Prefer simple jobs with clear dependencies over clever templating.

- **Ignoring startup probe failures in dev**: If `validate_env.py` fails locally, fix it immediately. Production will fail the same way but with customer impact.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CI/CD pipeline orchestration | Custom Jenkins/CircleCI config | GitHub Actions | Native GitHub integration, free tier generous, active marketplace, easier than Jenkins, same capabilities as CircleCI |
| Docker layer caching | Manual cache management | Docker Buildx with `cache-from`/`cache-to` | BuildKit's cache is smarter than manual, handles multi-stage, prevents cache bloat, well-tested |
| Secret injection at runtime | Custom secret fetching in app code | Cloud Run secrets + Secret Manager | Native integration, secrets never touch disk, automatic rotation support, audit logging included |
| Environment validation | Ad-hoc checks in app startup | Structured startup probe + validation script | Cloud Run won't serve traffic if validation fails, prevents cascading failures, clear pass/fail |
| Operational runbooks | Wiki pages or Google Docs | Markdown in git with executable counterparts | Version controlled, code-reviewable, searchable, survives tool migrations, pairs with automation |
| Deployment rollback | Manual container redeployment | Cloud Run traffic splitting + revision history | Zero-downtime rollback in seconds, canary deployments built-in, automatic revision naming |
| Polyglot dependency caching | Separate cache services | `actions/cache` with multiple paths | Single action handles npm + pip + Docker, automatic key generation, LRU eviction, free |

**Key insight:** In CI/CD and operations, the value is in **reliable automation**, not custom tooling. Every custom script you write is technical debt unless it's domain-specific (e.g., `seed_artists.py` encodes business logic that no library provides). Use platform features (GitHub Actions, Cloud Run probes, Secret Manager) and standard tools (Docker Buildx, pytest, Vitest) for the infrastructure layers.

## Common Pitfalls

### Pitfall 1: Docker Layer Cache Grows Unbounded
**What goes wrong:** GitHub Actions Docker builds get slower over time, cache size balloons to 10GB+, eventually cache hits stop helping.

**Why it happens:** Docker Buildx's `cache-to: type=local` appends to the cache indefinitely without eviction. Old layers accumulate.

**How to avoid:** After build, delete old cache and rename new cache:
```yaml
- run: |
    rm -rf /tmp/.buildx-cache
    mv /tmp/.buildx-cache-new /tmp/.buildx-cache
```

**Warning signs:** CI build times increase week-over-week despite no dependency changes, cache restore takes longer than actual build, GitHub Actions cache usage warnings.

### Pitfall 2: NEXT_PUBLIC_* Secrets Leak into Client Bundle
**What goes wrong:** Secrets needed at build time (e.g., API keys) are passed as `NEXT_PUBLIC_*` env vars, get inlined into JavaScript, anyone can read them in browser DevTools.

**Why it happens:** Next.js inlines `NEXT_PUBLIC_*` vars into the client bundle at build time. If you pass secrets this way, they're permanently baked into the code.

**How to avoid:** Only use `NEXT_PUBLIC_*` for truly public config (Firebase client config is okay). Server-side secrets (Replicate token, Neo4j password) MUST be runtime env vars accessed only in API routes or server components.

**Warning signs:** Searching bundled JS for "replicate" or "neo4j" returns actual credentials, browser console logs show full API tokens, security scanners flag exposed keys.

### Pitfall 3: Startup Probe Timeout Too Short
**What goes wrong:** Cloud Run container starts, begins initializing (connecting to Firestore, Neo4j, warming caches), startup probe checks too soon, probe fails, container killed, infinite restart loop.

**Why it happens:** Default startup probe timeout is often 10 seconds, but real apps need 20-30s for cold starts (especially if loading from Secret Manager, connecting to multiple services).

**How to avoid:** Set `initialDelaySeconds: 10` (wait before first probe), `timeoutSeconds: 30` (how long each probe can take), `failureThreshold: 3` (allow 3 failures before giving up). Total startup budget: 10 + (30 × 3) = 100 seconds.

**Warning signs:** Logs show "Connection to Neo4j succeeded" immediately followed by "Container terminated", Cloud Run dashboard shows rapid restarts with no traffic, health check endpoint works locally but fails in production.

### Pitfall 4: Forgetting to Update Directives After Fixes
**What goes wrong:** Engineer fixes a production issue, deploys the fix, moves on. Six months later, same issue occurs, new engineer has no context, spends hours re-debugging, fixes it differently, introduces regression.

**Why it happens:** Self-annealing is a discipline, not automatic. Without explicit reminders (PR templates, post-incident checklists), documentation updates get skipped.

**How to avoid:** Make "Update directive with Known Issue" a required step in incident post-mortems and PR templates. Auto-close incidents only when corresponding directive PR is merged.

**Warning signs:** Same issues recurring with different people, tribal knowledge ("ask Alice how to fix the Neo4j timeout"), new team members asking "is this documented anywhere?"

### Pitfall 5: Secrets Injected at Build Time Instead of Runtime
**What goes wrong:** GitHub Actions workflow passes secrets as Docker build args (`--build-arg REPLICATE_TOKEN=${{ secrets.REPLICATE_TOKEN }}`), secret gets baked into Docker layer, anyone with image access can extract it.

**Why it happens:** Confusion between build-time config (public Firebase keys) and runtime secrets (API tokens). Docker build args are visible in `docker history`.

**How to avoid:** Pass secrets via `google-github-actions/deploy-cloudrun` `secrets:` parameter (runtime injection) or Secret Manager volume mounts. Never use `ARG` for secrets in Dockerfile.

**Warning signs:** `docker history` output shows masked but reconstructible secrets, security scans flag secrets in image layers, image size larger than expected (secrets add layers).

### Pitfall 6: Python Script Failures Silent in CI
**What goes wrong:** CI runs `pytest tests/execution/` but tests are poorly written or missing, scripts pass tests but fail in production with actual data/services.

**Why it happens:** Operational scripts are often tested with mocks, not real services. Real issues (rate limits, permissions, schema changes) only surface in production.

**How to avoid:** Write integration tests that use test projects/environments (e.g., Neo4j test database, Firestore emulator). Mark them with `@pytest.mark.integration` and run in separate CI job with real credentials.

**Warning signs:** 100% test coverage but frequent production failures, tests only mock external services, "works on my machine" for operational scripts.

### Pitfall 7: Monorepo Path Filters Misconfigured
**What goes wrong:** Changing `README.md` triggers full test suite + Docker build + deployment. Changing `execution/seed_artists.py` doesn't trigger Python tests.

**Why it happens:** GitHub Actions `paths` filter is easy to get wrong (globs are relative to repo root, negations are tricky). Default is "run on every push" which wastes CI minutes.

**How to avoid:** Use path filters with clear intent:
```yaml
on:
  push:
    paths:
      - 'src/**'
      - 'execution/**'
      - 'package*.json'
      - 'Dockerfile'
      - '.github/workflows/**'
```
Test filters by pushing innocuous changes to files outside paths, verify workflow doesn't run.

**Warning signs:** CI running on docs-only commits, PRs blocked by irrelevant test failures, high GitHub Actions minutes usage for low-activity repo.

## Code Examples

Verified patterns from official sources and current best practices:

### GitHub Actions: Polyglot Test Matrix
```yaml
# .github/workflows/test.yml
# Source: GitHub Actions documentation + polyglot monorepo best practices
name: Test

on: [push, pull_request]

jobs:
  test-matrix:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        test-suite:
          - { name: 'JavaScript', language: 'node', version: '20', command: 'npm run test:coverage' }
          - { name: 'Python', language: 'python', version: '3.12', command: 'pytest tests/execution/ --cov=execution' }
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        if: matrix.test-suite.language == 'node'
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.test-suite.version }}
          cache: 'npm'

      - name: Setup Python
        if: matrix.test-suite.language == 'python'
        uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.test-suite.version }}
          cache: 'pip'

      - name: Install Node.js dependencies
        if: matrix.test-suite.language == 'node'
        run: npm ci

      - name: Install Python dependencies
        if: matrix.test-suite.language == 'python'
        run: pip install -r execution/requirements.txt

      - name: Run tests
        run: ${{ matrix.test-suite.command }}

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage-${{ matrix.test-suite.name }}
          path: |
            coverage/
            coverage.xml
```

### Cloud Run Secret Injection
```yaml
# .github/workflows/deploy.yml
# Source: google-github-actions/deploy-cloudrun documentation
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}

      - uses: google-github-actions/get-secretmanager-secrets@v2
        id: secrets
        with:
          secrets: |-
            replicate-token:projects/${{ secrets.GCP_PROJECT_ID }}/secrets/replicate-api-token/versions/latest
            neo4j-password:projects/${{ secrets.GCP_PROJECT_ID }}/secrets/neo4j-password/versions/latest

      - name: Build and push Docker image
        run: |
          gcloud builds submit --tag gcr.io/${{ secrets.GCP_PROJECT_ID }}/pangyo:${{ github.sha }}

      - uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: pangyo-production
          region: us-central1
          image: gcr.io/${{ secrets.GCP_PROJECT_ID }}/pangyo:${{ github.sha }}
          flags: '--cpu=2 --memory=2Gi --max-instances=10'
          env_vars: |
            NODE_ENV=production
            GCP_PROJECT_ID=${{ secrets.GCP_PROJECT_ID }}
          secrets: |
            REPLICATE_API_TOKEN=${{ steps.secrets.outputs.replicate-token }}
            NEO4J_PASSWORD=${{ steps.secrets.outputs.neo4j-password }}
          # secrets_update_strategy: merge = combine with existing secrets (default)
```

### Docker Buildx Caching
```yaml
# .github/workflows/build.yml
# Source: Docker documentation + Blacksmith caching guide
name: Build

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - uses: actions/cache@v4
        with:
          path: /tmp/.buildx-cache
          key: ${{ runner.os }}-buildx-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-buildx-

      - uses: docker/build-push-action@v5
        with:
          context: .
          push: false
          tags: pangyo:latest
          cache-from: type=local,src=/tmp/.buildx-cache
          cache-to: type=local,dest=/tmp/.buildx-cache-new,mode=max
          build-args: |
            NEXT_PUBLIC_FIREBASE_API_KEY=${{ secrets.FIREBASE_API_KEY }}

      # Prevent cache bloat
      - name: Rotate cache
        run: |
          rm -rf /tmp/.buildx-cache
          mv /tmp/.buildx-cache-new /tmp/.buildx-cache
```

### Python Environment Validation Script
```python
# execution/validate_env.py
# Pattern: Startup validation with clear pass/fail
"""
Validates all required environment variables and service connectivity.
Exits 0 if all checks pass, 1 if any check fails.
"""
import os
import sys
from typing import Tuple, List, Dict
from google.cloud import secretmanager, firestore, storage
from neo4j import GraphDatabase

def check_env_var(var_name: str) -> Tuple[bool, str]:
    """Check if an environment variable is set and non-empty."""
    value = os.environ.get(var_name)
    if not value:
        return False, f"{var_name} not set"
    return True, f"{var_name} set"

def check_secret_manager(project_id: str, secret_names: List[str]) -> Tuple[bool, str]:
    """Verify Secret Manager access and required secrets exist."""
    try:
        client = secretmanager.SecretManagerServiceClient()
        for secret in secret_names:
            name = f"projects/{project_id}/secrets/{secret}/versions/latest"
            response = client.access_secret_version(request={"name": name})
            if not response.payload.data:
                return False, f"Secret {secret} is empty"
        return True, f"All {len(secret_names)} secrets accessible"
    except Exception as e:
        return False, f"Secret Manager failed: {str(e)}"

def check_firestore(project_id: str) -> Tuple[bool, str]:
    """Verify Firestore connection."""
    try:
        db = firestore.Client(project=project_id)
        # Write and read a health check document
        doc_ref = db.collection('_health_check').document('startup_probe')
        doc_ref.set({'timestamp': firestore.SERVER_TIMESTAMP})
        doc = doc_ref.get()
        if not doc.exists:
            return False, "Health check document not created"
        return True, "Firestore connected"
    except Exception as e:
        return False, f"Firestore failed: {str(e)}"

def check_neo4j(uri: str, user: str, password: str) -> Tuple[bool, str]:
    """Verify Neo4j connection."""
    try:
        driver = GraphDatabase.driver(uri, auth=(user, password))
        with driver.session() as session:
            result = session.run("RETURN 1 AS num")
            if result.single()['num'] != 1:
                return False, "Query returned unexpected result"
        driver.close()
        return True, "Neo4j connected"
    except Exception as e:
        return False, f"Neo4j failed: {str(e)}"

def check_cloud_storage(bucket_name: str) -> Tuple[bool, str]:
    """Verify Cloud Storage bucket access."""
    try:
        client = storage.Client()
        bucket = client.bucket(bucket_name)
        if not bucket.exists():
            return False, f"Bucket {bucket_name} does not exist"
        return True, f"Bucket {bucket_name} accessible"
    except Exception as e:
        return False, f"Storage failed: {str(e)}"

def main():
    """Run all validation checks and exit with status code."""
    checks: List[Dict] = []

    # Environment variables
    project_id = os.environ.get('GCP_PROJECT_ID')
    if not project_id:
        print("❌ CRITICAL: GCP_PROJECT_ID not set", file=sys.stderr)
        sys.exit(1)

    # Check core services
    checks.append({
        'service': 'Secret Manager',
        'check': lambda: check_secret_manager(project_id, [
            'replicate-api-token',
            'neo4j-password',
            'firebase-private-key',
            'openrouter-api-key'
        ])
    })

    checks.append({
        'service': 'Firestore',
        'check': lambda: check_firestore(project_id)
    })

    checks.append({
        'service': 'Neo4j',
        'check': lambda: check_neo4j(
            os.environ.get('NEO4J_URI', ''),
            os.environ.get('NEO4J_USER', 'neo4j'),
            os.environ.get('NEO4J_PASSWORD', '')
        )
    })

    checks.append({
        'service': 'Cloud Storage',
        'check': lambda: check_cloud_storage(
            os.environ.get('GCS_BUCKET_NAME', 'pangyo-tattoo-images')
        )
    })

    # Run checks
    results = []
    all_healthy = True

    for check_def in checks:
        service = check_def['service']
        try:
            healthy, message = check_def['check']()
            results.append({'service': service, 'healthy': healthy, 'message': message})

            if healthy:
                print(f"✅ {service}: {message}")
            else:
                print(f"❌ {service}: {message}", file=sys.stderr)
                all_healthy = False
        except Exception as e:
            print(f"❌ {service}: Unexpected error: {str(e)}", file=sys.stderr)
            all_healthy = False

    # Exit with appropriate code
    if all_healthy:
        print("\n✅ All validation checks passed. System ready.")
        sys.exit(0)
    else:
        print("\n❌ Validation failed. Container will not accept traffic.", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
```

### Operational Runbook Template
```markdown
# Directive: [Operation Name]

**ID:** DIR-XXX
**Owner:** [Team/Person]
**Last Updated:** [YYYY-MM-DD]
**Last Tested:** [YYYY-MM-DD]
**Risk Level:** [Low/Medium/High]
**Estimated Duration:** [time]

## Purpose
[What this operation accomplishes and why it's needed]

## Prerequisites
- [ ] [Condition that must be true before starting]
- [ ] [Access/permission required]
- [ ] [Service state required]

## Procedure

### Step 1: [Action]
```bash
# Execute the automated script
cd execution/
python [script_name].py [args]
```

**Expected output:**
```
✅ [Success message]
```

**If this fails:** [What to try, who to escalate to]

### Step 2: [Verification]
```bash
# Verify the operation succeeded
python run_health_checks.py --check [specific-check]
```

**Expected output:**
```
✅ All checks passed
```

### Step 3: [Monitoring]
Monitor logs for 5-10 minutes:
```bash
gcloud run services logs read [service] --limit 100 --format json | jq '.textPayload'
```

**Look for:** [Specific log patterns indicating success/failure]

## Rollback
If the operation fails or causes issues:
```bash
python rollback_[operation].py --to-version [previous-version]
```

## Known Issues

### Issue: [Descriptive title] ([Date discovered])
**Symptom:** [What the operator sees when this happens]
**Root cause:** [Why it happens]
**Resolution:** [How to fix it]
**Prevention:** [What was changed to prevent recurrence]
**Updated by:** [@username]
**Related commits:** [link to PR/commit]

## Post-Operation
- [ ] Update #deployments Slack channel with results
- [ ] If any issues occurred, update this directive's "Known Issues" section
- [ ] If procedure changed, update corresponding script in execution/

## Related Directives
- [DIR-XXX: Related operation]
- [DIR-YYY: Depends on this operation]

## Appendix: Manual Override
If automation fails and manual intervention is required:
[Step-by-step manual procedure with exact commands]
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Wiki-based runbooks | Git-based markdown directives | 2023-2024 | Version controlled, code-reviewable, survives tool migrations, searchable with `grep` |
| Service Account JSON keys | Workload Identity Federation | 2024+ | Zero-trust authentication, no key rotation burden, automatic credential lifecycle |
| Manual deployments | GitHub Actions CI/CD | 2020+ | Every deployment auditable, consistent process, reduced human error |
| Single-stage Dockerfiles | Multi-stage builds | 2019+ | 60-80% smaller images, improved security (no build tools in prod), faster pulls |
| Secrets in .env files | Secret Manager runtime injection | 2023+ | Centralized secret management, audit logging, automatic rotation, no secrets in git |
| Cloud Build (GCP-native) | GitHub Actions preferred | 2024-2025 | Better developer experience, free tier, marketplace ecosystem, multi-cloud portability |
| Long startup probe timeouts | Smart probe tuning (10s initial, 30s timeout, 3 retries) | 2023+ | Balance between fast failure detection and cold start tolerance |
| Pip without caching | actions/cache with pip | 2021+ | 2-10x faster CI (dependency install from 2 min to 15 sec) |

**Deprecated/outdated:**
- **Travis CI / CircleCI**: GitHub Actions has made third-party CI less necessary for GitHub-hosted projects (2022+)
- **Docker Hub rate limits workaround**: Use GCR or GHCR instead of public Docker Hub (2021+)
- **Service Account Key JSON in GitHub Secrets**: Use Workload Identity Federation instead (2024+)
- **`docker build` without Buildx**: Use BuildKit-based Buildx for caching and multi-platform support (2020+)
- **Cloud Run without startup probes**: Always use startup probes to validate environment before serving traffic (2022+)

## Open Questions

1. **Should operational scripts run inside the container or as Cloud Run Jobs?**
   - What we know: Current Dockerfile can include Python + scripts, Cloud Run Jobs are designed for one-off tasks
   - What's unclear: Performance/cost tradeoff for embedding Python runtime in web server container vs separate Jobs
   - Recommendation: Start with scripts in container (simpler), migrate to Jobs if container bloat becomes an issue (threshold: >500MB image)

2. **How often should directives be reviewed if the system is stable?**
   - What we know: Industry practice is quarterly or semi-annual reviews
   - What's unclear: TatTester's change velocity may not warrant quarterly reviews
   - Recommendation: Quarterly for first year (high-change phase), then semi-annual once stable. Flag for review when underlying service changes (e.g., Neo4j version upgrade)

3. **Should CI run integration tests with real GCP services or use emulators?**
   - What we know: Emulators (Firestore, Storage) are faster and free, but miss some production behaviors
   - What's unclear: Whether emulator differences will cause prod-only bugs
   - Recommendation: Use emulators for PR checks (speed), real services for `main` branch and nightly runs (accuracy)

4. **What's the right level of granularity for directives?**
   - What we know: Too granular = maintenance burden, too coarse = not useful during incidents
   - What's unclear: Whether "deploy" should be one directive or split into "deploy-staging" and "deploy-production"
   - Recommendation: Start with 8-10 directives (one per major operation), split if any directive exceeds 200 lines or handles multiple unrelated concerns

## Sources

### Primary (HIGH confidence)
- [GitHub Actions Official Documentation](https://docs.github.com/en/actions) - Event-driven workflows, matrix builds, caching
- [google-github-actions/deploy-cloudrun](https://github.com/google-github-actions/deploy-cloudrun) - Official GCP Cloud Run deployment action
- [google-github-actions/get-secretmanager-secrets](https://github.com/google-github-actions/get-secretmanager-secrets) - Secret Manager integration
- [Cloud Run Health Checks Documentation](https://cloud.google.com/run/docs/configuring/healthchecks) - Startup, liveness, readiness probes
- [Docker Multi-Stage Builds Documentation](https://docs.docker.com/build/building/multi-stage/) - Official multi-stage build reference
- [Google Cloud Secret Manager Documentation](https://cloud.google.com/run/docs/configuring/services/secrets) - Runtime secret injection patterns

### Secondary (MEDIUM confidence)
- [DevToolbox: GitHub Actions CI/CD Complete Guide for 2026](https://devtoolbox.dedyn.io/blog/github-actions-cicd-complete-guide) - Performance optimization, matrix strategies
- [Blacksmith: Docker Layer Caching in GitHub Actions](https://www.blacksmith.sh/blog/cache-is-king-a-guide-for-docker-layer-caching-in-github-actions) - Caching best practices
- [Red Hat: Self-Healing Infrastructure Blueprint](https://www.redhat.com/en/blog/self-healing-infrastructure-closed-loop-automation-blueprint) - Closed-loop automation patterns
- [Cutover: Runbook Examples for IT DR and Cloud Migration](https://www.cutover.com/blog/runbook-examples-it-disaster-recovery-cloud-migration-and-technology-implementation) - Operational runbook structure
- [Atlassian: DevOps Runbook Template](https://www.atlassian.com/software/confluence/templates/devops-runbook) - Runbook best practices
- [Graph AI: SOP vs Runbook Best Practices](https://www.graphapp.ai/blog/sop-vs-runbook-key-differences-and-best-practices) - Directive structure guidance
- [Pytest with Eric: Automated Python Testing with GitHub Actions](https://pytest-with-eric.com/integrations/pytest-github-actions/) - pytest CI integration patterns
- [General Reasoning Corp: Monorepo CI/CD with Vanilla GitHub Actions](https://generalreasoning.com/blog/2025/03/22/github-actions-vanilla-monorepo.html) - Monorepo path filtering

### Tertiary (LOW confidence)
- TelecomWave: AI-Driven Self-Healing Networks 2026 - Self-healing concepts (domain is telecom but patterns transfer)
- Medium (various): Docker multi-stage builds, Python CI/CD - Code examples verified against official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Google and GitHub documentation, current stable versions verified
- Architecture patterns: HIGH - Patterns drawn from official documentation and verified production examples
- Pitfalls: HIGH - Based on documented issues in official GitHub discussions and real incident reports
- DOE framework: MEDIUM - Concept is from government/aerospace but application to software ops is extrapolated from runbook best practices

**Research date:** 2026-02-16
**Valid until:** 2026-05-16 (90 days - stable domain, but GitHub Actions and Cloud Run receive monthly updates)

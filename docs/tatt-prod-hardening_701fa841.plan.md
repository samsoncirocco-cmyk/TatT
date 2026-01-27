---
name: TatT-Prod-Hardening
overview: Three-phase roadmap to move TatT from MVP to a secure, scalable production app.
todos:
  - id: p1-proxy-lockdown
    content: Restrict CORS, add Bearer auth & rate limiting in server.js
    status: completed
  - id: p1-move-tokens
    content: Remove VITE_ tokens from client; use server-only env for Replicate
    status: completed
    dependencies:
      - p1-proxy-lockdown
  - id: p1-fetch-wrapper
    content: Create fetchWithAbort wrapper and refactor replicateService
    status: completed
    dependencies:
      - p1-proxy-lockdown
  - id: p1-env-routing
    content: Replace hard-coded localhost proxy URL with env driven value
    status: completed
    dependencies:
      - p1-fetch-wrapper
  - id: p2-split-generator
    content: Split DesignGenerator.jsx into DesignForm, ResultsGrid, StencilPanel, GeneratorModals
    status: completed
    dependencies:
      - p1-env-routing
  - id: p2-clean-intervals
    content: Convert generator polling/intervals to useEffect with cleanup
    status: completed
    dependencies:
      - p2-split-generator
  - id: p2-storage-hygiene
    content: Stop storing base64 blobs in localStorage; prepare storageService
    status: completed
    dependencies:
      - p2-clean-intervals
  - id: p3-theme-tailwind
    content: Add tokenised theme to tailwind.config.js
    status: completed
    dependencies:
      - p2-storage-hygiene
  - id: p3-toast-feedback
    content: Replace alert() with shadcn ui toasts
    status: completed
    dependencies:
      - p3-theme-tailwind
  - id: p3-nav-active
    content: Fix nested route active logic in App.jsx
    status: completed
    dependencies:
      - p3-theme-tailwind
  - id: p3-tests
    content: Add proxy integration tests and generator component tests
    status: completed
    dependencies:
      - p3-toast-feedback
---

# TatT Production Hardening Roadmap

## Phase 1 – Security & API Hardening (P0)

1. Lock down proxy

• Edit [server.js](server.js) – restrict CORS to env-driven whitelist, add Bearer auth middleware, express-rate-limit throttle, bind 127.0.0.1 unless HOST env provided.• Remove all `VITE_REPLICATE_API_TOKEN` references; load token with `process.env.REPLICATE_API_TOKEN` only.

2. Stabilise API layer

• Refactor [src/services/replicateService.js](src/services/replicateService.js) – replace hard-coded `http://localhost:3001/api` with env `import.meta.env.VITE_PROXY_URL` fallback.• Implement `src/services/fetchWithAbort.js` – shared wrapper (AbortController, typed error object).

3. Client security cleanup

• Purge token exposure from Vite envs, update build scripts & vercel.json.

### Phase 1 Deliverable

Proxy requires `Authorization: Bearer <frontend-token>`; client handles auth errors gracefully via typed surfaces.

## Phase 2 – Architecture Refactor & Data Hygiene

1. Decompose `DesignGenerator`

• Move form logic to `DesignForm.jsx`, results to `ResultsGrid.jsx`, stencil controls to `StencilPanel.jsx`, modal logic to `GeneratorModals.jsx`.• Convert polling/intervals to `useEffect` + cleanup.

2. Storage migration prep

• Refactor [designLibraryService.js](src/services/designLibraryService.js) & [imageProcessingService.js](src/services/imageProcessingService.js) to stop writing base64 blobs to `localStorage` – store urls/ids only.• Draft schema & helper in `src/services/storageService.js` anticipating Supabase/Convex.

## Phase 3 – UX / UI Polish & Reliability

1. Theming & feedback

• Tokenised palette in [tailwind.config.js](tailwind.config.js).• Replace `alert()` with non-blocking toasts via shadcn/ui primitives.

2. Navigation & motion

• Fix active route logic in [src/App.jsx](src/App.jsx) (use `useLocation` pathname startsWith).• Add focus/hover states, skeleton loaders, framer-motion page transitions.

3. Tests & budgets

• Integration tests for proxy (auth happy / fail) using `supertest`.• Component tests for generator state transitions with `@testing-library/react`.• Budget monitor cron in proxy to warn on credit burn.

```mermaid
flowchart TD
  client[[React UI]] --fetchWithAbort--> proxy
  proxy --token--> ReplicateAPI
  proxy -.throttle.-> rateLimiter
  client --> Supabase[Future Storage]






```
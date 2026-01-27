# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TatTester** is an AI-powered tattoo design generator and visualization platform. The application helps first-time tattoo seekers overcome commitment anxiety through custom design generation, layer-based editing, AR preview capabilities, and artist matching.

**Current Phase**: MVP (Phase 1) - "The Forge" design studio with hybrid vector-graph matching

## Development Commands

### Essential Commands

```bash
# Development (requires two terminals)
npm run dev        # Frontend dev server (port 3000)
npm run server     # Backend proxy server (port 3001/3002)

# Testing
npm run test              # Run tests once
npm run test:watch        # Watch mode
npm run test:ui           # Vitest UI
npm run test:coverage     # Coverage report

# Build
npm run build      # Production build
npm run preview    # Preview production build

# Linting
npm run lint       # ESLint check
```

### Database & Infrastructure

```bash
# Neo4j graph database
npm run neo4j:import     # Import artist/portfolio data to Neo4j

# Railway deployment (if configured)
npm run railway:update-env  # Update Railway environment variables
npm run railway:list        # List Railway projects

# Skills management (Claude Code custom skills)
npm run skills:install   # Install custom skills
npm run skills:update    # Update existing skills
npm run skills:list      # List available skills
```

## Architecture Overview

### Frontend Architecture

**Framework**: React 18 + Vite 5 with React Router DOM v7

**State Management Pattern**: Custom hooks + service layer
- No Redux/Zustand - uses React hooks for local state
- Services handle business logic and API calls
- Hooks (`useLayerManagement`, `useVersionHistory`, `useImageGeneration`) orchestrate state

**Key Design Patterns**:
1. **Service Layer Pattern**: All external APIs and business logic in `/src/services/`
2. **Custom Hooks Pattern**: Reusable stateful logic in `/src/hooks/`
3. **Component Composition**: Page components compose smaller feature components
4. **Immutable State Updates**: All state mutations return new objects/arrays

### Backend Architecture

**Server**: Express.js proxy server (`server.js`)
- Runs on port 3001 (development) or 3002 (production)
- Proxies Replicate API to hide API tokens from client
- Implements bearer token auth (`FRONTEND_AUTH_TOKEN`)
- Rate limiting per endpoint (100 req/hr semantic match, 20 req/hr council, etc.)
- CORS restricted to allowed origins

**API Structure**:
- `/api/v1/*` - Modern versioned endpoints (preferred)
- `/api/*` - Legacy endpoints (being deprecated)
- `/api/health` - Public health check

### Data Layer Architecture

**Hybrid Vector-Graph System** (Core Innovation):

The app uses **three complementary data sources** for artist matching:

1. **Neo4j Graph Database** - Relationship-based matching
   - Artists, portfolios, styles, tags, specialties
   - Graph queries via Cypher through `/api/neo4j/query`
   - Connected via `neo4jService.js`

2. **Supabase Vector Database** - Semantic similarity matching
   - pgvector extension for embedding search
   - Portfolio image embeddings for visual similarity
   - Text embeddings for style/description matching
   - Connected via `vectorDbService.js`

3. **Reciprocal Rank Fusion (RRF)** - Combines results
   - Implemented in `hybridMatchService.js` and `matchService.js`
   - Merges graph + vector results with weighted scoring
   - Graph provides "known-good" relationships, vector provides discovery

**Why This Matters**:
- Graph DB: "Artists who specialize in Japanese + have 5+ similar pieces"
- Vector DB: "Visually similar portfolios even if different style tags"
- RRF: Combines both for high-precision, high-recall matching

### Canvas Layer System

**Multi-Layer Compositing Engine** (`canvasService.ts`):
- Immutable layer operations (create, delete, reorder, transform)
- Blend modes: normal, multiply, screen, overlay
- Transform operations: translate, rotate, scale, flip
- Export as PNG or AR-ready asset (1024x1024)
- Version history with branching support

**Layer Data Flow**:
```
User Action → Hook (useLayerManagement) → Service (canvasService) → Canvas Render
                                        ↓
                                  sessionStorage persistence
```

### Prompt Enhancement System

**AI Council Pattern** (`councilService.js` + `openRouterCouncil.js`):
- Multi-agent prompt refinement using OpenRouter API
- Specialist agents: Creative Director, Tattoo Specialist, Technical Optimizer
- Iterative enhancement with quality scoring
- Fallback to single-agent if multi-agent fails

**Flow**:
```
User Prompt → Council Enhancement → Replicate API → Generated Images → Layers
```

### Version History System

**Git-like Versioning** (`versionService.js`):
- Auto-save on generation (configurable limit)
- Branching from any historical version
- Version comparison with diff detection
- Merging layers from different versions
- localStorage with 90-day auto-purge (non-favorites)

**Session-based Storage**:
- Unique session ID per browser tab
- `localStorage` key: `version_history_${sessionId}`
- Supports parallel design exploration

## Key Services Explained

### `replicateService.js`
Handles all Replicate API communication for image generation.

**Important Details**:
- Proxies through backend to hide API token
- Supports multiple models: SDXL, Anime XL, DreamShaper XL, Tattoo Flash Art
- Polling-based prediction status checks (2s intervals, 60 max attempts)
- Rate limiting: 10 requests/minute client-side
- Budget tracking stored in `localStorage`

**Common Pattern**:
```javascript
const result = await generateHighRes({ subject, style, bodyPart });
// result.images = array of generated image URLs
```

### `hybridMatchService.js`
**Core matching algorithm** - combines graph and vector search.

**How It Works**:
1. Parallel execution: Neo4j graph query + Supabase vector search
2. Graph query uses Cypher for relationship traversal
3. Vector query uses cosine similarity on embeddings
4. RRF combines rankings: `score = 1 / (k + rank)` where k=60
5. Weighted merge: 50% graph, 50% vector by default

**Input**: `{ query, preferences: { location, styles, budget }, maxResults }`
**Output**: `{ matches: [...], totalCandidates, queryInfo }`

### `canvasService.ts`
Pure functions for layer manipulation - **never mutates input**.

**Pattern**:
```typescript
// Wrong: mutates layers array
layers[0].visible = false;

// Correct: returns new array
const updated = toggleLayerVisibility(layers, layerId);
setLayers(updated);
```

**Export Functions**:
- `exportAsPNG()` - High-quality composite (full resolution)
- `exportAsARAsset()` - AR-optimized 1024x1024 PNG

### `versionService.js`
Version control for designs with localStorage backend.

**Key Functions**:
- `addVersion()` - Auto-increments version number
- `branchFromVersion()` - Creates new session from historical version
- `compareVersions()` - Returns diff + similarity score (0-100)
- `getVersionTimeline()` - Returns metadata for UI rendering

**Storage Schema**:
```javascript
{
  id: 'uuid',
  versionNumber: 1,
  timestamp: 'ISO8601',
  prompt: 'string',
  enhancedPrompt: 'string',
  parameters: {...},
  layers: [...],
  imageUrl: 'string',
  branchedFrom: { sessionId, versionId, versionNumber },
  mergedFrom: { version1, version2, mergeOptions },
  isFavorite: boolean
}
```

## Design System & Styling

### Brand Colors
- **Primary**: Ducks Green (`#154733`) - Brand identity, accents
- **Secondary**: Ducks Yellow (`#FEE123`) - CTAs, highlights
- **Background**: Pure black (`#000000`) - "Tactile Scar Tissue" aesthetic

### Typography
**Anti-AI-Slop Philosophy**: Avoids Inter/Roboto

- `font-display` (Space Grotesk) - Headings, titles
- `font-sans` (Outfit) - Body text
- `font-mono` (JetBrains Mono) - Technical elements, code

### Component Patterns
- `.glass-panel` - Frosted glass effect (common container)
- `border-white/10` - Subtle borders (dark theme standard)
- `hover:bg-white/20` - Interactive state (glass morphism)

### Animation Philosophy
Subtle, purposeful motion only:
- `animate-fade-in` - New content appearance
- `animate-slide-up` - Modal/panel reveals
- `animate-pulse-glow` - Active state indicators

## Common Patterns & Best Practices

### Adding a New Feature

1. **Service First**: Implement business logic in `/src/services/`
   ```javascript
   // myService.js - pure functions, no React
   export function doThing(input) { ... }
   ```

2. **Hook (if stateful)**: Create custom hook in `/src/hooks/`
   ```javascript
   // useMyFeature.js - wraps service with state
   export function useMyFeature() {
     const [state, setState] = useState();
     // orchestrate service calls
     return { state, actions };
   }
   ```

3. **Component**: Build UI in `/src/components/` or `/src/pages/`
   ```javascript
   // MyComponent.jsx - purely presentational
   import { useMyFeature } from '../hooks/useMyFeature';
   ```

4. **Test**: Add test in corresponding `.test.js` file
   ```javascript
   // myService.test.js
   import { describe, it, expect } from 'vitest';
   ```

### Working with Layers

Always use the hook, never manipulate layers directly:

```javascript
const {
  layers,           // Current layer state
  addLayer,         // Add new layer
  updateTransform,  // Move/rotate/scale
  updateBlendMode,  // Change blend mode
  deleteLayer,      // Remove layer
  reorder,          // Change z-index
} = useLayerManagement();

// Example: Add generated image as layer
await addLayer(imageUrl, 'subject'); // type: 'subject' | 'background' | 'effect'
```

### Working with Versions

```javascript
const {
  versions,          // All versions for session
  currentVersionId,  // Active version
  addVersion,        // Save new version
  loadVersion,       // Restore historical version
} = useVersionHistory(sessionId);

// Example: Save current design state
addVersion({
  prompt: userPrompt,
  enhancedPrompt: councilEnhanced,
  layers: currentLayers,
  parameters: { model, size, etc }
});
```

### API Calls with Auth

All API calls to the backend require bearer token:

```javascript
const response = await fetch(`${PROXY_URL}/api/predictions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_FRONTEND_AUTH_TOKEN}`
  },
  body: JSON.stringify(payload)
});
```

### Body Part Aspect Ratios

Always use the constants for anatomically-accurate canvases:

```javascript
import { BODY_PART_CONFIGS, DEFAULT_BODY_PART } from '../constants/bodyPartAspectRatios';

const config = BODY_PART_CONFIGS['forearm'];
// config.aspectRatio = 1/3 (vertical)
// config.width = 1, config.height = 3
// config.category = 'arm'
```

**Why This Matters**: Canvas aspect ratio must match body part to prevent distortion when overlaying in AR or printing as stencil.

## Environment Variables

### Required Variables

```bash
# Replicate AI (backend only)
REPLICATE_API_TOKEN=r8_...

# Auth (must match on frontend + backend)
FRONTEND_AUTH_TOKEN=your-secret-token
VITE_FRONTEND_AUTH_TOKEN=your-secret-token

# Backend URL (frontend)
VITE_PROXY_URL=http://127.0.0.1:3001/api

# Supabase (vector DB)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ... # backend only

# Neo4j (graph DB)
NEO4J_URI=neo4j+s://...
NEO4J_USER=neo4j
NEO4J_PASSWORD=...

# OpenRouter (AI Council)
OPENROUTER_API_KEY=sk-or-...
```

### Development vs Production

**Development**:
- Uses `dev-token-change-in-production` for auth (acceptable)
- CORS allows `localhost:3000` and `localhost:5173`
- Client-side rate limiting only

**Production**:
- Strong auth token required
- CORS restricted to production domains
- Server-side rate limiting enforced
- API tokens never exposed to client

## Testing Strategy

### Test Files Location
- Services: `src/services/[name].test.js`
- Hooks: `src/hooks/[name].test.js`
- Components: `src/components/[name].test.jsx`

### Running Tests

```bash
# Run all tests
npm test

# Watch mode (TDD)
npm run test:watch

# UI mode (visual debugging)
npm run test:ui

# Coverage report
npm run test:coverage
```

### Testing Utilities
- **Vitest** - Test runner (Jest-compatible API)
- **@testing-library/react** - Component testing
- **@testing-library/user-event** - User interaction simulation
- **jsdom** - DOM environment for Node.js

## Troubleshooting

### "Origin not allowed" CORS error
- Check `ALLOWED_ORIGINS` in backend `.env`
- Verify frontend is using exact origin in whitelist
- Restart backend after `.env` changes

### "REPLICATE_API_TOKEN not configured"
- Token must be in backend `.env` (NOT `VITE_` prefixed)
- Restart `npm run server` after adding

### Layers not persisting
- Check `sessionStorage` is enabled in browser
- Verify `STORAGE_KEY` matches in `useLayerManagement`
- Check browser console for serialization errors

### Version history not showing
- Ensure unique `sessionId` exists in `sessionStorage`
- Check `localStorage` quota hasn't been exceeded
- Verify version data structure matches schema

### Neo4j connection failures
- Verify `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` are set
- Check network allows connection to Neo4j Aura/instance
- Test connection: `npm run neo4j:import` (will fail gracefully with clear error)

## Important Constraints

### Bootstrap Budget Constraints
- $500 Replicate API budget for Phase 1
- Client-side budget tracking in `localStorage`
- Rate limiting: 10 requests/minute to prevent overruns
- Optimize prompts to reduce regeneration needs

### Storage Limitations
- **localStorage**: ~5-10MB total (browser-dependent)
- **sessionStorage**: Cleared on tab close
- **IndexedDB**: Used for large image blobs only
- Version history: 50 versions max per session, 90-day auto-purge

### Performance Targets
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.0s
- Canvas operations: < 16ms (60fps)

### Security Notes
**Development MVP**: API tokens visible in client (acceptable for prototyping)
**Production TODO**: Move all API calls to server-side, implement proper auth

## Custom Skills

TatTester includes custom Claude Code skills in `skills.json`:

- **fabricjs-canvas**: Fabric.js canvas editor integration
- **neo4j-cypher**: Neo4j Cypher query assistance
- **playwright-testing**: E2E testing with Playwright
- **react-shadcn-ui**: React + Tailwind + shadcn/ui components
- **stripe-connect**: Stripe Connect payment integration
- **threejs-webxr**: Three.js WebXR for AR features

**Usage**: Skills are automatically available in Claude Code sessions when working in this repository.

## Quick Reference

### Project Structure
```
src/
├── api/routes/          # Backend API v1 routes
├── components/          # React components
│   ├── generate/        # "The Forge" design studio
│   ├── ui/              # Reusable UI components
│   └── [feature]/       # Feature-specific components
├── constants/           # Shared constants (body parts, etc.)
├── hooks/               # Custom React hooks
├── lib/                 # Third-party library configs
├── pages/               # Route pages (Home, Generate, Library)
├── services/            # Business logic & API clients
├── test/                # Test utilities and setup
└── App.jsx              # Root component + router
```

### Key Files
- `server.js` - Express backend, API proxy
- `tailwind.config.js` - Design system tokens
- `vite.config.js` - Build configuration
- `package.json` - Dependencies & scripts
- `.env` - Environment variables (git-ignored)

### Useful Paths
- Layer management: `src/hooks/useLayerManagement.ts`
- Version control: `src/services/versionService.js`
- AI generation: `src/services/replicateService.js`
- Hybrid matching: `src/services/hybridMatchService.js`
- Canvas operations: `src/services/canvasService.ts`
- Prompt enhancement: `src/services/councilService.js`

---

**Last Updated**: January 2026
**Phase**: MVP (Phase 1) - "The Forge" with hybrid vector-graph matching

# Technology Stack

**Analysis Date:** 2026-01-31

## Languages

**Primary:**
- TypeScript 5.x - All source code in `src/`
- JavaScript (ES Module) - Legacy services in `src/services/*.js`

**Secondary:**
- Python 3.x - Artist generation scripts (`generate-artists.py`)

## Runtime

**Environment:**
- Node.js 24.11.0

**Package Manager:**
- npm 10.x
- Lockfile: package-lock.json (v3) present

## Frameworks

**Core:**
- Next.js 16.1.2 - App router, server components, edge runtime
- React 19.2.3 - UI components
- React DOM 19.2.3 - Rendering

**Testing:**
- Vitest - Unit/integration testing
- @vitejs/plugin-react - React support for Vitest
- jsdom - Browser environment simulation

**Build/Dev:**
- TypeScript 5.x compiler - Type checking
- ESLint 9 - Linting with eslint-config-next
- Tailwind CSS 3.4.17 - Utility-first styling
- PostCSS 8.4.49 - CSS processing with autoprefixer
- Turbopack - Next.js dev bundler

## Key Dependencies

**Critical:**
- @google-cloud/vertexai 1.10.0 - Imagen 3 image generation and Gemini 2.0 Flash text generation
- @google-cloud/storage 7.18.0 - GCS file uploads (designs, layers, stencils, portfolios)
- @google-cloud/vision 5.3.4 - Image segmentation and layer decomposition
- @google-cloud/aiplatform 6.1.0 - Vertex AI REST API integration
- firebase 12.8.0 - Firebase client SDK for real-time database (Match Pulse)
- firebase-admin 13.6.0 - Firebase Admin SDK for server-side operations
- @supabase/supabase-js 2.90.1 - PostgreSQL + pgvector for artist profiles and embeddings
- neo4j-driver 6.0.1 - Graph database for artist relationships and genealogy
- replicate 1.4.0 - Segment Anything Model (SAM) for image segmentation fallback

**Infrastructure:**
- google-auth-library 10.5.0 - GCP access token generation for edge runtime
- jose 6.1.3 - JWT handling for authentication
- express 5.2.1 - Custom backend server (`server.js`)
- express-rate-limit 8.2.1 - API rate limiting
- cors 2.8.5 - CORS middleware
- dotenv 17.2.3 - Environment variable management
- sharp 0.34.5 - Image processing and resizing

**UI/UX:**
- framer-motion 12.26.2 - Animation library
- @react-spring/web 10.0.3 - Spring-based animations
- @dnd-kit/core 6.3.1 - Drag and drop interactions
- @dnd-kit/sortable 10.0.0 - Sortable lists
- lucide-react 0.562.0 - Icon library
- zustand 5.0.10 - State management
- konva 10.2.0 - Canvas rendering for design editor
- react-konva 19.2.1 - React wrapper for Konva
- react-tinder-card 1.6.4 - Swipeable card UI
- jspdf 4.0.0 - PDF generation for stencil exports

## Configuration

**Environment:**
- `.env.local` - Active environment variables (gitignored)
- `.env.master` - Template with safe defaults (committed)
- `.env.example` - Public template (committed)
- All Google Cloud credentials loaded via `GOOGLE_APPLICATION_CREDENTIALS` pointing to `./gcp-service-account-key.json`

**Build:**
- `next.config.ts` - Next.js configuration with webpack customization for Node.js polyfills
- `tsconfig.json` - TypeScript compiler options with path alias `@/*` to `./src/*`
- `tailwind.config.ts` - Tailwind CSS theme customization
- `postcss.config.mjs` - PostCSS with Tailwind and Autoprefixer
- `eslint.config.mjs` - ESLint flat config with Next.js presets
- `vitest.config.js` - Vitest test runner configuration

## Platform Requirements

**Development:**
- Node.js 20+ (v24.11.0 currently in use)
- npm 10+
- Google Cloud service account key JSON file
- Firebase Admin service account key JSON file

**Production:**
- Vercel (primary deployment target)
  - Project ID: `prj_avt0C5zThGOVeEhZl6VgwuOEQF3o`
  - Edge runtime support for API routes
- Docker support via multi-stage Dockerfile (Node 20-alpine)
- Supports both Edge runtime and Node.js runtime API routes

---

*Stack analysis: 2026-01-31*

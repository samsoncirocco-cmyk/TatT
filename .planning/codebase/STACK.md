# Technology Stack

**Analysis Date:** 2026-01-31

## Languages

**Primary:**
- TypeScript 5 - Type-safe server and client code, used in critical services and API routes
- JavaScript (ES6+) - Legacy services and configuration files (gradual TypeScript migration in progress)

**Supporting:**
- React JSX/TSX - Component rendering (React 19.2.3)
- CSS/Tailwind - Styling

## Runtime

**Environment:**
- Node.js v24.11.0
- Browser (React 19.2.3, React DOM 19.2.3)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Next.js 16.1.2 - Full-stack React framework with App Router
- React 19.2.3 - UI component library
- React DOM 19.2.3 - DOM rendering

**UI & Animation:**
- Framer Motion 12.26.2 - Advanced animations and transitions
- React Spring 10.0.3 - Spring physics animations
- Lucide React 0.562.0 - Icon library
- Konva 10.2.0 - Canvas drawing library for tattoo design visualization
- React Konva 19.2.1 - React wrapper for Konva
- React Tinder Card 1.6.4 - Card swipe interface for artist matching

**Drag & Drop:**
- @dnd-kit/core 6.3.1 - Headless drag-and-drop library
- @dnd-kit/sortable 10.0.0 - Sortable preset for dnd-kit
- @dnd-kit/utilities 3.2.2 - Utilities for dnd-kit

**State Management:**
- Zustand 5.0.10 - Lightweight state management

**Export/PDF:**
- jsPDF 4.0.0 - PDF generation for design exports

## Key Dependencies

**Critical - AI & Image Generation:**
- Replicate 1.4.0 - SDXL and anime model inference (tattoo design generation)
- @google-cloud/vertexai 1.10.0 - Vertex AI Gemini models (LLM Council, prompt enhancement)
- @google-cloud/vision 5.3.4 - Vision API for layer decomposition and image analysis
- @google-cloud/aiplatform 6.1.0 - AI Platform for Imagen 3 image generation
- @google-cloud/storage 7.18.0 - Google Cloud Storage for asset storage

**Critical - Database & Search:**
- @supabase/supabase-js 2.90.1 - PostgreSQL with pgvector extension for vector embeddings
- neo4j-driver 6.0.1 - Neo4j graph database for artist genealogy and relationships

**Critical - Authentication & Real-time:**
- firebase 12.8.0 - Client-side Realtime Database for Match Pulse feature
- firebase-admin 13.6.0 - Server-side admin operations
- jose 6.1.3 - JWT token handling for API authentication
- google-auth-library 10.5.0 - Google Authentication utilities

**Infrastructure:**
- express 5.2.1 - Express.js server (server.js) for API proxy and backend
- cors 2.8.5 - CORS middleware for cross-origin requests
- express-rate-limit 8.2.1 - Rate limiting for API endpoints
- dotenv 17.2.3 - Environment variable management
- sharp 0.34.5 - Image processing and optimization

**Development:**
- TypeScript 5 - Type checking (compiler)
- @types/node 20 - Node.js type definitions
- @types/react 19 - React type definitions
- @types/react-dom 19 - React DOM type definitions
- eslint 9 - Code linting
- eslint-config-next 16.1.2 - Next.js ESLint configuration
- tailwindcss 3.4.17 - Utility-first CSS framework
- autoprefixer 10.4.20 - CSS vendor prefix automation
- postcss 8.4.49 - CSS transformation processor

## Configuration

**Environment:**
- `.env.local` - Local development secrets and configuration
- `.env.example` - Template for required environment variables
- Uses `NEXT_PUBLIC_*` prefix for client-side accessible variables
- Uses `SUPABASE_SERVICE_KEY`, `REPLICATE_API_TOKEN`, `OPENROUTER_API_KEY` for server-side secrets

**Build:**
- `next.config.ts` - Next.js configuration with Turbopack and webpack fallbacks for Node.js modules
- `tsconfig.json` - TypeScript configuration with path alias `@/*` mapping to `./src/*`
- `postcss.config.mjs` - PostCSS config with Tailwind and Autoprefixer
- `eslint.config.mjs` - ESLint configuration using Next.js presets
- `tailwind.config.js` / `tailwind.config.ts` - Tailwind CSS configuration
- `vitest.config.js` - Vitest test runner configuration
- `vite.config.js` - Vite bundler configuration (legacy, superseded by Next.js)

**Server:**
- `server.js` - Express proxy server for Replicate API, Neo4j queries, and rate-limited endpoints
- Configured for Railway deployment with `PORT` and `HOST` environment variables
- CORS whitelist with support for Vercel domains

## Platform Requirements

**Development:**
- Node.js v24+ with npm
- `.env.local` file with all required secrets (see `.env.example`)
- GCP service account credentials for Vertex AI and Cloud Storage
- Firebase service account key (optional for development, required for production)
- Neo4j database access (can be local or remote)
- Supabase project with pgvector extension enabled

**Production:**
- Vercel (Next.js frontend hosting)
- Railway (Express backend server)
- Google Cloud Platform (Vertex AI, Cloud Storage, AI Platform)
- Firebase (Realtime Database)
- Neo4j Cloud (graph database)
- Supabase (PostgreSQL with pgvector)
- Replicate (model inference)
- OpenRouter (optional, for LLM Council alternatives)

---

*Stack analysis: 2026-01-31*

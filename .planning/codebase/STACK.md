# Technology Stack

**Analysis Date:** 2026-02-15

## Languages

**Primary:**
- TypeScript 5 - Frontend components, services, API routes, type safety
- JavaScript (Node.js) - Backend utilities, service layer, configuration

**Secondary:**
- JSX/TSX - React component files

## Runtime

**Environment:**
- Node.js (latest LTS) - Backend and build

**Package Manager:**
- npm - Dependency management
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Next.js 16.1.2 - Full-stack React framework with API routes, production build optimization
- React 19.2.3 - UI component library
- React DOM 19.2.3 - React rendering engine

**Build/Dev:**
- Vite 5 - Configured but overridden by Next.js build in production (`vite.config.js`)
- Turbopack - Next.js internal bundler (with webpack fallback)
- TypeScript 5 - Type checking and compilation
- ESLint 9 - Code linting (`eslint.config.mjs`)

**Testing:**
- Vitest 4.0.18 - Jest-compatible test runner
- @testing-library/react 16.3.2 - Component testing utilities
- @testing-library/dom 10.4.1 - DOM testing
- @testing-library/jest-dom 6.9.1 - Custom matchers
- jsdom 28.0.0 - DOM environment for Node.js tests
- supertest 7.2.2 - HTTP assertion library

## Key Dependencies

**Critical (Core Functionality):**
- @supabase/supabase-js 2.90.1 - Vector database client (pgvector embeddings for artist matching)
- neo4j-driver 6.0.1 - Neo4j graph database client for artist relationship queries
- replicate 1.4.0 - Image generation API client (SDXL, Anime XL, DreamShaper)
- firebase 12.8.0 - Realtime database for Match Pulse feature (browser)
- firebase-admin 13.6.0 - Firebase Admin SDK for server operations
- @google-cloud/aiplatform 6.1.0 - Vertex AI image generation (Imagen 3)
- @google-cloud/storage 7.18.0 - Google Cloud Storage for generated images
- @google-cloud/vertexai 1.10.0 - Vertex AI SDK for Gemini prompts
- @google-cloud/vision 5.3.4 - Google Cloud Vision API (image analysis)
- google-auth-library 10.5.0 - GCP authentication

**State Management:**
- zustand 5.0.10 - Lightweight state management (alternative to Redux)

**UI & Animation:**
- framer-motion 12.26.2 - Advanced animation library
- @react-spring/web 10.0.3 - Spring physics animations
- react-tinder-card 1.6.4 - Swipeable card component
- lucide-react 0.562.0 - Icon library

**Canvas & Graphics:**
- konva 10.2.0 - Canvas graphics library
- react-konva 19.2.1 - React wrapper for Konva
- jspdf 4.0.0 - PDF export generation
- sharp 0.34.5 - High-performance image processing

**Drag & Drop:**
- @dnd-kit/core 6.3.1 - Headless drag-and-drop
- @dnd-kit/sortable 10.0.0 - Sortable extension
- @dnd-kit/utilities 3.2.2 - Utilities

**Routing:**
- react-router-dom 7.13.0 - Client-side routing (used in some contexts)

**Backend/Infrastructure:**
- express 5.2.1 - HTTP server (proxy server in `server.js`)
- express-rate-limit 8.2.1 - Rate limiting middleware
- cors 2.8.5 - CORS middleware
- dotenv 17.2.3 - Environment variable loading
- jose 6.1.3 - JWT token handling

**Styling:**
- tailwindcss 4 - Utility-first CSS framework (defined in `tailwind.config.js` and `tailwind.config.ts`)
- @tailwindcss/postcss 4 - PostCSS plugin
- autoprefixer 10.4.24 - Vendor prefix auto-addition
- postcss (via PostCSS config) - CSS transformation

**Development Tools:**
- @types/node 20 - TypeScript types for Node.js
- @types/react 19 - TypeScript types for React
- @types/react-dom 19 - TypeScript types for React DOM
- @vitejs/plugin-react 5.1.3 - Vite React plugin

## Configuration

**Environment:**
- `.env` file (git-ignored) - Runtime configuration
- Environment variables prefixed `NEXT_PUBLIC_` - Exposed to client
- Environment variables without prefix - Server-only secrets

**Key configs required (see INTEGRATIONS.md for full list):**
- Replicate API token (server-side only)
- Firebase credentials
- Supabase URL and keys
- Neo4j connection details
- Google Cloud credentials
- Vertex AI project configuration

**Build:**
- `next.config.ts` - Next.js configuration with webpack fallbacks for server-only imports
- `tsconfig.json` - TypeScript compilation settings with path aliases (`@/*` → `./src/*`)
- `vitest.config.js` - Test runner configuration
- `tailwind.config.js` and `tailwind.config.ts` - Styling system definition
- `postcss.config.mjs` - CSS processing configuration
- `eslint.config.mjs` - Linting rules

## Platform Requirements

**Development:**
- Node.js LTS
- npm 10+
- macOS/Linux/Windows with bash support

**Production:**
- Deployment target: Vercel (Next.js optimized), Railway, or any Node.js 18+ host
- Environment variables configured per deployment platform
- Edge runtime support for some routes (`export const runtime = 'edge'`)

---

*Stack analysis: 2026-02-15*

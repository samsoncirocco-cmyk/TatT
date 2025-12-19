# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TatTester** is an AI-powered tattoo design and artist matching platform built with React + Vite + Tailwind CSS. Currently in MVP phase (Phase 0) with client-side data storage, preparing for backend integration (Phase 1) and native mobile app migration (Phase 2).

**Core Value Proposition:** Help first-time tattoo seekers overcome commitment anxiety through AI design generation, AR visualization, and smart artist matching.

**Current Status (Dec 15, 2024):**
- ✅ React web app fully functional at localhost:5173
- ✅ **AI Design Generation** with 4 models (SDXL, Anime XL, DreamShaper XL, Tattoo Flash Art)
- ✅ **AI Inpainting** - Edit specific parts of designs with brush tool
- ✅ **300 DPI Stencil Export** - Professional tattoo-ready output
- ✅ Artist matching algorithm implemented (40% style, 25% keywords, 15% distance, 10% budget, 10% random)
- ✅ Camera-based tattoo visualization working
- ✅ Tinder-style artist swiping implemented
- ✅ Market research completed (TAM: $33-37B, SAM: $12-15B, SOM: $5-10M ARR by Year 3)
- ✅ Express.js proxy server for Replicate API
- ⚠️ No backend yet (localStorage + IndexedDB only)
- ⚠️ Neo4j populated but not connected to UI

## Setup Instructions

### Prerequisites
- Node.js 18+
- npm

### First-Time Setup
```bash
cd tatt-tester
npm install --legacy-peer-deps
cp .env.example .env  # Add your Replicate API key
npm run dev          # Frontend on port 5173
npm run server       # Backend proxy on port 3001 (in separate terminal)
```

- Frontend: http://localhost:5173/
- Backend: http://localhost:3001/

### Environment Variables
Create `.env` file with:
```
VITE_REPLICATE_API_TOKEN=your_replicate_api_token
REPLICATE_API_TOKEN=your_replicate_api_token  # Same token for server.js
VITE_PROXY_URL=http://localhost:3001/api      # Backend proxy URL
VITE_DEMO_MODE=false                          # Set to true for testing without API
NEO4J_URI=bolt://localhost:7687               # Phase 1
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
```

## Development Commands

```bash
npm run dev          # Start frontend dev server (Vite on port 5173)
npm run server       # Start backend proxy server (Express on port 3001)
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run neo4j:import # Import artists.json to Neo4j
```

### Common Dev Server Issues
- **Port 5173 in use:** Kill process with `lsof -i :5173` then `kill -9 <PID>`
- **React dependencies error:** Run `npm install @react-spring/web@^9.7.5 --legacy-peer-deps`
- **Server dies immediately:** Check for conflicting Vite processes in `/Users/ciroccofam/tatt-tester/` (wrong directory)

## Architecture

### Tech Stack
- **Frontend:** React 19.2.0 + Vite 7.2.7 + Tailwind CSS 3.4.19
- **Backend:** Express.js 5.2.1 (proxy server for Replicate API)
- **Routing:** React Router v7.10.1
- **UI Components:** react-tinder-card for swiping, @react-spring/web for animations
- **AI Generation:** Replicate.com (SDXL, Anime XL, DreamShaper XL, Tattoo Flash Art)
- **AI Inpainting:** Stable Diffusion Inpainting for design editing
- **Image Processing:** Canvas API (browser) + Sharp.js 0.33.1 (300 DPI stencils)
- **Data Storage (Phase 0):** localStorage + IndexedDB (client-side only)
- **Database (Phase 1):** Neo4j 6.0.1 (populated, not connected)

### File Structure
```
src/
├── pages/
│   ├── Home.jsx          - Landing page with CTAs
│   ├── Visualize.jsx     - Camera + photo upload + tattoo overlay
│   ├── SmartMatch.jsx    - Preference input form (styles, keywords, location, budget)
│   ├── SwipeMatch.jsx    - Tinder-style artist swiping
│   ├── Artists.jsx       - Artist gallery grid view
│   ├── ArtistProfile.jsx - Individual artist details
│   └── Yolo.jsx          - Random design generator (placeholder)
├── components/
│   ├── Layout.jsx            - Navigation header
│   ├── DesignGenerator.jsx   - AI tattoo design generation UI
│   ├── InpaintingEditor.jsx  - Design editing with brush tool
│   ├── StencilExport.jsx     - 300 DPI stencil processor
│   ├── DesignLibrary.jsx     - Saved designs gallery
│   └── Home.jsx              - Homepage component
├── services/
│   ├── replicateService.js      - AI generation API
│   ├── inpaintingService.js     - AI inpainting API
│   ├── imageProcessingService.js- Canvas + Sharp.js processing
│   ├── designLibraryService.js  - localStorage design management
│   └── stencilService.js        - 300 DPI export processing
├── config/
│   └── promptTemplates.js    - Style-specific AI prompts
├── utils/
│   └── matching.js          - Artist matching algorithm
├── data/
│   ├── artists.json         - 50+ Austin artists
│   └── designs.json         - Tattoo design catalog
├── App.jsx                  - React Router setup
└── server.js                - Express proxy for Replicate API
```

### Key Routes
- `/` - Homepage
- `/generate` - **AI tattoo design generation** (4 AI models, inpainting, stencil export)
- `/library` - **Saved design library** (up to 50 designs in localStorage)
- `/visualize` - Camera + tattoo preview
- `/smart-match` - Preference input (entry point for swipe flow)
- `/swipe` - Artist matching & swiping (requires preferences from /smart-match)
- `/artists` - Artist gallery
- `/artists/:id` - Artist profile
- `/yolo` - Random design generator (placeholder)

### Matching Algorithm (matching.js)
Implemented in `src/utils/matching.js`:

1. **Style Overlap (40%)** - Count of matching styles between user preferences and artist specialties
2. **Keyword Match (25%)** - Fuzzy match on artist tags (dragon, floral, etc.)
3. **Distance (15%)** - Haversine distance calculation from user location
   - Uses `getCoordinatesFromZipCode()` for simple zip/city lookup
   - Defaults to Austin, TX (30.2672, -97.7431) if no location provided
4. **Budget Fit (10%)** - Artist hourly rate vs user budget
5. **Random Quality (10%)** - Adds variety to prevent identical results

Returns top 20 artists sorted by score.

### Data Flow
**Current (Phase 0):**
User → SmartMatch form → preferences object → calculateMatches() → SwipeMatch → localStorage tracking

**Phase 1 (Backend):**
User → JWT auth → Neo4j queries → Replicate API → Cloud storage

### Known Limitations (Phase 0)
- **Hardcoded user ID:** `'user-123'` in trackSwipe() (will fix with JWT auth in Phase 1)
- **Static artist data:** artists.json with 50+ Austin artists (Neo4j ready but not connected)
- **Location lookup:** Simple zip code map in matching.js (will use geocoding API in Phase 1)
- **Client-side storage:** All data in localStorage/IndexedDB (50 design limit)
- **Replicate API key:** Visible in browser (move to server-side in production)
- **Sharp.js processing:** Browser-based (slower than server-side)

## Design System

TatTester uses a holistic design system inspired by cocreate.app's minimalist aesthetic. All design tokens are defined in `src/config/theme.js`.

### Color Palette
- **Primary**: `#18181b` (zinc-900) - Deep ink black representing tattoo culture
- **Accent**: `#ef4444` (red-500) - Tattoo red for strategic CTAs
- **Backgrounds**: `#fafafa` (neutral-50) - Light gallery gray
- **Cards**: White (`#ffffff`) with `#e5e5e5` borders
- **Text**: `#18181b` (zinc-900) for headings, `#737373` (neutral-500) for body

### Typography
- **Headings**: font-light with tracking-tight for clean, modern look
- **Body**: font-light for descriptive text, font-medium for buttons/labels
- **Hierarchy**: text-6xl → text-5xl → text-4xl → text-3xl → text-2xl → text-xl

### Components
- **Buttons**: Primary (zinc-900), Accent (red-500), Secondary (neutral-100)
- **Cards**: White bg, border-neutral-200, shadow-sm, rounded-lg
- **Inputs**: border-neutral-300, focus:ring-zinc-900, transition-colors
- **Spacing**: 8px grid system (p-4, p-6, p-8, gap-8, gap-16)
- **Shadows**: Minimal (shadow-sm for cards, shadow-md for hover)
- **Transitions**: 200ms duration for smooth interactions

### Design Philosophy
- **Gallery-first**: Generous whitespace to let designs breathe
- **Flat design**: Minimal shadows and gradients
- **Function-first**: Clean interfaces without visual clutter
- **Confident simplicity**: Reduce anxiety through clear, predictable UI

### Recent Updates (Dec 15, 2024)
1. **Applied holistic design system** - Cocreate-inspired minimalist aesthetic across all pages
2. **Merged AI generation project** - Integrated full AI tattoo design generation system
3. **Added 4 AI models** - SDXL, Anime XL, DreamShaper XL, Tattoo Flash Art (different costs/speeds)
4. **Implemented inpainting** - Edit specific parts of designs with AI-powered brush tool
5. **Added stencil export** - 300 DPI professional tattoo stencil output
6. **Created design library** - Save up to 50 designs with search/filter/favorites
7. **Added Express backend** - Proxy server for Replicate API to avoid CORS
8. **Fixed hardcoded location** - Users can now enter zip code/city in SmartMatch.jsx
9. **Added error handling** - SwipeMatch.jsx handles empty artists, invalid preferences, missing images
10. **Improved camera button** - Visualize.jsx capture button now larger with visible text
11. **Created theme.js** - Centralized design tokens and utility functions

### Testing Checklist
Before committing changes, verify:
- [ ] Dev server runs at localhost:5173
- [ ] Backend server runs at localhost:3001
- [ ] /generate loads AI model options and design form
- [ ] /library shows saved designs (or empty state)
- [ ] /visualize camera opens and capture button is visible
- [ ] /smart-match form accepts location input
- [ ] /swipe shows matched artists with scores
- [ ] /artists shows artist gallery
- [ ] No console errors in browser DevTools
- [ ] `npm run lint` passes

### Dependencies Notes
- **@react-spring/web:** Installed with `--legacy-peer-deps` due to React 19 compatibility
- **react-tinder-card:** Requires @react-spring/web as peer dependency
- **sharp:** Image processing for 300 DPI stencil export (0.33.1)
- **replicate:** AI generation client library (0.25.2)
- **express + cors:** Backend proxy server for Replicate API

### Phase Roadmap
**Phase 0 (Current):** React web app, client-side storage, static artist data
**Phase 1 (Next):** Backend integration, JWT auth, Neo4j, Replicate API, booking system
**Phase 2 (Future):** React Native migration, native AR (TensorFlow Lite), E2E encryption

See `/TatTester_Market_Research/Architecture_Component_Diagram.md` for complete architecture details.

# TatT — Demo Mode Setup

**For: Killua (and any other testers)**  
Zero external credentials needed. Everything runs locally with mock data.

---

## What Works in Demo Mode

| Feature | Status | Notes |
|---|---|---|
| AI Tattoo Generation | ✅ Mock images | Returns 4 real tattoo photos (Unsplash) |
| LLM Council Enhancement | ✅ Mock prompts | Returns 3 quality prompt variants |
| Artist Matching (Neural Ink) | ✅ Mock artists | 5 demo artists with scores |
| Forge Canvas (Layer Editor) | ✅ Full UI | Works fully client-side |
| Design Library | ✅ localStorage | Saves to browser (no Firebase needed) |
| AR Preview | ⚠️ Disabled | Needs device camera — toggle flag to enable |
| Stencil Export | ✅ | Client-side only |
| Auth (Sign up / Log in) | ⚠️ Skipped | App runs unauthenticated — designs save locally |

---

## Quickstart

### 1. Clone & install

```bash
git clone <repo-url> TatT
cd TatT
npm install
```

### 2. Copy the demo environment file

```bash
cp env.demo .env.local
```

That file ships with the repo (`env.demo`) — all credentials blank, demo mode on. No editing needed.

### 3. Start the dev server

```bash
npm run dev
```

Then open: **http://localhost:3000**

That's it. No Firebase, no Replicate, no Supabase, no Neo4j.

---

## Key Flows to Test

### Flow 1 — Design Generation
1. Click **Generate** in the nav
2. Type a tattoo idea (e.g. "geometric wolf on forearm")
3. Pick a style (Blackwork, Traditional, etc.)
4. Hit **Generate** — AI "thinks" for 1.5s then returns 4 variations
5. Click a variation to open it in **Forge Canvas**

### Flow 2 — Artist Match (Neural Ink)
1. Click **Artists** in the nav or **Find Artists** after generating
2. Enter your style preferences and location
3. Hit **Match** — returns 5 ranked demo artists with scores
4. Click an artist to see their profile

### Flow 3 — Forge Canvas
1. From the generation results, click any image
2. The canvas loads with layer controls on the right
3. Try: scale, rotate, position — all fully functional
4. Export as PNG or stencil

---

## Turning Off Demo Mode (when credentials are ready)

Edit `.env.local` and set:

```bash
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_COUNCIL_DEMO_MODE=false
```

Then add real credentials for Firebase, Replicate, Supabase, and Neo4j.

---

## Troubleshooting

**"Port 3000 already in use"**  
```bash
npm run dev -- -p 3001
```

**"Module not found" errors**  
```bash
rm -rf .next node_modules
npm install
npm run dev
```

**Images not loading**  
Demo images are served from Unsplash CDN — you need an internet connection.

**Console warnings about Firebase**  
Expected in demo mode. Warnings like `[Firebase Client] Missing required environment variables` are normal and harmless.

---

## How Demo Mode Works (for the curious)

The `NEXT_PUBLIC_DEMO_MODE=true` flag activates shortcuts at three layers:

1. **Client services** (`replicateService.ts`, `councilService.ts`) — skip API calls, return mock data with a simulated delay
2. **API routes** (`/api/v1/generate`, `/api/v1/council/enhance`, `/api/v1/match/semantic`) — return demo data immediately without hitting Vertex AI or Supabase
3. **Auth middleware** — bypasses Firebase session checks; all routes are publicly accessible

Designs save to `localStorage` instead of Firestore when unauthenticated.

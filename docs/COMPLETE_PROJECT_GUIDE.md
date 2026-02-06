# TatTester - Complete Project Guide for Beginners

> **Last Updated:** December 18, 2024
> **Your Project Location:** `/Users/ciroccofam/my-project/tatt-tester`

---

## 🗂️ Project Structure (Where Everything Lives)

```
/Users/ciroccofam/my-project/tatt-tester/
│
├── 📁 src/                          ← All your code lives here
│   ├── 📁 components/               ← React UI components
│   │   ├── DesignGenerator.jsx              (Original generator)
│   │   ├── DesignGeneratorWithCouncil.jsx   (✨ NEW: With AI Council)
│   │   ├── PromptEnhancer.jsx               (✨ NEW: Council UI)
│   │   ├── CouncilLoadingState.jsx          (✨ NEW: Loading animation)
│   │   ├── MultiModelResults.jsx            (✨ NEW: Multi-model voting UI)
│   │   ├── Layout.jsx                       (Navigation header)
│   │   ├── InpaintingEditor.jsx             (Edit designs with brush)
│   │   ├── StencilExport.jsx                (300 DPI stencil maker)
│   │   └── DesignLibrary.jsx                (Saved designs gallery)
│   │
│   ├── 📁 services/                 ← Backend logic & API calls
│   │   ├── replicateService.js              (AI image generation)
│   │   ├── councilService.js                (✨ NEW: AI prompt enhancement)
│   │   ├── multiModelService.js             (✨ NEW: Multi-model generation)
│   │   ├── inpaintingService.js             (Design editing)
│   │   └── designLibraryService.js          (Save/load designs)
│   │
│   ├── 📁 pages/                    ← Full-page views
│   │   ├── Home.jsx                         (Landing page)
│   │   ├── Visualize.jsx                    (Camera + AR preview)
│   │   ├── SmartMatch.jsx                   (Preference form)
│   │   ├── SwipeMatch.jsx                   (Tinder-style artist swiping)
│   │   └── Artists.jsx                      (Artist gallery)
│   │
│   ├── 📁 config/                   ← Configuration files
│   │   ├── promptTemplates.js               (Style-specific AI prompts)
│   │   └── theme.js                         (Design system colors/fonts)
│   │
│   ├── 📁 utils/                    ← Helper functions
│   │   └── matching.js                      (Artist matching algorithm)
│   │
│   ├── 📁 data/                     ← Static data files
│   │   ├── artists.json                     (50+ Austin artists)
│   │   └── designs.json                     (Tattoo design catalog)
│   │
│   ├── App.jsx                      ← Main app component (routing)
│   ├── main.jsx                     ← App entry point
│   └── index.css                    ← Global styles (Tailwind)
│
├── 📁 public/                       ← Static assets (images, fonts)
│
├── 📄 server.js                     ← Express backend (Railway)
├── 📄 package.json                  ← Dependencies & scripts
├── 📄 .env                          ← 🔒 Secret keys (DO NOT COMMIT)
├── 📄 .env.example                  ← Template for .env
├── 📄 vite.config.js                ← Build configuration
├── 📄 tailwind.config.js            ← Tailwind CSS config
│
├── 📁 DOCUMENTATION/                ← All guides (you are here!)
│   ├── COMPLETE_PROJECT_GUIDE.md            (This file)
│   ├── MULTI_MODEL_IMPLEMENTATION.md        (Multi-model guide)
│   ├── IMPLEMENTATION_SUMMARY.md            (Quick reference)
│   ├── RAILWAY_DEPLOYMENT.md                (Railway setup)
│   └── CLAUDE.md                            (Claude Code instructions)
│
└── 📁 node_modules/                 ← Installed packages (auto-generated)
```

---

## 🚀 How to Run Your Project

### Start Development Servers

Open **2 terminal windows**:

**Terminal 1 - Frontend:**
```bash
cd /Users/ciroccofam/my-project/tatt-tester
npm run dev
```
→ Opens at http://localhost:5173

**Terminal 2 - Backend:**
```bash
cd /Users/ciroccofam/my-project/tatt-tester
npm run server
```
→ Runs on http://localhost:3001

### View Your App

Open your browser: **http://localhost:5173**

---

## 🎨 What Each Feature Does

### 1. AI Tattoo Design Generation

**Where:** http://localhost:5173/generate

**What it does:**
- User enters idea (e.g., "dragon")
- AI generates 4 tattoo design images
- Choose from 5 different AI models

**Files involved:**
- `src/components/DesignGenerator.jsx` (UI)
- `src/services/replicateService.js` (API calls)
- `server.js` (Proxy to Replicate API)

**Cost:** $0.011-0.030 per generation (4 images)

---

### 2. ✨ AI Council Enhancement (NEW!)

**Where:** http://localhost:5173/generate (with feature flag enabled)

**What it does:**
- Takes simple idea: "gon and killua fighting"
- AI Council enhances it to detailed prompt
- Returns 3 levels: Simple, Detailed, Ultra
- Auto-detects anime characters (12+ in database)
- Prevents character merging in multi-character scenes

**Files involved:**
- `src/components/DesignGeneratorWithCouncil.jsx` (UI with Council)
- `src/components/PromptEnhancer.jsx` (Enhancement UI)
- `src/components/CouncilLoadingState.jsx` (Loading animation)
- `src/services/councilService.js` (Enhancement logic)

**How to enable:**

1. Edit `.env` file:
   ```bash
   VITE_USE_COUNCIL=true
   VITE_COUNCIL_DEMO_MODE=true
   ```

2. Restart dev server:
   ```bash
   # Press Ctrl+C in terminal, then:
   npm run dev
   ```

3. Visit http://localhost:5173/generate

**Cost:**
- Demo mode (current): $0.00
- Real LLM mode: $0.42 per enhancement

**Character Database Location:**
`src/services/councilService.js` (lines 87-109)

Current characters:
- Hunter x Hunter: Gon, Killua, Hisoka
- Dragon Ball: Goku, Vegeta, Shenron
- Naruto: Naruto, Sasuke
- One Piece: Luffy, Zoro
- Solo Leveling: Sung Jinwoo

---

### 3. ✨ Multi-Model Generation (NEW!)

**Where:** http://localhost:5173/generate (with multi-model flag enabled)

**What it does:**
- Generates from 3 AI models simultaneously:
  1. SDXL (photorealistic)
  2. Anime XL (anime style)
  3. DreamShaper XL (artistic)
- Shows 6 total images (2 per model)
- Vote with star ratings (1-5)
- Tracks which models perform best

**Files involved:**
- `src/services/multiModelService.js` (Parallel generation)
- `src/components/MultiModelResults.jsx` (Voting UI)

**How to enable:**

1. Edit `.env` file:
   ```bash
   VITE_MULTI_MODEL_ENABLED=true
   ```

2. Restart dev server

3. Toggle "Multi-Model" switch at top of generator

**Cost:** $0.073 per generation (6 images)

**Daily Limit:** 3 generations per user (free tier)

---

### 4. Design Library

**Where:** http://localhost:5173/library

**What it does:**
- Saves up to 50 designs in browser storage
- Search by keyword
- Filter by style
- Mark favorites
- Export as 300 DPI stencil

**Files involved:**
- `src/components/DesignLibrary.jsx` (UI)
- `src/services/designLibraryService.js` (Storage logic)

**Storage:** Browser localStorage (client-side)

---

### 5. AI Inpainting (Edit Designs)

**Where:** Inside DesignGenerator after generating

**What it does:**
- Brush over part of design you want to change
- Enter what to replace it with
- AI regenerates only that area

**Files involved:**
- `src/components/InpaintingEditor.jsx` (Brush tool)
- `src/services/inpaintingService.js` (API calls)

**Cost:** $0.03 per edit

---

### 6. 300 DPI Stencil Export

**Where:** Design Library → Click design → "Export Stencil"

**What it does:**
- Converts design to high-res black & white
- Professional tattoo artist ready
- 300 DPI for crisp printing

**Files involved:**
- `src/components/StencilExport.jsx` (UI)
- `src/services/stencilService.js` (Image processing)

---

### 7. Camera Visualization

**Where:** http://localhost:5173/visualize

**What it does:**
- Open phone camera
- Overlay tattoo design on body
- Take photo to visualize placement

**Files involved:**
- `src/pages/Visualize.jsx`

---

### 8. Artist Matching & Swiping

**Where:**
- http://localhost:5173/smart-match (preferences)
- http://localhost:5173/swipe (Tinder-style)

**What it does:**
- User enters preferences (styles, location, budget)
- Algorithm scores all artists
- Swipe right/left on top matches

**Files involved:**
- `src/pages/SmartMatch.jsx` (Preference form)
- `src/pages/SwipeMatch.jsx` (Swipe UI)
- `src/utils/matching.js` (Scoring algorithm)
- `src/data/artists.json` (50+ Austin artists)

**Algorithm Weights:**
- Style match: 40%
- Keyword match: 25%
- Distance: 15%
- Budget fit: 10%
- Random quality: 10%

---

## 🔑 Environment Variables (.env file)

**Location:** `/Users/ciroccofam/my-project/tatt-tester/.env`

```bash
# Replicate API (AI image generation)
VITE_REPLICATE_API_TOKEN=your_replicate_token_here
REPLICATE_API_TOKEN=your_replicate_token_here

# Google Vertex AI (Imagen 3 - optional)
GOOGLE_PROJECT_ID=tatt-481620
GOOGLE_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=/Users/ciroccofam/my-project/tatt-tester/google-credentials.json

# Backend proxy
VITE_PROXY_URL=http://localhost:3001/api

# Demo mode (set to false for real API)
VITE_DEMO_MODE=false

# ✨ AI Council feature
VITE_USE_COUNCIL=true              # Enable/disable Council UI
VITE_COUNCIL_DEMO_MODE=true        # true = free mock responses, false = real LLM ($0.42/use)

# ✨ Multi-model feature
VITE_MULTI_MODEL_ENABLED=false     # Enable/disable multi-model generation
```

**⚠️ NEVER commit .env to git!** (It contains secret API keys)

---

## 🌐 Deployment (Production)

### Frontend: Vercel

**URL:** https://tattester.vercel.app
**Deploys:** Automatically on `git push`

**Environment Variables (Set in Vercel Dashboard):**
```bash
VITE_REPLICATE_API_TOKEN=your_key
VITE_PROXY_URL=https://tatt-production.up.railway.app/api
VITE_USE_COUNCIL=true
VITE_COUNCIL_DEMO_MODE=true
VITE_MULTI_MODEL_ENABLED=false
```

**How to add env vars:**
1. Go to https://vercel.com/dashboard
2. Click your project
3. Settings → Environment Variables
4. Add each variable
5. Redeploy

---

### Backend: Railway

**URL:** https://tatt-production.up.railway.app
**Deploys:** Automatically on `git push`

**Environment Variables (Set in Railway Dashboard):**
```bash
REPLICATE_API_TOKEN=your_key
GOOGLE_PROJECT_ID=tatt-481620
GOOGLE_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=/app/google-credentials.json
GOOGLE_CREDENTIALS_BASE64=<base64_encoded_credentials>
```

**Health Check:**
https://tatt-production.up.railway.app/api/health

---

## 💰 Cost Breakdown

| Feature | Cost per Use | Notes |
|---------|-------------|--------|
| Single model generation | $0.011-0.030 | 4 images, varies by model |
| Imagen 3 generation | $0.020 | Google's premium model |
| Multi-model generation | $0.073 | 6 images from 3 models |
| AI Council (demo) | $0.00 | Mock responses |
| AI Council (real LLM) | $0.42 | GPT-4o-mini |
| AI Inpainting edit | $0.03 | Edit specific area |

**Monthly Estimate (100 users, 3 gens/day each):**
- Without multi-model: ~$90-270/month
- With multi-model (3/day limit): ~$657/month
- Council (demo mode): $0/month
- Council (real LLM, 5/month limit): ~$210/month

---

## 🛠️ Common Commands

### Development
```bash
npm run dev          # Start frontend (port 5173)
npm run server       # Start backend (port 3001)
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Check code quality
```

### Deployment
```bash
git add .
git commit -m "Your message"
git push origin main   # Auto-deploys to Vercel & Railway
```

### Troubleshooting
```bash
# Port 5173 in use
lsof -i :5173
kill -9 <PID>

# Port 3001 in use
lsof -i :3001
kill -9 <PID>

# Clear node modules and reinstall
rm -rf node_modules
npm install --legacy-peer-deps
```

---

## 🗺️ User Flow (How People Use Your App)

### Tattoo Discovery Flow

```
1. Homepage (/)
   ↓
2. Click "Generate Tattoo"
   ↓
3. Design Generator (/generate)
   - Enter idea: "dragon"
   - Click "✨ Enhance with AI Council" (optional)
   - Select enhanced prompt level
   - Choose AI model
   - Click "Generate Design"
   ↓
4. View 4 Generated Images
   - Rate/favorite designs
   - Edit with inpainting (optional)
   - Save to library
   - Export as 300 DPI stencil
   ↓
5. Visualize on Body (/visualize)
   - Upload design
   - Open camera
   - Overlay design
   - Take photo
   ↓
6. Find Artist (/smart-match)
   - Select preferred styles
   - Enter location & budget
   - View matched artists
   ↓
7. Swipe Artists (/swipe)
   - Swipe right on favorites
   - View profiles
   - Book consultation
```

---

## 📊 Feature Flags Quick Reference

| Flag | Default | What it does |
|------|---------|--------------|
| `VITE_USE_COUNCIL` | `false` | Shows Council enhancement button |
| `VITE_COUNCIL_DEMO_MODE` | `true` | Uses mock responses (free) |
| `VITE_MULTI_MODEL_ENABLED` | `false` | Shows multi-model toggle |
| `VITE_DEMO_MODE` | `false` | Uses mock images instead of API |

**To change:** Edit `.env` file and restart dev server

---

## 🐛 Known Issues & Fixes

### Issue: Council button doesn't appear

**Fix:**
1. Check `.env` has `VITE_USE_COUNCIL=true`
2. Restart dev server (Ctrl+C, then `npm run dev`)
3. Hard refresh browser (Cmd+Shift+R on Mac)

---

### Issue: "gon" becomes "Gon Freecsse" (extra 's')

**Fix:** Already fixed! Word boundaries (`\b`) in regex prevent partial matches.

**Location:** `src/services/councilService.js:116`

---

### Issue: Multi-model costs too much

**Fix:** Already implemented!
- 3/day limit per user
- Only 2 images per model (not 4)
- Budget-friendly models selected
- Total: $0.073 per generation

**Cost tracking:** `src/services/multiModelService.js:182-207`

---

### Issue: Generate button expands during loading

**Fix:** Already fixed! CouncilLoadingState renders outside button.

**Location:** `src/components/DesignGeneratorWithCouncil.jsx:506-520`

---

## 📚 Key Files to Know

### If you want to...

**Add more anime characters:**
→ `src/services/councilService.js` (lines 87-109)

**Change AI models:**
→ `src/services/replicateService.js` (lines 15-110)

**Adjust multi-model cost:**
→ `src/services/multiModelService.js` (lines 16-50)

**Modify artist matching algorithm:**
→ `src/utils/matching.js`

**Change app colors/design:**
→ `src/config/theme.js`

**Add new tattoo styles:**
→ `src/config/promptTemplates.js`

**Edit navigation:**
→ `src/components/Layout.jsx`

**Change routes:**
→ `src/App.jsx`

---

## 🎯 Next Steps

### For Testing
1. ✅ Add Vercel environment variables
2. ✅ Test Council on mobile
3. ✅ Try multi-model with 3/day limit
4. ✅ Gather user feedback

### For Launch
1. ⏳ Deploy real LLM Council backend
2. ⏳ Add payment system for premium tier
3. ⏳ Expand character database (50+ characters)
4. ⏳ Connect Neo4j database (Phase 1)
5. ⏳ Build React Native app (Phase 2)

---

## 🆘 Getting Help

### Documentation Files
- **This guide:** Complete overview
- `MULTI_MODEL_IMPLEMENTATION.md` - Deep dive on multi-model
- `IMPLEMENTATION_SUMMARY.md` - Quick reference
- `RAILWAY_DEPLOYMENT.md` - Backend deployment
- `CLAUDE.md` - Instructions for Claude Code

### Check Status
```bash
# Frontend running?
curl http://localhost:5173

# Backend running?
curl http://localhost:3001/api/health

# Production backend?
curl https://tatt-production.up.railway.app/api/health
```

### Debug Console
Open browser DevTools (F12) and check:
1. Console tab - JavaScript errors
2. Network tab - API calls
3. Application tab - localStorage data

---

## 🎉 What You Built

### Features Completed
- ✅ AI tattoo design generation (5 models)
- ✅ AI Council prompt enhancement
- ✅ Multi-model parallel generation
- ✅ Character database (12+ anime characters)
- ✅ Design library (save up to 50)
- ✅ AI inpainting editor
- ✅ 300 DPI stencil export
- ✅ Camera visualization
- ✅ Artist matching algorithm
- ✅ Tinder-style artist swiping
- ✅ Mobile-first responsive design
- ✅ Cost tracking & limits
- ✅ Voting & analytics system

### Technical Achievements
- ✅ React 19 + Vite 7
- ✅ Tailwind CSS design system
- ✅ Express backend on Railway
- ✅ Vercel frontend deployment
- ✅ Google Vertex AI integration
- ✅ Replicate API integration
- ✅ Client-side caching (60-80% savings)
- ✅ Feature flag architecture
- ✅ Mobile touch optimization
- ✅ Budget-conscious design

---

**Last Updated:** December 18, 2024
**Version:** 1.2.0 (Multi-Model + Council Enhancement)
**Project Status:** ✅ Production-ready for MVP

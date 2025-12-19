# TatT Tester - Project Context & Documentation

**Last Updated:** December 15, 2024  
**Project Status:** MVP Built, Neo4j Database Populated, Ready for Backend API  
**Founder:** Samson  

---

## Project Overview

**TatT Tester** is an AR and AI-powered tattoo visualization platform designed to help first-time tattoo seekers overcome commitment anxiety through AI design generation, AR preview, and smart artist matching.

### Core Value Proposition
- **For First-Timers:** Generate tattoo designs using AI, visualize them on your body with AR, then find the perfect artist to make it real
- **Differentiation:** Tinder-style swipe matching with graph database-powered recommendations (not just filters)
- **Business Model:** Artist booking commissions, premium features, artist subscriptions

### Target Market
- Primary: First-time tattoo seekers (ages 18-35)
- Secondary: Tattoo artists seeking new clients
- Geographic Focus: US metro areas (starting with Phoenix)

---

## Current Project Status

### ✅ COMPLETED (Phase 1 MVP)

#### Frontend Application (React + Vite)
- ✅ Full React application with routing
- ✅ Dark theme with TailwindCSS (ready for redesign to clean/minimal aesthetic)
- ✅ Responsive design for mobile and desktop
- ✅ Navigation system with Layout component

#### Core Features Built

**1. Photo Visualization System** (`/src/pages/Visualize.jsx`)
- Camera capture (getUserMedia API with back camera preference)
- File upload with validation (10MB limit)
- 36 SVG tattoo designs organized by category
- Drag-and-drop positioning (mouse + touch)
- Pinch-to-resize gestures
- Two-finger rotation
- Opacity slider for skin blending
- Size and rotation sliders
- Canvas-based image export (JPEG download)
- "Retake Photo" functionality

**2. Smart Matching Algorithm** (`/src/utils/matchingAlgorithm.js`)
- Multi-criteria scoring system (0-100 points):
  - Style Match: 40% (matching specialties)
  - Keyword/Tag Match: 25% (portfolio tag search)
  - Distance: 15% (Haversine formula for lat/lng)
  - Budget Fit: 10% (price <= user budget)
  - Artist Quality: 10% (rating + review count)
- Haversine distance calculation
- Portfolio keyword matching
- Match reason generation
- Score normalization with ±5% randomization

**3. Swipe Interface** (`/src/pages/SwipeMatch.jsx`)
- Preference form (multi-select styles, keywords, budget, distance)
- Full-screen card interface
- Match score display with reasons
- Left/right swipe buttons
- Artist info overlay
- Profile preview (tap ℹ️ icon)
- Completion screen with "View Matches"
- localStorage tracking integration

**4. Swipe Tracking System** (`/src/utils/swipeTracking.js`)
- localStorage-based persistence
- User ID generation
- Swipe history recording (userId, artistId, direction, score, timestamp)
- User preference storage
- Liked artists retrieval
- Swipe pattern analysis
- Neo4j export function (ready for backend migration)

**5. Artist Database** (`/src/data/artists.json`)
- 10 professional artists (Phoenix metro area)
- Full profiles with coordinates (lat/lng)
- Specialties array for matching
- Portfolio details with tags
- 3 anime specialists with Dragon Ball Z content:
  - Sarah Rodriguez (Anime Ink Phoenix)
  - Marcus Chen (Ink Dynasty)
  - Alex Thompson (Phoenix Anime Tattoo)
- Rating, pricing, availability data

**6. Artist Browsing** (`/src/pages/Artists.jsx`)
- Grid layout with portfolio images
- Search functionality (name, shop, real-time)
- Style filter dropdown (11 styles)
- Location filter dropdown (8 cities)
- Combined filters with results counter
- Empty state with "Clear Filters"
- Click-through to profiles

**7. Artist Profiles** (`/src/pages/ArtistProfile.jsx`)
- Header with photo, stats, badges
- Bio section with experience metrics
- Portfolio gallery with main image viewer
- Thumbnail navigation
- Request Quote modal (form with name, email, description, placement, size)
- Instagram contact button
- Back navigation

**8. Design Library** (`/src/data/designs.json`)
- 36 SVG designs across 13 categories:
  - Minimalist (moon, sun, mountain, wave, arrow)
  - Geometric (triangle, hexagon, sacred geometry)
  - Floral (lotus, leaf)
  - Animal (wolf, bird, cat)
  - Traditional (anchor, skull)
  - Japanese (wave, koi)
  - Tribal (band, maori)
  - Celestial (stars, constellation)
  - Nature (feather, tree)
  - Symbolic (eye, hamsa, infinity, yin-yang)
  - Music (note)
  - Abstract (spiral, mandala)
- Category filtering
- Design metadata with tags

#### Neo4j Graph Database (PRODUCTION-READY)
- ✅ Neo4j database populated with real data
- ✅ Import script created (`/scripts/import-to-neo4j.js`)
- ✅ Verification script created (`/scripts/verify-neo4j.js`)

**Database Schema:**

**Nodes:**
- `Artist` (10 nodes)
  - Properties: id, name, shopName, location (point), city, bio, rating, reviewCount, startingPrice, yearsExperience, instagramHandle, availabilityStatus, portfolioImages
- `Style` (13 nodes)
  - Properties: name
  - Values: Anime, Traditional, Japanese, Geometric, Realism, Neo-Traditional, Blackwork, Minimalist, Watercolor, Color, Fine Line, Tribal, Dotwork
- `Portfolio` (30-40 nodes)
  - Properties: imageUrl, description, bodyPart, tags (array), styles (array)
- `Person` (1 test user)
  - Properties: id, name, location (point)

**Relationships:**
- `Artist-[:SPECIALIZES_IN]->Style` (~20-30 relationships)
- `Artist-[:CREATED]->Portfolio` (~30-40 relationships)
- `Portfolio-[:BELONGS_TO]->Style` (~40-60 relationships)
- `Person-[:LIKES]->Artist` (ready for swipe data)
- `Person-[:PASSED]->Artist` (ready for swipe data)
- `Person-[:PREFERS]->Style` (ready for user preferences)

**Total:** 54+ nodes, 90-130+ relationships

---

## Technical Architecture

### Frontend Stack
```
React 18.3
Vite 5.4
React Router 6.x
TailwindCSS 3.4
JavaScript (no TypeScript)
```

### Backend Stack (Ready to Build)
```
Node.js
Express.js
neo4j-driver
dotenv
```

### Database
```
Neo4j 5.x (local or Aura)
Bolt protocol (port 7687)
Browser interface (port 7474)
```

### Development Tools
```
npm/node
Claude Code (terminal-based development)
Git version control
```

---

## File Structure

```
/tatt-tester
├── /public
│   ├── /designs (36 SVG tattoo designs)
│   └── /tattoos (6 original SVG designs)
├── /scripts
│   ├── import-to-neo4j.js (imports artists.json to Neo4j)
│   └── verify-neo4j.js (verifies Neo4j data)
├── /src
│   ├── /components
│   │   └── Layout.jsx (navigation wrapper)
│   ├── /data
│   │   ├── artists.json (10 artists with full data)
│   │   └── designs.json (36 designs with metadata)
│   ├── /pages
│   │   ├── Home.jsx (landing page)
│   │   ├── Visualize.jsx (photo + tattoo overlay)
│   │   ├── Artists.jsx (browsing with filters)
│   │   ├── ArtistProfile.jsx (individual artist page)
│   │   └── SwipeMatch.jsx (Tinder-style matching)
│   ├── /utils
│   │   ├── matchingAlgorithm.js (scoring system)
│   │   └── swipeTracking.js (localStorage persistence)
│   ├── App.jsx (routing)
│   ├── index.css (Tailwind + global styles)
│   └── main.jsx (React entry point)
├── .env (Neo4j credentials)
├── .gitignore
├── package.json
├── tailwind.config.js
├── vite.config.js
└── README.md
```

---

## Key Features Deep Dive

### 1. Photo Visualization System

**Technology:**
- getUserMedia API for camera access
- File upload with FileReader API
- Canvas API for image compositing
- Touch events for mobile gestures
- CSS transforms for positioning

**User Flow:**
1. User opens /visualize
2. Takes photo with back camera OR uploads image
3. Selects tattoo design from 36 options
4. Filters by category (13 categories)
5. Drags tattoo to desired position on body
6. Resizes with pinch gesture or slider
7. Rotates with two fingers or slider
8. Adjusts opacity to blend with skin tone
9. Downloads final composite image

**Technical Challenges Solved:**
- Multi-touch gesture detection
- Canvas layer compositing
- Camera stream cleanup
- Mobile-first responsive design

---

### 2. Smart Matching Algorithm

**Scoring Formula:**
```javascript
totalScore = 
  (styleMatch * 0.40) +      // 40% - Do they do your style?
  (keywordMatch * 0.25) +    // 25% - Portfolio has your keywords?
  (distanceScore * 0.15) +   // 15% - How far away?
  (budgetScore * 0.10) +     // 10% - Can you afford them?
  (qualityScore * 0.10)      // 10% - Are they highly rated?
```

**Example Match Calculation:**

User wants: Anime style, "dragon ball z, goku" keywords, $500 budget, 20 miles

Sarah Rodriguez scores:
- Style Match: 100% (has Anime specialty)
- Keyword Match: 100% (portfolio has "goku", "dragon ball z", "vegeta" tags)
- Distance: 85% (12 miles away)
- Budget: 100% ($300 starting price)
- Quality: 90% (4.9 rating, 127 reviews)
- **Total: 96% match**

Match Reasons Generated:
- "Perfect style match - specializes in Anime"
- "Portfolio has 3 pieces matching 'dragon ball z'"
- "Only 12 miles away in Phoenix"
- "Starting price ($300) fits your budget"
- "Highly rated (4.9★ from 127 reviews)"

---

### 3. Swipe Tracking & Analytics

**localStorage Schema:**
```javascript
// tatt_swipe_history
[
  {
    userId: "user_abc123",
    artistId: 1,
    artistName: "Sarah Rodriguez",
    direction: "right", // or "left"
    matchScore: 96,
    timestamp: "2024-12-11T20:30:00Z",
    artistStyles: ["Anime", "Color"]
  }
]

// tatt_user_preferences
{
  userId: "user_abc123",
  styles: ["Anime", "Traditional"],
  keywords: "dragon ball z, goku",
  budget: 500,
  distance: 20,
  location: { lat: 33.4484, lng: -112.0740 }
}

// tatt_user_id
"user_abc123"
```

**Analytics Capabilities:**
- What styles users actually like vs. stated preferences
- Keyword match effectiveness
- Budget vs. actual likes
- Distance tolerance patterns
- Time-of-day swipe behavior

**Neo4j Migration Ready:**
- `exportDataForNeo4j()` function formats all data for import
- Preserves full swipe history
- Maps to graph relationships

---

### 4. Neo4j Graph Database

**Why Neo4j?**
- Complex relationship queries (collaborative filtering)
- Similarity algorithms (find users like you)
- Path-based recommendations (friends-of-friends)
- Real-time graph traversal
- Scalable to millions of users/swipes

**Production Queries (Ready to Build):**

**Collaborative Filtering:**
```cypher
// Find artists liked by users similar to you
MATCH (you:Person {id: $userId})-[:LIKES]->(artist:Artist)
<-[:LIKES]-(similar:Person)-[:LIKES]->(recommendation:Artist)
WHERE NOT (you)-[:LIKES]->(recommendation)
  AND NOT (you)-[:PASSED]->(recommendation)
WITH recommendation, count(similar) as commonLikes,
     collect(similar.name) as similarUsers
RETURN recommendation, commonLikes, similarUsers
ORDER BY commonLikes DESC
LIMIT 10
```

**Style-Based Discovery:**
```cypher
// Find artists who specialize in styles you prefer
MATCH (you:Person {id: $userId})-[:PREFERS]->(style:Style)
<-[:SPECIALIZES_IN]-(artist:Artist)
WHERE NOT (you)-[:LIKES|PASSED]->(artist)
  AND point.distance(you.location, artist.location) < $maxDistance
RETURN artist, collect(style.name) as matchingStyles,
       point.distance(you.location, artist.location) / 1609.34 as miles
ORDER BY size(matchingStyles) DESC, miles ASC
LIMIT 20
```

**Tattoo History Matching:**
```cypher
// Find artists who created designs similar to your past tattoos
MATCH (you:Person)-[:HAS_TATTOO]->(tattoo:UserTattoo)-[:BASED_ON]->(design:Design)
-[:SIMILAR_TO]->(similar:Design)<-[:CREATED]-(artist:Artist)
WHERE NOT (you)-[:LIKES|PASSED]->(artist)
RETURN artist, collect(similar) as similarDesigns
ORDER BY size(similarDesigns) DESC
```

---

## Data Collection Strategy

### Current (localStorage)
- Swipe history
- User preferences
- Match scores
- Timestamps

### Phase 2 (Neo4j)
- User behavior patterns
- Artist popularity trends
- Style co-occurrence
- Geographic clustering
- Time-based patterns
- Budget distributions

### Phase 3 (Advanced Analytics)
- Tattoo design similarity (image embeddings)
- Artist style evolution tracking
- Seasonal trend analysis
- User journey mapping
- Churn prediction

---

## Business Strategy

### MVP Validation Goals
- 100+ users within 2 weeks
- 1000+ swipes recorded
- 50+ artist profile views
- 10+ quote requests
- Proof: Users want AI-generated designs + artist matching

### Funding Strategy
- Bootstrap Phase 1 for <$500 (DONE)
- Collect swipe data for 2-3 months
- Build pitch deck with usage metrics
- Target: $750K seed round (Q1 2025)

### Revenue Model (Post-Seed)
1. **Artist Commissions** (15-20% of booking)
2. **Premium User Features**
   - Unlimited design generations
   - Advanced filters
   - Priority artist responses
   - $9.99/month or $79/year
3. **Artist Subscriptions**
   - Enhanced profiles
   - Featured placement
   - Analytics dashboard
   - $49-199/month (tiered)

---

## Competitive Advantages

### vs. Inkbox (Try-Before-You-Buy)
- ✅ **Better:** Instant AR preview (no 2-week wait for temp tattoo)
- ✅ **Better:** AI design generation (not just templates)
- ✅ **Better:** Artist matching (Inkbox doesn't connect to artists)

### vs. Tattoodo (Marketplace)
- ✅ **Better:** Swipe matching (not just search/browse)
- ✅ **Better:** First-timer focus (Tattoodo is for everyone)
- ✅ **Better:** Design visualization (Tattoodo just connects)

### vs. Pinterest + Google Search
- ✅ **Better:** All-in-one platform (no multi-tab hunting)
- ✅ **Better:** Personalized recommendations
- ✅ **Better:** Direct artist booking

### Unique IP
- **Graph-based matching algorithm** for tattoo artists (novel application)
- **Swipe interface** for artist discovery (unique in tattoo industry)
- **AI-first design workflow** (generate → visualize → book)

---

## Known Issues & Technical Debt

### UI/UX
- ❌ Current design is too "startup-y" (dark theme, gradients, emojis)
- 🔄 **Planned:** Redesign to clean/minimal gallery aesthetic (like cocreate.ink)
- ❌ Mobile swipe gestures need refinement
- ❌ Loading states not implemented

### Backend
- ❌ No backend API yet (localStorage only)
- ❌ No authentication system
- ❌ No real artist accounts
- ❌ No payment processing

### Data
- ⚠️ Only 10 artists (need 50-100 for launch)
- ⚠️ Artist data is mock (need real partnerships)
- ⚠️ Portfolio images from Unsplash (need real tattoo photos)

### Features Missing
- ❌ AI design generation (Phase 2)
- ❌ Real-time AR (using static photo overlay for MVP)
- ❌ Artist chat/messaging
- ❌ Booking calendar integration
- ❌ Payment processing
- ❌ Review system
- ❌ Social sharing

---

## Immediate Next Steps (Priority Order)

### Week 1: Backend API
1. **Build Express.js Backend** (`/server/index.js`)
   - Connect to Neo4j
   - Create REST API endpoints:
     - `POST /api/recommendations` (graph-based matching)
     - `POST /api/swipe` (record to Neo4j)
     - `GET /api/artists/:id`
     - `GET /api/styles`
2. **Migrate from localStorage to Backend**
   - Update React app to call API
   - Remove localStorage dependencies
   - Add loading states
3. **Test Full Flow**
   - Start Neo4j → Start backend → Start React
   - Swipe → Verify saved in database
   - Check graph updates in Neo4j Browser

### Week 2: UI Redesign
1. **Implement Clean/Minimal Aesthetic**
   - Remove dark theme, gradients, emojis
   - White backgrounds, black text
   - Large professional typography
   - Image-first layout
   - Subtle interactions
   - Reference: cocreate.ink/galleries/artists
2. **Mobile Optimization**
   - Better touch gestures
   - Simplified navigation
   - Faster load times

### Week 3: Data Collection & Beta Testing
1. **Deploy to Production**
   - Frontend: Vercel
   - Backend: Railway/Heroku
   - Database: Neo4j Aura (cloud)
2. **Recruit Beta Users**
   - Samson's brother's Instagram followers
   - Local Phoenix tattoo enthusiasts
   - Reddit r/tattoos community
3. **Track Metrics**
   - User signups
   - Swipes per user
   - Match view-through rate
   - Quote request rate

### Month 2: Artist Partnerships
1. **Contact 50 Phoenix Artists**
   - Offer free profiles
   - Collect real portfolio photos
   - Get booking integration requirements
2. **Build Artist Dashboard**
   - View profile analytics
   - Manage portfolio
   - Respond to quote requests
   - See incoming matches

---

## Development Commands

### Frontend
```bash
# Install dependencies
npm install

# Start dev server
npm run dev
# → http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview
```

### Neo4j
```bash
# Import artist data
npm run neo4j:import

# Verify data
npm run neo4j:verify

# Start Neo4j Desktop
# → Database at bolt://localhost:7687
# → Browser at http://localhost:7474
```

### Backend (When Built)
```bash
# Start API server
npm run server
# → http://localhost:3000

# Or with nodemon
npm run server:dev
```

---

## Environment Variables

### `.env` File
```bash
# Neo4j Connection
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password_here

# Backend (when built)
PORT=3000
NODE_ENV=development

# Frontend (when needed)
VITE_API_URL=http://localhost:3000
```

---

## Testing Strategies

### Manual Testing Checklist
- [ ] Photo capture works on mobile
- [ ] File upload accepts images
- [ ] Tattoo drag/resize/rotate smooth
- [ ] Download creates valid JPEG
- [ ] Swipe left/right records correctly
- [ ] Match scores make sense
- [ ] Artist filters work
- [ ] Profile pages load
- [ ] Quote form submits

### Neo4j Verification Queries
```cypher
// Count all nodes
MATCH (n) RETURN labels(n)[0] AS type, count(n) AS count

// Count relationships
MATCH ()-[r]->() RETURN type(r) AS rel, count(r) AS count

// Test distance calculation
MATCH (a:Artist)
WITH a, point.distance(
  a.location, 
  point({latitude: 33.4484, longitude: -112.0740})
) / 1609.34 AS miles
RETURN a.name, a.city, round(miles, 1) AS milesAway
ORDER BY miles

// Test portfolio keyword search
MATCH (p:Portfolio)
WHERE any(tag IN p.tags WHERE toLower(tag) CONTAINS 'goku')
RETURN p.description, p.tags
```

---

## Key Learnings & Decisions

### Why Swipe Interface?
- **Original Plan:** Traditional search/filter like Yelp
- **Pivot:** Tinder-style swipe after user feedback
- **Reasoning:** 
  - More engaging/addictive
  - Solves paradox of choice
  - Creates valuable engagement data
  - Two-way matching potential (artists can swipe on users)
  - Massive differentiation vs. competitors

### Why Neo4j vs. PostgreSQL?
- **Need:** Complex relationship queries (collaborative filtering)
- **Problem:** SQL joins get expensive at scale
- **Solution:** Graph database optimized for relationships
- **Benefit:** Real-time recommendations, similarity algorithms
- **Cost:** Free tier (Neo4j Aura) for MVP, scalable to paid later

### Why Photo Overlay vs. Real-Time AR?
- **Ideal:** Real-time body tracking like Snapchat filters
- **Reality:** Requires computer vision, body pose estimation, complex
- **MVP Decision:** Static photo overlay (good enough for validation)
- **Future:** Add real-time AR in Phase 2 if validated

### Why localStorage First?
- **Speed:** No backend setup, faster MVP
- **Flexibility:** Easy to iterate on algorithm
- **Migration Path:** Built with Neo4j export in mind
- **Validation:** Prove concept before infrastructure investment

---

## Resources & References

### Design Inspiration
- **CoCreate.ink** (clean gallery aesthetic)
- **Artsy.net** (art marketplace UI)
- **Hinge** (dating app swipe with profiles)
- **Pinterest** (discovery feed)

### Technical Documentation
- [Neo4j JavaScript Driver](https://neo4j.com/docs/javascript-manual/current/)
- [React Router](https://reactrouter.com/)
- [TailwindCSS](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)

### Free Image Resources
- **Flaticon** (SVG tattoo designs)
- **Unsplash** (portfolio photography)
- **Freepik** (design elements)

### Tattoo Industry Research
- **Statista:** $3.2B tattoo industry (US)
- **IBISWorld:** 13,000+ tattoo parlors in US
- **Survey:** 46% of Americans aged 18-34 have tattoos
- **Trend:** First-time anxiety is #1 barrier

---

## Contact & Team

### Founder
**Samson**
- Founder of TatT Tester
- Book author ("Life is Fucking Hard" series)
- Book editor by trade
- Technical founder (self-taught coding)

### Network
- **Brother:** Tattoo influencer with social media following
- **Target for Beta Launch:** Brother's Instagram followers

### Support
- **Claude Code:** AI-powered terminal development assistant
- **Claude.ai:** Product strategy and business planning

---

## Version History

- **v0.1.0** (Dec 11, 2024) - Initial MVP built
  - React app with routing
  - Photo visualization
  - 36 tattoo designs
  - 10 artist profiles
  - Swipe matching interface
  - localStorage tracking
  
- **v0.2.0** (Dec 11, 2024) - Neo4j Integration
  - Database schema designed
  - Import scripts created
  - 10 artists imported with full data
  - Graph relationships established
  - Verification scripts built

- **v0.3.0** (Planned) - Backend API
  - Express.js server
  - Neo4j connection
  - REST API endpoints
  - React app migration from localStorage

- **v0.4.0** (Planned) - UI Redesign
  - Clean/minimal aesthetic
  - Gallery-style layouts
  - Professional typography
  - Mobile optimization

- **v1.0.0** (Planned) - Public Beta
  - Deployed to production
  - 50+ artists
  - Authentication
  - Artist dashboards
  - Quote system

---

## License & IP

- **Code:** Private (not open source)
- **Business Model:** Proprietary
- **Patents:** Considering patent for graph-based artist matching algorithm
- **Trademarks:** "TatT Tester" name and logo (to be registered)

---

## Notes for Future Development

### Phase 2 Features (Post-Validation)
1. **AI Design Generation**
   - Stable Diffusion API
   - Text-to-tattoo model
   - Style transfer
   - Custom training on tattoo dataset

2. **Real-Time AR**
   - Body tracking (MediaPipe)
   - 3D tattoo placement
   - Real-time rendering
   - Multi-angle preview

3. **Social Features**
   - Share designs
   - User profiles
   - Follow artists
   - Review/rating system
   - Community feed

4. **Artist Tools**
   - Custom design uploads
   - Booking calendar
   - Client communication
   - Portfolio management
   - Analytics dashboard

5. **Payment Integration**
   - Stripe Connect
   - Booking deposits
   - Commission processing
   - Refund handling

### Tech Stack Evolution
- **Frontend:** Consider Next.js for SSR/SEO
- **Backend:** Consider NestJS for TypeScript + structure
- **Database:** Add PostgreSQL for transactional data (bookings, payments)
- **Infrastructure:** Kubernetes for scaling
- **Monitoring:** Sentry, DataDog
- **Analytics:** Mixpanel, Segment

---

## Quick Start for New Developers

1. **Clone repo:** `git clone [repo-url]`
2. **Install dependencies:** `npm install`
3. **Set up Neo4j:** Download Neo4j Desktop, create database
4. **Import data:** `npm run neo4j:import`
5. **Start dev server:** `npm run dev`
6. **Visit:** `http://localhost:5173`
7. **Test swipe flow:**
   - Go to /swipe
   - Select "Anime" style
   - Enter "dragon ball z" keyword
   - Start swiping
   - See Sarah Rodriguez with high match score

---

## Questions to Answer

### Product
- Should we do two-way matching (artists swipe on users too)?
- How to handle artist availability/booking conflicts?
- What's the minimum viable artist marketplace size?

### Technical  
- Real-time AR worth the complexity for MVP?
- Self-host Neo4j or use Aura cloud?
- TypeScript migration needed?

### Business
- Pricing: Commission % or subscription?
- Artist acquisition strategy?
- Geographic expansion plan?

### Legal
- User-generated content moderation?
- Artist contract requirements?
- GDPR/privacy compliance?

---

**END OF CONTEXT DOCUMENT**

*This document is a living reference. Update as the project evolves.*

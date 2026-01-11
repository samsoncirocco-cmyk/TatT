This README is designed to serve as a **high-impact investor-ready document** that aligns with the high-performance standards required for a **2026 Y Combinator pitch**. It transitions the project from a "coding hobby" feel to a "venture-scale technical platform" narrative.

---

# TatT (Integration Resilience Layer) - The Semantic Discovery Layer for Tattoos

**TatT** is an agent-native, high-fidelity tattoo visualization and artist matching platform. We automate the $20B "Idea-to-Ink" lifecycle—solving commitment anxiety for seekers and administrative friction for professional artists.

---

## 🚀 The Vision: From Idea to Permanent Art

The tattoo industry is currently broken by a "Vision Gap." TatT fills this gap through:

1. **The Forge:** A character-aware, multi-layer generative AI editor.
2. **The Visualize Bridge:** A  cm depth-accurate AR anatomy wrapper.
3. **The MatchEngine:** A hybrid Neo4j + Vector discovery layer that maps the "vibe" of a design to an artist’s soul.

---

## ✨ Features

### 🎨 The Forge (Generative Intelligence)

* **Proprietary AI Council:** A multi-agent LLM layer that enhances raw prompts into tattoo-specific instructions, ensuring character spatial separation and "tattoo-able" line weights.
* **Layered Design Editing:** Decomposes AI outputs into editable RGBA layers (Subject, Background, FX) for granular control.
* **Stencil-Ready Exports:** One-click conversion to **300 DPI binary line-art**, optimized for professional thermal stencil printers.

### 👓 Visualize (AR Reality)

* **Depth-Aware Wrapping:** Uses the **WebXR Depth API** to realistically wrap designs around cylindrical limbs (arms/legs) instead of flat "sticker" overlays.
* **Skin-Tone Adaptation:** Custom WebGPU shaders that utilize "Multiply" blending to pick up natural skin texture and real-world ambient lighting.

### 🔗 Samson Match (Discovery Moat)

* **Vector-Graph Fusion:** Hybrid search combining **Supabase (pgvector)** for visual similarity and **Neo4j** for relationship mapping (mentor/apprentice genealogy).
* **Geospatial Search:** Neo4j `point.distance()` logic to find the best artists within a user's reachable radius.
* **Real-Time "Match Pulse":** Live-updating match counts that sync with your design choices in the Forge.

---

## 🛠️ Technical Stack (2026 Standard)

| Layer | Technology |
| --- | --- |
| **Frontend** | Next.js 16 (App Router), Tailwind CSS 4.0, Framer Motion |
| **Backend** | Vercel Edge Functions, Node.js (CommonJS/ESM Bridge) |
| **Database** | **Supabase (PostgreSQL/pgvector)** - Primary Storage |
| **Graph** | **Neo4j** - Relationship & Geospatial Matching |
| **AR Framework** | **MindAR.js** + WebXR Device API + Three.js |
| **AI Models** | SDXL, Imagen 3, DreamShaper Turbo (via Replicate) |

---

## 📦 Getting Started

### Prerequisites

* Node.js 20+ (LTS)
* Docker (for local Neo4j/Supabase testing)
* [Replicate API Token](https://replicate.com/account/api-tokens)

### Quick Start

1. **Clone & Install**
```bash
git clone https://github.com/your-org/tat-t.git
cd tat-t
npm install

```


2. **Environment Setup**
Copy `.env.example` to `.env` and populate your keys. **Critical:** Ensure `SUPABASE_SERVICE_KEY` is not exposed.
3. **Launch the Forge**
```bash
# Launches both Vite frontend and Express proxy
npm run dev:all

```



---

## 📐 Architecture

TatT uses a **"Sidecar Proxy"** architecture to prevent API schema drift and ensure zero-knowledge privacy for client payloads.

* **Sidecar Proxy (`/src/sidecar.js`):** Intercepts Replicate/Supabase payloads to validate schema integrity.
* **Sentinel (`/src/sentinel.js`):** Strips PII and generates SHA-256 fingerprints for immutable audit logs.
* **MCP Servers (`/mcp/`):** Model Context Protocol servers allowing AI agents to navigate the artist registry autonomously.

---

## 📈 Roadmap: YC Scaling Strategy

### Phase 1: The Gatekeeper (Current)

* [x] Multi-model Ensemble (SDXL/Imagen)
* [x] Stencil Intelligence (300 DPI)
* [ ] **In-Progress:** Hybrid Vector-Graph MatchEngine

### Phase 2: The Skin Twin (Q3 2026)

* [ ] Dermatological AI (Predictive Aging simulation)
* [ ] Health Department Verification integration
* [ ] Click-to-Ship Temporary "Test Drive" Kits

### Phase 3: The Global Ink Ledger (2027)

* [ ] Artist SaaS "Operating System" (Stripe Connect payouts)
* [ ] Viral "Tattoo Genealogy" Graph
* [ ] Affiliate Aftercare Commerce

---

## 🛡️ Security & Privacy

* **Zero-Knowledge Privacy:** All client payloads are sanitized via Sentinel before reaching the storage layer.
* **Deterministic Patching:** We use a safe-mapper pattern for AI-driven schema healing—no `eval()` or dynamic code execution.

---

---

**Would you like me to generate the specific `CONTRIBUTING.md` or `SUPABASE_SETUP.md` files mentioned in the prerequisites?**

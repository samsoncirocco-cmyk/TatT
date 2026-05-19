# 5,000 Artist Acquisition Dashboard

**Goal:** Provide visibility into the active campaign to acquire 5,000 verified US tattoo artist profiles.

## 1. Active Systems Status

### 🕷️ Parallel Shop Crawler (US Only)

* **Status:** 🟡 Paused (Fixing Config)
* **Strategy:** Processing 200+ US Tier 1 & Tier 2 cities.
* **Current Metrics:**
  * **Raw Artists:** ~1,156
  * **Verified:** 560
  * **Target:** 5,000
  * **Progress:** 11.2%

### 🔍 Direct Artist Search (Google Dorks)

* **Status:** 🟢 Active
* **Strategy:** `site:instagram.com "tattoo artist" [City]` via BrowserAct.
* **Target:** Filling gaps in cities where shop crawling output is low.

### 🧪 Data Enrichment (Hybrid)

* **Status:** 🟡 Pending
* **Strategy:** enriching shop websites with social links using "Social Links Scraper".

## 2. Implementation Tasks (Dashboard)

* [x] **Project Setup**
  * [x] Configure Google Places API
  * [x] Set up BrowserAct Integration
  * [x] Initialize Neo4j Database
* [x] **Crawler V1 (Production)**
  * [x] Basic shop discovery
  * [x] Website scraping
* [x] **Crawler V2 (Parallel)**
  * [x] Implement concurrency (10 cities/batch)
  * [x] Add Resume/Persistence logic
  * [x] Expand City List to 200+ (US Only)
* [ ] **Campaign Execution (Current Phase)**
  * [ ] **Fix:** Remove International Cities from config
  * [ ] **Recovery:** Filter non-US data from previous run
  * [ ] **Execution:** Resume Parallel Crawler
  * [ ] **Monitor:** Watch for 5,000 goal
* [ ] **Quality Assurance**
  * [ ] Validate final dataset (Style consistency)
  * [ ] Normalize Instagram handles
  * [ ] Final Import to Production DB

## 3. Storage & Schema

* **Vector DB:** Supabase `portfolio_embeddings` (1408 dims)
* **Graph DB:** Neo4j (Artist nodes)
* **File Sys:** `src/scripts/data_acquisition/output/`

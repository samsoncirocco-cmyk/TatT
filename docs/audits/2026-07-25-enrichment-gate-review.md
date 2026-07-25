# Enrichment pilot gate review — go/no-go

> **Read the addendum in §9 first.** The body below is the original 2026-07-25
> review, preserved as written. §9 records what an independent re-verification
> confirmed and — more importantly — what it found **wrong**, including two
> baseline numbers and one accuracy claim in the body of this document.

**Date:** 2026-07-25
**Scope:** `~/tatt-scraper/execution/enrich_artists.py`, pilot shards `shards-deterministic/shard-{000,001,002}.json`
**Method:** read-only. No pipeline runs, no network calls, no writes to `~/tatt-scraper`.

---

## TL;DR

**NO-GO on launching the website pipeline full run as it stands.** Two independent
blockers: **~41% of the style tags it emits are wrong**, and **nothing in either repo
reads its output** — so a perfect run would still change nothing a user sees.

**But there is a better lane already paid for and sitting on disk.** 10,427 Apify
Instagram profiles were scraped on 2026-07-20. Running the *identical* style regex over
their bios yields **1,467 artists with styles at ~98% tag precision** — more artists than
the entire website run would produce, at ~59% precision, for $0 and a few minutes of local
CPU. Recommend redirecting to that lane and building the missing graph-write path first.

---

## 1. What the pilot actually produced

TODO.md's numbers are stale. Corrected against the log and the shards themselves:

| | TODO.md claims | Actual |
|---|---|---|
| Artists enriched | ~212 | **562** |
| Artists with style tags | (not stated) | **143** |
| Shards | 3 | 3 ✓ |

Pilot ran batches 0–2: **54 domains, 1,087 input artists, 56s wall clock**.

**Output composition (562 records):**

| Field | Count | % of enriched |
|---|---|---|
| `bio` | 477 | 85% |
| `portfolioImages` | 448 | 80% |
| `styles` | **143** | **25%** |

Styles are the whole point of the sweep, and only **13.2% of input artists (143/1,087)**
came out with one. 419 of the 562 enriched records have zero styles.

**Scrubbed:** 53 artists had styles stripped by the smear validator (27 + 20 + 6); 0 images
scrubbed.

**Style tags emitted:** 363 across 143 artists (mean 2.5). Distribution is a warning sign
on its own — **15 artists carry 5+ styles**, one carries 10. An artist tagged with 10 of
the 15 canonical styles has, for matching purposes, no style at all.

Top tags: Black & Grey 64, Fine Line 49, Illustrative 47, Traditional 43, Realism 43,
Anime 27, Blackwork 25, Script 21, Neo-Traditional 20.

**The pilot is not a representative sample.** Batches are sorted descending by artist
count. The pilot ran the three fattest (mean 362 artists/batch); the remaining 106 batches
average **63.5**. The tail is 18-artist batches of small shops with thin sites — precisely
the conditions that produce the shop-level-copy errors catalogued below. Expect yield and
accuracy on the remainder to be *worse* than the pilot, not equal to it.

---

## 2. Accuracy assessment — the number nobody had

Hand-inspected **30 styled records / 61 style tags**, judging each tag against the bio and
evidence URL stored alongside it.

| Verdict | Records |
|---|---|
| All tags correct | 12 (40%) |
| Some tags correct, some spurious | 5 (17%) |
| Wrong — wrong entity, or no support at all | 10 (33%) |
| Not verifiable from stored evidence | 3 (10%) |

**Tag-level precision: 36 / 61 = 59%. About 2 in 5 emitted style tags are wrong.**

Two automated corroborations of the hand count:

- **109 of 363 tags (30%)** have no supporting keyword anywhere in the bio stored with the
  record — the tag cannot be justified from the evidence the pipeline itself kept.
- **27 of 143 styled records (19%)** contain *another artist's first name* inside their own
  bio — direct evidence that the per-artist section boundary leaked.

### Failure modes, worst first

1. **Multi-artist section bleed.** The dominant error. `SECTION_TOKEN_CAP = 80` runs the
   section past the next artist when the next anchor isn't detected — which happens
   constantly on roster pages that use first names only ("NICK", "YUNA", "TIM", "KATIE").
   - `artist_painkillersartstudio` → 5 styles, bio contains both Nick's and Yuna's blurbs.
   - `artist_hellosabibi` → 5 styles harvested entirely from Tim's and Katie's text.
   - `artist_planetmarz_222` → tagged Anime / Black & Grey / Fine Line, all three lifted
     from **Pedro Sanchez's** "STRENGTHS" block on the next line.

2. **Non-artist entities treated as artists.** `artist_tattooapprenticeship` (a location
   index page) → Traditional. `artist_buenavidala` (a studio address footer) → Traditional,
   Script. `artist_furrytatweekend` → Anime, from a bio describing the shop's **Director of
   Operations** and her hobbies. The `NON_ARTIST_HINTS` filter catches piercers and
   receptionists but not schools, studios, or ops staff.

3. **Incidental language read as a style claim.** "watching anime" → Anime. This is the
   category that makes the tags actively misleading rather than merely absent.

4. **Shop-level marketing copy assigned per-artist.** `artist_robert_pho` picks up Fine Line
   and Script from studio boilerplate. `artist_alexszunder` gets Fine Line from nav button
   text ("BOOK ALEX / VIEW GALLERY / …").

5. **Page chrome leakage.** `artist_goldy_z` → **Script**, matched against a Wix/Sentry
   JavaScript loader string: *"…preloading pre-scripts sentryOnLoad Setup Script Sentry
   Loader Script…"*. `STRIP_TAGS` decomposes `<script>` **elements**, but visible text that
   merely contains the word "Script" survives, and the Script pattern is loose enough to
   fire on it.

6. **The smear scrub is too narrow to fire.** `validate_domain()` only strips when **>2**
   artists share a byte-identical style set. Real smears produce *overlapping but not
   identical* sets — the six8collective records above have 5 styles each with 3 in common,
   so the scrub passed them through untouched. It removed 53 records and missed the actual
   failure mode.

---

## 3. Vocabulary alignment — **PASS, and this part is genuinely good**

Verified by set comparison, not by eye:

- `STYLE_PATTERNS` keys in `enrich_artists.py`: **15 styles**
- `CANONICAL_STYLES` in `/Users/samson/TatT/src/lib/design-style-signal.ts`: **15 styles**
- **Set-equal. Zero drift in either direction.**

This is the vocabulary the match flow actually consumes — `CANONICAL_STYLES` strings are
sent verbatim as `style_preferences` to `/api/v1/match/semantic`, and the file's own comment
pins them to the live Neo4j style names.

The 26-tag `data/style-ontology.json` is the **design bot's** vocabulary, bridged into
canonical styles by `ONTOLOGY_TO_CANONICAL_STYLE` (with `UNMAPPED_ONTOLOGY_TAGS` as an
explicit drop list). Enrichment writes in the **consumer** vocabulary directly and never
touches the bridge.

**Verdict: no vocabulary risk.** The "two competing vocabularies" concern in TODO.md does
not apply to this pipeline. Whatever else is wrong here, we are not enriching into the wrong
namespace. Worth a regression test locking the two lists together so they can't drift.

---

## 4. Cost and time for the full run

**API cost: $0.00.** `enrich_artists.py` imports only `requests` and `beautifulsoup4`. There
is no LLM call, no Vertex call, no paid API anywhere in the pipeline. It is pure regex over
fetched HTML.

**`BUDGET_MAX_SPEND_CENTS` is not a constraint here.** It lives in
`src/lib/budget-tracker.ts` as a monthly cap on Vertex Imagen renders (4¢/image) and design-bot
conversation turns, inside the Next.js app. No scraper reads it. Prod's $50/mo is untouched by
either enrichment lane. **No separate budget is needed.**

**Remaining work:** batches 3–108 — **106 batches, 1,891 domains, 6,734 artists**.

| | Estimate | Basis |
|---|---|---|
| Wall clock | **35–100 min** | 56s/3 batches ≈ 18.7s/batch × 106 ≈ 33 min; 2–3× headroom for slow/dead domains |
| HTTP requests | **~13,000** | 1,891 robots.txt + up to 6 pages/domain |
| $ spend | **$0** | no paid API |
| Records produced | ~3,480 | at pilot's 51.7% hit rate |
| Artists with styles | ~880 (→ ~1,020 total) | at pilot's 13.2% rate |
| **Of which, tags wrong** | **~420 artists** | at 59% tag precision |

The cost that matters is not dollars or hours — it is **~420 artists injected into the match
graph with at least one wrong style tag**, and the yield estimate is optimistic because the
pilot took the richest batches.

---

## 5. The finding that changes the decision

`/Users/samson/tatt-scraper/data/enrichment/instagram/apify-profiles/` holds **10,427 Apify
Instagram profiles**, scraped 2026-07-20. Already downloaded. Already paid for. **91% (9,536)
have a non-empty bio.**

Running the **identical** `STYLE_PATTERNS` regex over those bios — offline, no network:

| | Website pipeline (projected full run) | IG bios (already on disk) |
|---|---|---|
| Artists with styles | ~1,020 | **1,467** |
| Tag precision (hand-checked) | **59%** (36/61, n=30 records) | **98%** (54/55, n=36 records) |
| New scraping | ~13,000 HTTP requests | **none** |
| $ cost | $0 | $0 (already spent) |
| Wall clock | 35–100 min | **minutes** (local file parse) |

**Why it is so much more accurate:** an Instagram bio is first-person and scoped to exactly
one artist *by construction*. The section-attribution failure mode — which causes most of the
website lane's errors — **cannot occur**. The bios are also unusually clean self-declarations:

- `"Black & Grey Realism | Fine Line Tattoos"` → Black & Grey, Realism, Fine Line
- `"Anime||Japanese||Fine-line||Walk-Ins"` → Anime, Japanese, Fine Line
- `"FINE LINE * ILLUSTRATIVE * TRADITIONAL"` → Fine Line, Illustrative, Traditional

The single error in 36 hand-checked records: `Tribal` matched *"Sho-Ban **tribal** member"*
in a veteran's bio. One-line fix.

Recall, not precision, is this lane's weakness — abbreviations like "Neo-Trad", "B&G", "B+G"
are missed. Widening the patterns to catch them adds only **+30 artists**, so it is not worth
much; the 14.1% ceiling is simply how many artists state a style in their bio.

---

## 6. Blocker that applies to *both* lanes: there is no write path

**Nothing consumes `shards-deterministic/`.** Grepping both repos, the only file that
references the path is the producer itself.

`scripts/host-artist-images.mjs` — the one script that does write enrichment to the graph —
sets **only** `a.portfolioImages`:

```
MATCH (a:Artist {id: $artistId})
SET a.portfolioImages = $urls,
```

**There is no code anywhere that writes `styles` onto an `Artist` node from an enrichment
artifact.** Today, either lane produces JSON on disk and the match flow sees nothing. This
must be built before any run is worth launching, and it is the cheapest item on the list.

*Unverified:* the "~1,500 of 8,949 artists have style tags" baseline needs a live Neo4j query
and could not be confirmed read-only. Worth confirming before/after so the sweep's impact is
measurable rather than asserted.

---

## 7. Recommended gate criteria

The pilot had no stated bar. Proposed, with the reasoning attached:

**GO when all four hold:**

| # | Criterion | Threshold | Why |
|---|---|---|---|
| G1 | Style-tag precision on a 30+ record hand sample | **≥ 90%** | Below this, wrong tags cost more match quality than empty tags. A missing style makes an artist unfindable; a wrong style makes them *wrongly* findable, which is the worse failure — it burns a real user's trust in the match. |
| G2 | Records whose bio contains another artist's name | **< 5%** | Direct proxy for section bleed, cheap to compute, currently 19%. |
| G3 | Artists tagged with ≥5 styles | **< 2%** of styled | A 5+ style artist is noise in the ranking regardless of whether the tags are individually defensible. Currently 10%. |
| G4 | Graph-write path exists, is tested, and is idempotent | binary | Without it the run has no product effect at all. |

**STOP AND FIX if any of:**
- Tag precision < 80% (current: 59% — **fails**)
- No merge/write path (**fails**)
- Vocabulary drift from `CANONICAL_STYLES` (currently clean — **passes**)
- Any tag traceable to page chrome, nav text, or JavaScript (currently present — **fails**)

The website pipeline fails three of four gates today.

---

## 8. Recommendation

**NO-GO on the full website run. Redirect to the Instagram-bio lane.** In order:

1. **Build the graph-write path** (~half a day). Extend `host-artist-images.mjs` or add a
   sibling that sets `a.styles` idempotently from an enrichment artifact, plus a
   before/after coverage count so the sweep's effect is measurable. **Nothing else matters
   until this exists.** Add a test locking `STYLE_PATTERNS` keys to `CANONICAL_STYLES` so
   the currently-clean alignment can't silently drift.

2. **Harvest styles from the 10,427 IG bios already on disk** (~an hour). Fix the `Tribal`
   pattern to require a tattoo context. Expect ~1,467 artists at ~98% precision, for $0 and
   no new scraping. If the ~1,500-of-8,949 baseline is right, this roughly **doubles style
   coverage in an afternoon** with no risk of polluting the graph.

3. **Then decide on the website pipeline separately**, as a recall top-up for artists with
   no usable IG bio. It needs real fixes first — tighter section boundaries, a non-artist
   entity filter, a smear scrub that catches *overlapping* rather than only identical style
   sets, and rejection of nav/chrome text. Re-pilot on batches drawn from the *tail* (18-artist
   batches), not the head, and re-measure precision against G1–G3.

**What would change this recommendation:**

- **If the graph-write path already exists somewhere I didn't find** — then step 2 is a
  same-day win and should just be done.
- **If the ~1,500 baseline is wrong and IG-sourced artists overlap heavily with
  already-tagged ones** — the IG lane's marginal value drops and the website lane's recall
  contribution matters more. Confirm with a Neo4j count first; it's one query.
- **If wrong style tags turn out to be cheap** — i.e. if the matcher treats styles as soft
  ranking signal rather than a filter, and a wrong tag only mildly misranks rather than
  surfacing a bad artist — then 59% precision might be tolerable for recall's sake, and the
  website run becomes defensible after the write path lands. **I'd want to see how
  `/api/v1/match/semantic` weights `style_preferences` before accepting that argument.** It
  is the single question most likely to flip this call.
- **If launch timing demands maximum coverage now**, the IG lane still wins — it is both
  more accurate *and* higher yield. There is no speed-vs-quality tradeoff here; the website
  run is dominated on both axes.

---

## 9. Verification addendum — 2026-07-25, independent re-check

Everything in this section was measured against the live graph and the on-disk
corpus, not carried over from the body above. Corrections first.

### 9.1 Three claims in this document are wrong

| Claim in body | Actual | How measured |
|---|---|---|
| "~1,500 of 8,949 artists have style tags" (§6, flagged *unverified*) | **2,606 of 10,427** — 25.0%, not 17% | `MATCH (a:Artist) WHERE (a)-[:SPECIALIZES_IN]->(:Style) RETURN count(a)` |
| "`STYLE_PATTERNS` keys == live Neo4j style names" (§3) | **False.** `CANONICAL_STYLES` is set-equal to `STYLE_PATTERNS`, but *neither* equals the graph. The graph holds **21** `Style` nodes | `MATCH (s:Style) RETURN s.name` |
| "The single error in 36 hand-checked records: `Tribal`… One-line fix." (§5) | **`Tribal` is 53% precise (10/19), not one bad record.** Six of the nineteen come from the shop name *"Tribal Rites"*, one from the clothing brand *"Tribal Gear"*, one from `"No tribal"` | full-corpus audit of all 19 Tribal records |

On the vocabulary point: the graph carries 7 style names the UI can never
select (`Color`, `Dotwork`, `Japanese (Irezumi)`, `Lettering`, `New School`,
`Ornamental`, `Portrait`), and canonical **`Script` has no `Style` node at
all** — the graph spells that concept `Lettering`. §3's conclusion still holds
where it matters (enrichment writes in the *consumer* vocabulary, so there is
no namespace risk), but the stated reason — sync with Neo4j — is not true.
`scripts/lib/artist-styles.test.mjs` now locks the two lists that *do* need to
agree; the graph-side drift is left as a separate question.

### 9.2 Style really is a hard filter — confirmed

`src/features/match-pulse/services/neo4jService.ts` line ~323:
`(size($styles) = 0 OR any(style IN $styles WHERE any(s IN styles WHERE toLower(s) = toLower(style))))`.
An artist with no matching style is excluded outright. Precision over recall
is the correct posture, and G1 is the right gate.

### 9.3 Independently measured IG-bio precision

The regexes were ported to JS (`scripts/lib/artist-styles.mjs`) and diffed
against the Python original over all 10,427 profiles: **identical output, zero
divergence** — 1,467 styled artists either way. So the numbers below describe
the same extractor §5 describes.

Two disjoint seeded random samples of the styled records, hand-judged tag by
tag against the stored bio:

| | Records | Tags | Wrong tags |
|---|---|---|---|
| Sample A (seed 20260725) | 45 | 72 | 1 |
| Sample B (seed 778899, disjoint) | 25 | 39 | 2 |
| **Combined** | **70** | **111** | **3** |

**Tag precision 108/111 = 97.3%. Record precision 67/70 = 95.7%.**

Close enough to §5's 98% that the headline claim stands, and comfortably past
gate G1 (≥90%). The three errors are all *entity/context* errors, not
attribution errors — the failure mode that sinks the website lane genuinely
cannot occur here:

1. `artist_j.nendo` → Japanese. Sells *Japanese-style masks*, not tattoos.
2. `artist_electric_hands` → Blackwork, from `"Blackwork see @salty_tattooer"` —
   a **referral away**. The artist is saying they do *not* do it.
3. `artist_studiotattoo_ta2crew` → Realism, from `"3D realistic Areola
   Restoration"` — paramedical tattooing, not the Realism style.

G2 (another artist's name in the bio) is structurally 0% for this lane.
G3 (≥5 styles) is **4 / 1,456 = 0.27%**, against a <2% bar. Both pass.

### 9.4 A precision guard was added, and what it removes

Two error classes were dense enough to be worth fixing, and both were found by
auditing the *whole* corpus rather than a sample:

- **Proper-noun collisions** — `Tribal Rites` (6), `Tribal Gear` (1),
  `tribal member` (1). Alone these are 8 of the 19 Tribal tags.
- **Negated claims** — `"No tribal"`, `"I do not do script"`,
  `"NOT offer fine line"`, `"No Color No Lettering"`, `"🚫- No Realism"`.

`rejectSpuriousEvidence()` in `scripts/lib/artist-styles.mjs` drops exactly
**13 tags across 13 artists**; every one was hand-confirmed as a genuine error.
It is a separate layer from `STYLE_PATTERNS` — which stays a byte-faithful port
— and `harvest-ig-styles.mjs --raw` reproduces the unguarded output for
comparison. Rejections are written into the artifact's `guardRejections` so the
guard is auditable rather than trusted.

The guard is deliberately narrow. A bare ❌/🚫 is **not** treated as negation:
`"❌Geometric / Ornamental / Neo-Trad"` is a style *list*, and an earlier,
looser version of the rule wrongly stripped `Anime` from
`"❌NO DMS❌🌸SOFT TRAD🌸🍥ANIME🍥"`.

Guarded yield: **1,456 artists, 2,416 (artist, style) pairs** (from 1,467 /
2,429 raw). None of the 13 rejections fell in samples A or B, so the 97.3%
figure above is the *pre-guard* number and the shipped artifact is marginally
better than it.

### 9.5 The write path now exists — §6's blocker is closed

`scripts/link-artist-styles.mjs`. Dry-run by default; `--execute` is the only
thing that mutates. `MERGE` + `ON CREATE SET` — a re-run creates nothing and
never relabels an edge the seed import made. Writes only `SPECIALIZES_IN`
(the edge the filter reads), not `FEATURES_STYLE`.

Dry run against the live graph, 2026-07-25:

| | |
|---|---|
| Artists in artifact | 1,456 |
| **Matched to an `Artist` node by id** | **1,456 — 100.0%, zero misses** |
| Pairs already linked (no-op on re-run) | 544 |
| **Edges it would create** | **1,872** |
| Artists gaining their first style | 1,174 |
| `Style` nodes it would create | `Script` (only) |
| Style coverage | 2,606 → 3,780 of 10,427 — **25.0% → 36.3%** |

The 100% match rate is not luck: the IG scrape and the graph are the same
10,427 artists, both keyed `artist_<handle>` by
`~/tatt-scraper/execution/scrape_artists.py`. `Instagram` nodes are **not** a
usable key — there are zero of them in the live graph despite
`import-to-neo4j.js` creating them for seed data, so `Artist.id` is the only
join that works.

**Not executed.** The graph is unchanged; the owner runs `--execute`.

### 9.6 Revised recommendation

§8 step 1 (build the write path) and step 2 (harvest the IG bios) are **done**
and gates G1–G4 all pass for the IG lane. §8 step 3 stands unchanged: the
website pipeline still fails on precision and still needs the fixes listed
there before it is worth re-piloting.

---

## Appendix — verification commands

```bash
# pilot output composition
python3 -c "import json,glob;.." # over data/enrichment/shards-deterministic/shard-*.json
# → 562 artists, 143 styled, 363 tags, 477 bios, 448 image sets

# vocabulary equality
# STYLE_PATTERNS keys (enrich_artists.py) == CANONICAL_STYLES (src/lib/design-style-signal.ts) → True

# IG bio yield, offline
# 10,427 profiles, 9,536 with bio, 1,467 with >=1 canonical style

# write-path check
grep -rn "shards-deterministic" scripts/ src/   # → no matches
grep -n "SET a\." scripts/host-artist-images.mjs # → portfolioImages only
```

### Addendum (§9) — reproducing the numbers

```bash
# 1. Rebuild the artifact from the already-scraped bios ($0, no network)
node scripts/harvest-ig-styles.mjs \
  --input ~/tatt-scraper/data/enrichment/instagram/apify-profiles \
  --out data/enrichment/ig-artist-styles.json
# → 1,456 styled artists, 2,416 pairs, 13 guard rejections (all listed)

# 2. See exactly what would be written. Reads the graph, writes nothing.
node scripts/link-artist-styles.mjs --input data/enrichment/ig-artist-styles.json

# 3. Apply it (the ONLY form that mutates the graph)
node scripts/link-artist-styles.mjs --input data/enrichment/ig-artist-styles.json --execute

# 4. Undo, if it ever needs undoing
#    MATCH ()-[r:SPECIALIZES_IN {source:'instagram-bio'}]->() DELETE r

# Unguarded output, for comparing against the Python original
node scripts/harvest-ig-styles.mjs --input <dir> --raw --out /tmp/raw.json
```

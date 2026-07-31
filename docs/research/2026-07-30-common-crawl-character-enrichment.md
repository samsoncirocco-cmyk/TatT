# Common Crawl enrichment lane for anime character knowledge

Date: 2026-07-30

## Recommendation

Common Crawl is worth a **small, offline experiment**, but only as a discovery
layer behind the ranked anime/main-character catalog. It can find missing aliases,
transliterations, and distinctive visual terms at much wider coverage than a
hand-written list. It must not decide which characters are main, supply copied
biographies, provide training images, or publish facts directly to SketchBot.

The safe flow is:

```text
known anime + known main character
  -> find candidate archived pages on approved domains
  -> extract short candidate facts
  -> corroborate and score
  -> human/authority gate
  -> publish normalized facts to owned RAG
```

Common Crawl itself says crawled material can remain subject to the source
owner's separate terms, does not warrant its truthfulness or lawfulness, and
recommends legal advice before commercial use. That makes it a lead generator,
not a rights or factual authority. See the
[Common Crawl Terms of Use](https://commoncrawl.org/terms-of-use).

## Fields it can safely help discover

All outputs below are **candidates** until they pass the quality gates:

- Alternate spellings, romanizations, localized names, nicknames, honorific
  variants, and common misspellings.
- Series/franchise associations and character-to-variant labels, used to
  disambiguate names rather than establish `MAIN` status.
- Short visual anchors: hair shape/color, eye color, facial marks, signature
  outfit elements, weapon/prop, silhouette, emblem, or transformation name.
- “Do not confuse with” candidates when the same alias appears across multiple
  franchises.
- Page language, domain, capture date, and cross-source mention counts for
  prioritizing review.
- Candidate source URLs for a later direct, terms-aware validation step.

Do not ingest or infer:

- `MAIN` role, rank, popularity, or canonical status.
- Raw biographies, episode summaries, dialogue, lyrics, quotes, or long prose.
- Images, image URLs as training inputs, fan art, model weights, or facial
  embeddings.
- Personal data about creators, fans, cosplayers, or site users.
- A style imitation instruction based on a living artist or a fan artist.

The stored production fact should be a compact normalized statement such as
`weapon: key-shaped sword`, not a copied sentence. A tiny evidence excerpt may
be retained in a restricted audit store only when needed for review; it should
never be placed in prompts or customer-visible output.

## Minimal query and extraction design

Common Crawl exposes two relevant indexes:

- The [CDXJ Index](https://commoncrawl.org/cdxj-index) is optimized for locating
  captures of an individual page or URL pattern.
- The [URL Index](https://commoncrawl.org/columnar-index) is Parquet data suited
  to efficient bulk filtering and SQL-style analysis.

These are URL/capture indexes, not a general full-text search engine. The pilot
should therefore be entity-first and domain-bounded:

1. Start with stable anime and character IDs, canonical names, and aliases from
   the existing catalog. Do not discover the top-1,000 list through Common Crawl.
2. Maintain an allowlist of domains whose content and terms have been reviewed.
   Generate bounded URL/domain patterns from the known entity names.
3. Use CDXJ for exact/pattern lookups during the pilot. Use the URL Index only
   if the approved-domain query volume makes CDXJ inefficient. Do not enumerate
   arbitrary fandom, social, forum, or portfolio domains.
4. Search one recent crawl and one older crawl. Prefer HTTP 200, detected HTML,
   expected language, non-truncated records, and one canonical capture per
   content digest.
5. Fetch only the selected record byte ranges. WARC contains the raw response;
   WAT contains computed metadata; WET contains extracted plaintext. The
   [Common Crawl data guide](https://commoncrawl.org/get-started) documents these
   formats. Use WARC for structured metadata and a tightly bounded text
   extraction; WET is acceptable for a text-only prototype.
6. Extract only small windows around exact character/alias mentions. Run
   language detection, boilerplate removal, entity linking, candidate
   normalization, and safety/PII filters.
7. Require corroboration before a candidate reaches review. Keep the existing
   curated visual descriptions as the premium layer and treat the new facts as
   additive.

No broad crawl, full-corpus download, raw-page warehouse, or raw-text embedding
index is needed.

## Provenance and revocation record

Every accepted fact should be independently removable. A minimal record:

```json
{
  "factId": "sha256(characterId|field|normalizedValue)",
  "characterId": "owned-stable-id",
  "field": "alias|visual_anchor|variant|franchise_link",
  "normalizedValue": "short owned fact",
  "language": "en",
  "status": "candidate|approved|blocked|revoked",
  "confidence": 0.97,
  "corroborationCount": 2,
  "sources": [{
    "sourceUrl": "https://approved.example/...",
    "sourceDomain": "approved.example",
    "crawlId": "CC-MAIN-YYYY-NN",
    "captureTimestamp": "YYYYMMDDhhmmss",
    "warcFilename": "crawl-data/...",
    "warcOffset": 0,
    "warcLength": 0,
    "contentDigest": "sha1:...",
    "retrievedAt": "ISO-8601",
    "sourcePolicySnapshotId": "sha256(...)",
    "evidenceHash": "sha256(restricted-short-evidence)"
  }],
  "extractorVersion": "cc-character-facts/v1",
  "normalizerVersion": "character-identity/v1",
  "reviewedAt": "ISO-8601",
  "reviewedBy": "human-or-authority-gate",
  "revokedAt": null,
  "revocationReason": null
}
```

Keep a separate source-policy table with domain approval, source terms URL and
snapshot date, current robots/TDM signals, Common Crawl opt-out status, allowed
fact classes, reviewer, expiration, and kill-switch state.

Revocation must work by `factId`, URL, domain, crawl ID, or policy snapshot.
When a source is removed, opts out, changes terms, or receives a rights
complaint: quarantine its facts immediately, rebuild the character document
without them, invalidate the RAG index, and retain only the minimum audit record
required by policy. Common Crawl publishes an ongoing
[Opt-Out Registry](https://commoncrawl.org/blog/common-crawl-foundation-opt-out-registry);
sync it before each build and on a recurring schedule.

## Rights, privacy, and quality risks

- **Copyright and source terms:** Publicly archived does not mean licensed for
  reuse or model training. Common Crawl's terms explicitly preserve separate
  source terms and place the downstream risk on the user. Store normalized
  factual attributes, not expressive prose; exclude images and training use.
- **Robots and later opt-out:** Common Crawl says CCBot checks robots.txt and
  publishers can block it, but an old capture is not proof of current downstream
  permission. Recheck the live domain's robots/TDM signals and the opt-out
  registry at acceptance and rebuild time. See the
  [Common Crawl FAQ](https://commoncrawl.org/faq) and
  [opt-out protocol overview](https://commoncrawl.org/blog/balancing-discovery-and-privacy-a-look-into-opt-out-protocols).
- **Accuracy and poisoning:** Fan wikis, scraped mirrors, SEO pages, and
  AI-generated pages can repeat the same error. Two URLs are not two sources
  when they share text or ownership. Cluster by content digest, domain owner,
  and near-duplicate text before counting corroboration.
- **Identity collisions:** Short names such as “Zero,” “Ace,” or “Maki” can
  produce damaging false positives. Require series-qualified evidence and never
  let a colliding alias silently overwrite another character.
- **Privacy and minors:** Character facts need no real-person data. Drop bylines,
  usernames, comments, emails, handles, EXIF, and all fan/cosplayer details.
  Never use sexualized descriptors for minor or young-looking characters.
- **Staleness:** Preserve capture time, prefer current authoritative evidence,
  and expire mutable facts. An archive is useful for history, not proof of the
  current canon.

This is a product/data design, not a legal conclusion. Commercial expansion
beyond normalized factual discovery should receive rights counsel review.

## Quality gates

A candidate may enter the reviewed RAG layer only when:

1. It matches an existing stable character ID and franchise; Common Crawl cannot
   create or promote a `MAIN` character.
2. Its domain and fact class are approved and its policy snapshot is current.
3. It is supported by either one authoritative approved source or two
   independent approved sources after ownership and near-duplicate clustering.
4. Exact evidence contains the character and series context; generic inferred
   associations fail closed.
5. Alias collisions are explicitly resolved. Ambiguous aliases remain
   series-qualified or are rejected.
6. The normalized value is short, non-expressive, free of PII/sexualization, and
   passes language and profanity checks.
7. A held-out regression set shows no material increase in ordinary-word false
   positives.
8. The source can be removed and the affected RAG document rebuilt by an
   automated revocation test.

## Phased experiment and success criteria

### Phase 0 — policy and ground truth

Select 100 anime across old/new, popular/niche, and multiple languages, with up
to 300 already-known main characters. Human-review their current aliases and
visual anchors to create a blind ground-truth set. Approve no more than five
source domains.

**Go gate:** every approved domain has a recorded policy decision; the pipeline
stores no pages, biographies, images, or personal data.

### Phase 1 — discovery-only shadow run

Query two crawl snapshots, extract candidates, and produce a review report
without changing SketchBot or the production catalog.

**Go gate:**

- At least 60% of sampled characters receive one useful new candidate.
- Human-reviewed precision is at least 95% for aliases and 90% for visual
  anchors.
- Zero accepted `MAIN`-role changes, raw biographies, images, or PII.
- 100% of candidates have complete capture provenance.
- A domain-level revocation removes all affected candidates and rebuilds the
  sample in under 24 hours.

### Phase 2 — offline detector evaluation

Approve only the high-confidence candidates and compare the expanded detector
against the current detector using real-shaped, de-identified prompts. Measure
character recall, collision rate, ordinary-word false positives, and whether the
complete requested cast survives the full SketchBot flow.

**Go gate:**

- At least a 10 percentage-point recall improvement on previously missed
  aliases/romanizations.
- No more than a 0.5 percentage-point increase in false-positive rate.
- At least 99.5% correct franchise disambiguation on colliding aliases.
- 100% preservation of every customer-requested character in the existing
  lossless-cast regression suite.

### Phase 3 — limited production

Enable the enriched RAG only for exact high-confidence matches, behind a kill
switch and with source-level telemetry. Unknown or ambiguous names continue
through the lossless provider-roster path.

**Keep gate after 30 days:** fewer than 1% reviewed user corrections attributable
to Common Crawl facts, no rights/privacy incidents, and every deletion request
or source-policy change is quarantined within one business day.

If the experiment misses these gates, keep Common Crawl as an analyst discovery
tool rather than a production data dependency.

## Primary sources

- [Common Crawl Terms of Use](https://commoncrawl.org/terms-of-use)
- [Common Crawl CDXJ Index](https://commoncrawl.org/cdxj-index)
- [Common Crawl URL/Columnar Index](https://commoncrawl.org/columnar-index)
- [Common Crawl WARC/WAT/WET guide](https://commoncrawl.org/get-started)
- [Common Crawl FAQ and robots controls](https://commoncrawl.org/faq)
- [Common Crawl Opt-Out Registry announcement](https://commoncrawl.org/blog/common-crawl-foundation-opt-out-registry)
- [Common Crawl opt-out protocol overview](https://commoncrawl.org/blog/balancing-discovery-and-privacy-a-look-into-opt-out-protocols)

# Artist data — notes for counsel

**Status:** Engineering's notes on the published v1.0 privacy language. **Not legal advice.**
**Accompanies:** section 4 of `src/app/legal/privacy/page.tsx`
**Date:** 2026-07-26 (production counts refreshed 2026-07-30)

This is a handover document. It records what the system actually does, which
claims in the published policy depend on that, and the questions engineering
cannot answer. Someone qualified needs to go through it.

## 1. The factual position

| | |
|---|---|
| Artists in production Neo4j | 18,002 |
| Artists with at least one portfolio image URL attached | 7,511 (42% of 18,002) |
| Total portfolio image URLs across those artists | 68,532 |
| External portfolio image URLs | 68,506 |
| TatT GCS-hosted portfolio image URLs | 26, across 6 artists |
| Opt-in evidence attached to the collected dataset | None identified |

**Correction to the prior version of this table:** it described roughly 62,313
photos as downloaded and re-hosted on TatT storage. A read-only query of the
production graph on 2026-07-30 does not support that claim. The current crawl
pipeline (`execution/scrape_artists.py`, `extract_images()`) records absolute
source URLs from artist and shop websites. Separately,
`scripts/host-artist-images.mjs` can download source images into TatT's public
GCS bucket and write those hosted URLs back to Neo4j. Production currently
contains 26 such GCS URLs across 6 artists; the remaining 68,506 portfolio URLs
are external. Counsel should therefore treat both blanket claims — "about
62,000 are re-hosted" and "none are re-hosted" — as false.

What's unambiguous regardless of the photo question: **18,002 artist records**
are live in the production Neo4j graph today. Depending on the record, fields
can include names, bios, shop affiliations, ratings, Instagram
handles/permalinks, or contact information. The current dataset contains no
identified opt-in evidence; this count is records, not a claim that all records
are unique people.

Sources were public: shop and studio websites, public artist directories, public
Instagram profiles. "Public" is doing no work in that sentence — it describes
where we found it, not whether we were entitled to copy it into our own
database and display it.

Pre-launch status does **not** reduce this one. The data and limited GCS copies
exist today. Public display of unclaimed portfolios is separately controlled by
the server-side `SHOW_UNCLAIMED_PORTFOLIOS` flag; this memo does not claim the
flag's current production value.

## 2. The suggested template does not fit, and this is worth stating

The owner suggested adapting `ai-tattoos.com/privacy/index.html`. It is a generic
GDPR cookie-and-analytics notice. It contains no takedown procedure, no
commitment about not re-adding a removed person, no identity-verification
process, and nothing at all about data collected from third parties without
consent — which is TatT's entire situation.

Templates of that kind address data a user hands you. The hard problem here is
the set of records collected from third-party public sources with no identified
opt-in evidence. Section 4 of the policy was written from scratch for that
reason.

## 3. Why the policy addresses this processing

Engineering's reasoning, for counsel to overturn if wrong:

- The collection and limited GCS hosting already exist. The notice is what is
  missing, not the processing. Public display of unclaimed portfolios depends
  on a server-side flag whose current production value was not verified for
  this memo.
- Where personal data is obtained from someone other than the data subject,
  disclosure obligations are triggered by the processing, which has already
  happened. Silence looks like the exposure; disclosure looks like the remedy.
- An artist who reaches `/takedown` today has nowhere to read what removal does.

If counsel disagrees, section 4 should be revised through the policy's normal
versioned update process and the material change announced on the page.

## 4. Claims in the policy that are load-bearing

Each is currently true of the code. If the code changes, the text becomes false.

| Draft says | Guaranteed by | Notes |
|---|---|---|
| Photographs are deleted, not hidden | `scripts/execute-takedown.mjs` (GCS hard delete) | Executor has **never** been run against production |
| Embedding is deleted | same, Supabase `portfolio_embeddings` | |
| Personal fields are erased from the record | `SCRUBBED_PROPERTIES` in the executor | |
| An emptied record is retained | ADR 0025 §2 | Money + audit + resurrection detection |
| A permanent suppression list prevents re-adding | ADR 0025 §3–4, `takedown-tombstone.mjs` | Fails closed |
| Removal is not a ban; you can join yourself | ADR 0026 | |
| Automated collection stays blocked **even after** you join | ADR 0026 §1 | Regression-tested |
| Nothing deleted comes back on reinstatement | ADR 0026 §2 | Structural — the data is gone |
| A person reviews every request | ADR 0025 §5; the route has no write path | |
| Removed artists disappear from the homepage | `src/lib/featured-artists.ts` | Newly true; was **false** before this PR |

**The strongest and most unusual commitment is the suppression list.** The policy
states plainly that it is *itself retained personal data* — one identifier kept
indefinitely for the sole purpose of never processing anything else about that
person again. Counsel should decide whether that framing is right and whether the
offer to delete it on request (with a stated consequence) is the correct balance.

## 5. Questions engineering cannot answer

1. **Should the collection have happened at all, and should it continue?** This
   PR and ADR 0025 build the exit door. Neither addresses whether an opt-out model
   is defensible, whether the 26 GCS-hosted images should be deleted
   proactively, or whether external portfolio images should remain eligible for
   display without identified opt-in evidence. That is the biggest open question
   and it is not an engineering one.

2. **Copyright is separate from privacy and is not addressed anywhere.** The
   photographs are almost certainly someone's copyrighted work — possibly the
   artist's, possibly the studio's, possibly a client's. Both copying files into
   GCS and any display of third-party-hosted files raise copyright questions
   that the privacy policy does not touch and cannot fix. There is no DMCA
   agent, no designated agent registration, and no notice-and-takedown
   procedure framed as such.

3. **Lawful basis.** If legitimate interests is the intended basis, a legitimate
   interests assessment should exist and does not. The policy deliberately states
   the commercial motive plainly rather than dressing it up as a benefit to
   artists, which may help or hurt that assessment.

4. **Statutory response windows.** Nothing in the system tracks deadlines. The
   policy says "a few days" and defers to statutory deadlines if invoked. If real
   deadlines apply, that needs a tracked queue, which does not exist.

5. **Jurisdiction.** The dataset is US artists; obligations differ by state (e.g.
   CCPA/CPRA) and would differ again for any EU/UK artist in the set. The policy
   makes one global promise rather than jurisdiction-specific ones. Deliberate
   simplification — confirm it is acceptable.

6. **Notification obligation.** Where data is collected from third parties, there
   may be an obligation to *notify the data subjects*, not merely to publish a
   notice they might find. Nobody has been told they are in the dataset. Publishing
   this page does not discharge that if it applies.

7. **Retention period for the emptied record.** ADR 0025 left this open and it is
   still open. "Indefinitely" is the current behaviour and is probably wrong.

8. **Reinstated artists and consent capture.** ADR 0026 §"Open questions": a
   reinstated artist gets `selfRegistered = true` but there is no record of what
   terms they accepted.

## 6. What to do with this document

It is engineering's notes, not a deliverable. Once counsel has been through
section 4 of the privacy page, this file's job is done and the answers should
land in the ADRs and the policy text rather than here.

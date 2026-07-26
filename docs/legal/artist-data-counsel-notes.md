# Artist data — notes for counsel

**Status:** Engineering's notes on the draft privacy language. **Not legal advice.**
**Accompanies:** section 4 of `src/app/legal/privacy/page.tsx` (published as a draft)
**Date:** 2026-07-26

This is a handover document. It records what the system actually does, which
claims in the published draft depend on that, and the questions engineering
cannot answer. Someone qualified needs to go through it.

## 1. The factual position

| | |
|---|---|
| Artists collected without consent | ~7,828 |
| Portfolio photographs downloaded and **re-hosted on TatT's own storage** | ~62,313 |
| Artists who opted in | 0 |
| Currently publicly reachable | Yes — the photographs are served from TatT infrastructure now |
| Customers / onboarded artists | None. Pre-launch. |

Sources were public: shop and studio websites, public artist directories, public
Instagram profiles. "Public" is doing no work in that sentence — it describes
where we found it, not whether we were entitled to copy and re-host it.

Pre-launch status does **not** reduce this one. The images are live today.

## 2. The suggested template does not fit, and this is worth stating

The owner suggested adapting `ai-tattoos.com/privacy/index.html`. It is a generic
GDPR cookie-and-analytics notice. It contains no takedown procedure, no
commitment about not re-adding a removed person, no identity-verification
process, and nothing at all about data collected from third parties without
consent — which is TatT's entire situation.

Templates of that kind address data a user hands you. The hard problem here is
data taken from people who never interacted with us. Section 4 of the draft was
written from scratch for that reason.

## 3. Why the draft is published rather than held back

Engineering's reasoning, for counsel to overturn if wrong:

- The collection and re-hosting are **already public**. The notice is what is
  missing, not the processing.
- Where personal data is obtained from someone other than the data subject,
  disclosure obligations are triggered by the processing, which has already
  happened. Silence looks like the exposure; disclosure looks like the remedy.
- An artist who reaches `/takedown` today has nowhere to read what removal does.
- The page already carried a "pending counsel review" banner and lorem ipsum, so
  publishing replaces filler with something honest **at the same status**. It does
  not promote unreviewed text to settled policy.

If counsel disagrees, the section can be moved to `docs/` in one commit.

## 4. Claims in the draft that are load-bearing

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

**The strongest and most unusual commitment is the suppression list.** The draft
states plainly that it is *itself retained personal data* — one identifier kept
indefinitely for the sole purpose of never processing anything else about that
person again. Counsel should decide whether that framing is right and whether the
offer to delete it on request (with a stated consequence) is the correct balance.

## 5. Questions engineering cannot answer

1. **Should the collection have happened at all, and should it continue?** This
   PR and ADR 0025 build the exit door. Neither addresses whether an opt-out model
   is defensible, or whether the ~62,000 re-hosted photographs should be deleted
   proactively rather than on request. That is the biggest open question and it is
   not an engineering one.

2. **Copyright is separate from privacy and is not addressed anywhere.** The
   photographs are almost certainly someone's copyrighted work — possibly the
   artist's, possibly the studio's, possibly a client's. Re-hosting them is a
   copyright question that the privacy policy does not touch and cannot fix. There
   is no DMCA agent, no designated agent registration, and no notice-and-takedown
   procedure framed as such.

3. **Lawful basis.** If legitimate interests is the intended basis, a legitimate
   interests assessment should exist and does not. The draft deliberately states
   the commercial motive plainly rather than dressing it up as a benefit to
   artists, which may help or hurt that assessment.

4. **Statutory response windows.** Nothing in the system tracks deadlines. The
   draft says "a few days" and defers to statutory deadlines if invoked. If real
   deadlines apply, that needs a tracked queue, which does not exist.

5. **Jurisdiction.** The dataset is US artists; obligations differ by state (e.g.
   CCPA/CPRA) and would differ again for any EU/UK artist in the set. The draft
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

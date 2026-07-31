# Civitai + owned RAG/LoRA for character tattoo fidelity

Date: 2026-07-30

## Executive recommendation

Use three separate layers:

1. **Character knowledge (owned RAG):** resolves “Sora from Kingdom Hearts” to a stable character ID and retrieves a short, verified visual specification: canonical name, franchise, aliases, silhouette, hair/face/outfit identifiers, props, variants, and “do not confuse with” facts.
2. **Tattoo compiler (owned prompt/layout logic):** preserves the customer's complete cast and converts each retrieved character specification into a composition that fits the body placement and tattoo style.
3. **Visual adapters (owned LoRAs first, screened Civitai LoRAs second):** teach a compatible image model how to render a subject or tattoo medium more consistently.

RAG answers **what the character should look like**. A LoRA helps the image model **draw that look consistently**. They are complementary and neither should replace lossless cast handling.

Civitai should be treated as an optional, untrusted adapter marketplace—not as the factual source for the top-1,000 anime catalog and not as a license warranty. The strongest long-term moat is TattTester's owned character knowledge, tattoo-specific evaluation set, and tattoo-medium LoRAs trained only on material it has the right to use.

## Where Common Crawl fits

Common Crawl can cheaply widen **discovery**, but it should not become the
authority or an assumed-license training set.

Useful jobs:

- Query its URL Index for franchise/character pages and use WET extracted text to
  discover spelling variants, aliases, transliterations, and signature phrases.
- Identify candidate sources that TattTester can then validate against an
  allowlist or an authoritative API.
- Find gaps and disagreements in the owned character catalog for human review.

Do not let Common Crawl decide `MAIN` roles, copy raw biographies into the
product, or treat crawled images as permission to train a LoRA. Common Crawl's
own Terms say crawled content may remain subject to the source owner's separate
terms and disclaim its truthfulness, lawfulness, and accuracy.

For every accepted fact/snippet, store the character ID, normalized fact, source
URL/domain, crawl ID/date, retrieval time, extractor version, and confidence.
Allow only approved source domains for production facts, keep short normalized
facts rather than raw prose, exclude images and personal data, dedupe, and
support source-level revocation/rebuild. A removed or disallowed source must be
purgeable without retraining the whole system.

Primary sources:

- [Common Crawl URL Index](https://commoncrawl.org/url-index)
- [Common Crawl WARC/WAT/WET guide](https://commoncrawl.org/get-started)
- [Common Crawl Terms of Use](https://commoncrawl.org/terms-of-use)

## What Civitai exposes

Civitai's public v1 model endpoints expose the fields needed to build a registry:

- Model: `id`, `name`, `type`, `nsfw`, `poi`, `mode`, `creator`, `tags`,
  `allowNoCredit`, `allowCommercialUse`, `allowDerivatives`, and
  `allowDifferentLicense`.
- Version: `id`, `baseModel`, `baseModelType`, `trainedWords`, `nsfwLevel`,
  and version descriptions.
- File: `id`, `name`, `type`, `metadata.format`, scan results, `downloadUrl`,
  `primary`, and hashes including full `SHA256`.
- Images separately expose `nsfw`/`nsfwLevel`.

`trainedWords` are trigger phrases, `baseModel` is the compatibility boundary,
and SHA-256 is the immutable identity check. A model name or mutable download URL
is not enough to pin production behavior.

Primary sources:

- [Civitai Models API](https://developer.civitai.com/site/reference/models)
- [Civitai Model Versions API](https://developer.civitai.com/site/reference/model-versions)
- [Civitai model API](https://civitai.com/api/v1/models)
- [Current Civitai source: licensing schema](https://github.com/civitai/civitai/blob/main/src/server/schema/model.schema.ts)
- [Current Civitai source: version fields](https://github.com/civitai/civitai/blob/main/src/server/schema/model-version.schema.ts)
- [Current Civitai source: permission labels](https://github.com/civitai/civitai/blob/main/src/components/PermissionIndicator/PermissionIndicator.tsx)

### Permission meanings that matter to TattTester

The current API returns `allowCommercialUse` as a multi-value field, but live
records may serialize it as a PostgreSQL array-literal string such as
`"{Image,RentCivit,Rent}"`; older records/docs may show a scalar. Normalize the
raw value defensively and preserve it in the audit snapshot. Civitai's current
UI defines the values as:

- `Image`: sell generated images.
- `RentCivit`: use on Civitai's own generation service.
- `Rent`: use on other generation services.
- `Sell`: sell the model or merges.

TattTester is an external generation service, so a production candidate must
include **`Rent` or `Sell`**. `Image` alone and `RentCivit` alone are insufficient.
If `allowNoCredit` is false, TattTester must retain and surface creator attribution.
`allowDerivatives` governs sharing merges; it should be required before stacking
or training on a community adapter. `allowDifferentLicense` matters when releasing
a derivative under different terms.

Civitai's Terms say use of another user's model is subject to that model's bespoke
license. They also place responsibility on uploaders for third-party rights. That
does not prove an uploader owns the underlying anime/game character IP. Passing
Civitai's permission flags is therefore necessary but not a complete IP clearance.

Primary sources:

- [Civitai Terms, sections 9.3-9.4](https://civitai.com/content/tos)
- [Current Civitai source: commercial permission labels](https://github.com/civitai/civitai/blob/main/src/components/Resource/Forms/ModelUpsertForm.tsx)
- [Current Civitai source: permission migration](https://github.com/civitai/civitai/blob/main/packages/civitai-db-schema/prisma/migrations/20240221203954_model_commercial_user_array/migration.sql)

### NSFW and file safety

`?nsfw=false` is only a discovery filter; it is not a sufficient production
guarantee. A nominally safe model can still have sexualized tags or trigger text.
Never paste every `trainedWords` entry into a user prompt.

Also distinguish resource classification (`nsfw`/`nsfwLevel`) from the creator's
`sfwOnly` generation permission. Regional browsing filters can omit results, so
absence from a search response is not proof of safety or removal.

Minimum gates:

- `type === "LORA"`, `mode == null`, `nsfw === false`, `poi === false`.
- Compatible `baseModel`.
- Primary file is `SafeTensor`, with `pickleScanResult === "Success"` and
  `virusScanResult === "Success"`.
- Full SHA-256 is present and matches the approved registry snapshot.
- Trigger words pass a separate text/content filter.
- Provider safety checker remains enabled.
- Block minors/young-looking characters from any sexualized model, trigger, or
  output path.

Civitai itself documents that base-model licenses can add NSFW and commercial
restrictions, so registry approval must consider both the community model's flags
and the base model's license.

Primary sources:

- [Civitai NSFW/license restrictions](https://github.com/civitai/civitai/blob/main/docs/nsfw-license-restrictions.md)
- [Civitai model file API schema](https://github.com/civitai/civitai/blob/main/src/server/schema/model-file.schema.ts)

## Fit with TattTester's current generation lanes

Current routing lives in:

- `src/services/generation/internal/routing.ts`
- `src/services/generation/internal/replicate.ts`
- `src/services/generation/internal/vertexImagen.ts`
- `src/services/generation/index.ts`

Today the server routes to Replicate's plain `black-forest-labs/flux-dev`,
`black-forest-labs/flux-schnell`, `krea/krea-2-medium`, or Vertex Imagen 3.
The request contract has no adapter/reference fields.

### Replicate / Flux: best first integration

Replicate's official `black-forest-labs/flux-dev-lora` accepts:

- `lora_weights` (including Civitai model URLs),
- `lora_scale`,
- one `extra_lora` and `extra_lora_scale`,
- and a secret `civitai_api_token` for protected Civitai assets.

Replicate also publishes `black-forest-labs/flux-schnell-lora` for the preview
lane. This makes Flux the lowest-friction controlled pilot. The ordinary Flux
slugs currently used by TattTester do not accept those adapter inputs; selected
requests must route to the LoRA-capable slugs.

Use no more than two adapters in the official path. Seven-character compositions
should not load seven character LoRAs: adapters bleed identities and the official
endpoint exposes only a primary plus one extra adapter. For a large cast, use RAG
constraints plus reference/layout guidance, or generate controlled character
panels and compose them.

Primary sources:

- [Replicate FLUX dev LoRA API](https://replicate.com/black-forest-labs/flux-dev-lora)
- [Replicate FLUX schnell LoRA](https://replicate.com/black-forest-labs/flux-schnell-lora)
- [Replicate LoRA guide](https://replicate.com/docs/guides/extend/working-with-loras/)

### Krea

The current TattTester Krea lane is `krea/krea-2-medium` through Replicate. Its
published inputs support up to ten `style_reference_images` and a moodboard, but
not arbitrary external Civitai LoRA weights. Those reference inputs are useful
for tattoo style, not proof of multi-character identity.

Krea's own API now advertises custom Flux LoRA training and reuse. Using that
would be a new Krea API/provider integration, not a parameter added to the current
Replicate Krea 2 route.

Primary sources:

- [Krea 2 Medium on Replicate](https://replicate.com/krea/krea-2-medium/readme)
- [Krea API and LoRA training](https://www.krea.ai/features/api)

### Vertex Imagen

The current Imagen text-generation endpoint has no Civitai/LoRA adapter input.
Google offers Imagen 3 subject/style customization through reference images and
the separate `imagen-3.0-capability-001` model for approved users. That can be a
reference-guided fallback, but it cannot consume a Civitai LoRA.

Primary source:

- [Vertex Imagen subject customization](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/subject-customization)

## Safe on-demand adapter registry

Do not let a customer prompt become a Civitai URL and do not load the current
search winner directly. Use a server-only, deny-by-default registry.

Each approved adapter record should contain:

```text
characterId / capabilityId
civitaiModelId, modelVersionId, primaryFileId
creator name and attribution requirement
baseModel and adapter type
approved trigger words (not the raw unfiltered list)
approved scale range
commercial permission snapshot
derivative permission snapshot
model NSFW/POI/mode snapshot
SafeTensor + scan statuses
full SHA-256
approvedAt, reviewedBy, lastRevalidatedAt
status: shadow | active | quarantined | retired
evaluation report/version
```

Runtime flow:

1. Detector resolves an exact `characterId` and franchise.
2. RAG returns the verified visual specification for that ID.
3. Registry looks up an already approved adapter for the exact ID and current
   provider/base model.
4. Registry revalidates mutable Civitai status and permissions on first use after
   a short TTL. Any error or change fails closed to the no-LoRA route.
5. Generation records adapter version, SHA-256, scale, triggers, seed, provider,
   and prompt-spec version for reproducibility.
6. A kill switch can quarantine one adapter, creator, franchise, or all external
   adapters without redeploying.

Never store the Civitai token in browser-visible state. Pass it only from a
server-side secret to the provider, using `Authorization: Bearer` where
TattTester calls Civitai directly. Civitai's Terms expressly allow automation
through its public API within applicable rate limits; use that interface rather
than scraping pages.

Primary sources:

- [Civitai authentication](https://developer.civitai.com/site/guide/authentication)
- [Civitai permissions](https://developer.civitai.com/site/reference/permissions)

## What TattTester should train itself

Prioritize broadly reusable, owned capabilities:

1. **Tattoo-medium LoRA:** clean line hierarchy, readable negative space,
   controlled shading, stencilable contours, and healed-ink realism.
2. **Tattoo family LoRAs:** blackwork, fine-line, neo-traditional, Japanese,
   illustrative color, lettering, etc., trained from licensed or commissioned
   examples—not scraped portfolios or imitation of a living artist.
3. **Placement/composition evaluation model:** judge whether a design reads on a
   forearm, sleeve, chest, back, or wrap. Layout/reference controls may outperform
   a LoRA for this job.
4. **Consented customer/artist adapters:** private adapters for an artist's own
   catalog or a customer's original mascot, with explicit data and deletion terms.

Do **not** plan to train one proprietary LoRA for every copyrighted anime/game
character from scraped images. It scales poorly, creates a rights problem, and
does not solve multi-character composition. Character-specific adapters should
be exceptional and rights-cleared; the default should be RAG plus references and
an owned tattoo-medium adapter.

## Evaluation and rollout

Build a frozen benchmark before turning adapters on:

- 100-200 prompts stratified by popular/obscure characters, similar names across
  franchises, human/nonhuman forms, outfit variants, one/two/seven-character
  casts, tattoo styles, and placements.
- Seed-matched A/B/C: current generation, RAG only, RAG + adapter.
- Blind rubric: requested-cast completeness, correct franchise, identity anchors,
  cross-character contamination, pose/composition, tattoo readability, anatomy,
  stencilability, safety, and customer preference.
- Record latency, cost, provider failures, content-filter rate, and fallback rate.

Suggested launch gates:

- No regression in lossless cast completeness.
- Material identity-fidelity gain over RAG-only for the adapter's exact character.
- No increase in unsafe outputs.
- No adapter may ship without license/scan/hash gates and a provenance record.
- Shadow first; then employee/internal traffic; then a small feature-flagged
  customer cohort; automatic rollback on fidelity, safety, cost, or latency breach.

## Bottom line

Yes, Civitai can help immediately with **discovery and carefully approved Flux
adapters**. It cannot replace the top-1,000 character knowledge project, and its
uploader permissions do not clear the underlying franchise rights. The product
architecture should therefore be:

**verified character catalog + owned RAG → tattoo prompt/layout compiler →
owned tattoo LoRA → optional approved character LoRA → provider fallback.**

That design improves SketchBot now while building a defensible asset TattTester
actually owns.

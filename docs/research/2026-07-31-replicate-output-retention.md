# Replicate API output retention and TattTester persistence audit

Date: 2026-07-31

## Conclusion

The claim is confirmed for predictions TattTester creates through Replicate's
API: file URLs on `replicate.delivery` expire **after one hour**, and Replicate
automatically deletes the API prediction's output files after an hour. A durable
product must copy the file before then.

TattTester's customer-facing design-session path does **not** currently make
that copy for Replicate outputs. It uploads inline `data:` images to GCS but
passes any already-hosted URL through unchanged. The session stores that
short-lived URL, and the completed design handoff saves the same string into
"My Designs." Consequently, a design generated through this Replicate path can
remain listed while its image becomes unavailable after Replicate removes the
file.

## Official Replicate evidence

- Replicate's [Output files documentation](https://replicate.com/docs/topics/predictions/output-files/)
  says file URLs point to `replicate.delivery` and "will expire after one
  hour." Its data-retention section says output files for API-created
  predictions are automatically deleted after an hour and must be copied for
  continued use.
- Replicate's [Data retention documentation](https://replicate.com/docs/topics/predictions/data-retention/)
  says API-created predictions have their input parameters, output values,
  output files, and logs removed after an hour by default.
- Replicate's [HTTP API reference](https://replicate.com/docs/reference/http)
  says API prediction data is removed after an hour by default; after output
  removal, the prediction's `output` key remains but its value becomes `null`.

Scope nuance: Replicate documents indefinite retention for predictions created
through its **web interface**. That exception does not apply here because
TattTester creates predictions with the HTTP API. The cited pages do not state
whether the one-hour clock begins at prediction creation or completion, so this
note does not infer an anchor.

## TattTester code evidence

### Customer design-session path: Replicate URL is passed through

1. `src/services/generation/internal/replicate.ts:190-194` reads the prediction's
   `output` URL(s) and returns those strings as `images`; lines `229-242` expose
   them as the provider result.
2. `src/services/designSession/internal/orchestrator.ts:115-133` defines
   `persistableImageUrl`. Line 126 returns every non-`data:` URL unchanged; only
   inline base64 output is copied to GCS on lines 127-133. The comment on lines
   115-119 explicitly says hosted Replicate URLs pass through untouched.
3. The four reveal images use that helper at
   `src/services/designSession/internal/orchestrator.ts:166-183`; the refinement
   image uses it at lines `276-302`. The resulting URL is then included in the
   final brief at lines `303-310` and saved with the session.
4. `src/features/design-session/components/HandoffCard.tsx:16-18` states that
   the refined cut is saved into the local design library. Lines `20-27` read
   the same refined `imageUrl`, and lines `38-42` pass it directly to
   `addDesign` as `image`.
5. `src/lib/tattStorage.ts:172-185` stores that design object as-is. It does not
   fetch or re-host the image before "My Designs" persistence.

This confirms the pass-through risk for both server-stored design-session
images and the refined cut saved into "My Designs."

### Other Replicate pass-through routes

- `src/app/api/v1/generate/route.ts:105-127` returns raw Replicate fallback
  `result.images` to the client without a storage copy.
- `src/app/api/v1/council/generate/route.ts:233-256` returns the raw prediction
  output URL, and lines `322-339` return it to the client with `uploads: []`.

### Durable storage exists, but it is not wired to this path

- `src/services/storage/imageStorageService.ts:77-120` uploads image bytes to a
  deterministic GCS object and returns a public storage URL.
- `src/services/storage/imageStorageService.ts:172-194` can fetch a hosted URL
  and copy it through that durable uploader. A repository-wide call-site search
  found no callers of `uploadImageFromUrl`; only its definition exists.
- `src/app/api/v1/tasks/generate/route.ts:177-207` is a separate, intentionally
  Vertex-only task path that decodes inline output and uploads it to GCS. It
  does not make the Replicate-backed customer design-session path durable.

## Required product correction

Treat every provider URL as transport, not storage. Before persisting or
returning a successful Replicate design, fetch it server-side, copy it to the
product's deterministic GCS path, verify the durable object is readable, and
persist only that product-owned URL. The operation should be idempotent so a
retry after provider success does not buy another generation.

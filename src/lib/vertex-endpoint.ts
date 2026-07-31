/**
 * Vertex AI endpoint construction (TAT-56).
 *
 * Vertex serves models from two different hosts, and which one you need is a
 * property of the MODEL, not of configuration:
 *
 *   - Regional  — `https://{region}-aiplatform.googleapis.com/.../locations/{region}/...`
 *     The Gemini 2.5 family and Imagen live here. This is what every call site
 *     in the repo built by hand before this helper existed.
 *   - Global    — `https://aiplatform.googleapis.com/.../locations/global/...`
 *     The Gemini 3.x family (including the Nano Banana 2 image models) is only
 *     served here. Asking us-central1 for `gemini-3.1-flash-lite` returns a
 *     404 "Publisher model not found", which reads like a typo rather than a
 *     routing mistake — verified against tatt-pro on 2026-07-31.
 *
 * Getting this wrong fails at request time with a confusing error, so the
 * mapping lives in one place instead of in five copied template literals.
 */

/**
 * Models Vertex serves only from the `global` location.
 *
 * Matched by prefix so that dated/preview suffixes (`-preview`, `-001`) resolve
 * without an entry each. Gemini 3.x is global-only today; if Google later
 * regionalises a model, deleting its prefix here is the whole change.
 */
const GLOBAL_ONLY_MODEL_PREFIXES = ['gemini-3'];

/** True when Vertex serves `model` only from the global endpoint. */
export function isGlobalOnlyModel(model: string): boolean {
  return GLOBAL_ONLY_MODEL_PREFIXES.some((prefix) => model.startsWith(prefix));
}

/** The configured regional location for models that are not global-only. */
export function vertexRegion(): string {
  return process.env.GCP_REGION || 'us-central1';
}

/**
 * Build the full generateContent/predict URL for `model`.
 *
 * `projectId` accepts null because every caller resolves it from a chain of
 * optional env vars. The call sites used to interpolate that null straight
 * into the path and ship a request for `projects/null/...`, which Vertex
 * rejects as an opaque 404. Failing here names the actual problem instead.
 *
 * @param projectId GCP project the call bills to.
 * @param model     Publisher model id, e.g. `gemini-3.1-flash-lite`.
 * @param method    Verb after the colon — `generateContent` (Gemini) or
 *                  `predict` (Imagen).
 */
export function buildVertexEndpoint(
  projectId: string | null | undefined,
  model: string,
  method: 'generateContent' | 'predict' = 'generateContent'
): string {
  if (!projectId) {
    throw new Error(
      'Vertex project id is not configured — set NEXT_PUBLIC_VERTEX_AI_PROJECT_ID, ' +
        'GCP_PROJECT_ID or VERTEX_PROJECT_ID.'
    );
  }

  if (isGlobalOnlyModel(model)) {
    return `https://aiplatform.googleapis.com/v1/projects/${projectId}/locations/global/publishers/google/models/${model}:${method}`;
  }

  const region = vertexRegion();
  return `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${model}:${method}`;
}

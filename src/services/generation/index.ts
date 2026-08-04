// Public entry point of the generation module (ADR-0001).
// Everything under internal/ is implementation detail — import only from here.
import { vertexImagenProvider } from './internal/vertexImagen';
import { replicateProvider } from './internal/replicate';
import { routeGeneration, inferProvider } from './internal/routing';
import type { GenerationRequest, GenerationResult, ProviderName } from './internal/provider';
import { asGenerationError } from './internal/provider';
import { screenForText } from './internal/textGuard';

export type {
  GenerationRequest,
  GenerationResult,
  GenerationMode,
  ProviderName,
  AspectRatio,
  SafetyFilterLevel
} from './internal/provider';

// Deliberate second public export (contract step, ticket 05): routeGeneration
// is a pure routing helper (no I/O, imports only the model-routing config) and
// is safe on the client. Feature code that previews model/aspect/negative-prompt
// choices without generating imports it from here instead of the deleted
// src/services/generationRouter.ts.
export { routeGeneration } from './internal/routing';
export type { GenerationRoute } from './internal/routing';

interface ResolvedRoute {
  modelId: string;
  provider: ProviderName;
  fallbackChain: string[];
}

function resolveRoute(request: GenerationRequest): { route: ResolvedRoute; request: GenerationRequest } {
  if (request.modelId) {
    // Explicit model choice skips routing; the caller owns aspect/negative prompt.
    return {
      route: {
        modelId: request.modelId,
        provider: inferProvider(request.modelId),
        fallbackChain: []
      },
      request
    };
  }

  const routed = routeGeneration(request);
  return {
    route: {
      modelId: routed.modelId,
      provider: routed.provider,
      fallbackChain: routed.fallbackChain
    },
    request: {
      ...request,
      modelId: routed.modelId,
      aspectRatio: request.aspectRatio ?? routed.aspectRatio,
      negativePrompt: routed.negativePrompt || request.negativePrompt
    }
  };
}

function dispatch(provider: ProviderName, request: GenerationRequest): Promise<GenerationResult> {
  return provider === 'vertex-ai'
    ? vertexImagenProvider.generate(request)
    : replicateProvider.generate(request);
}

/**
 * Screen a result and re-roll while it carries unrequested lettering (#297).
 *
 * The re-roll lives here rather than in a caller for the same reason the
 * retry and the provider fallback do (ADR-0001): this module owns "try again"
 * policy, and a second copy in the design-session orchestrator would drift
 * from this one.
 *
 * Bounded by construction. Each re-roll is a real paid render, so the default
 * is one — two renders at most — and a result that is still lettered after the
 * budget is spent is RETURNED, flagged, not thrown. The customer seeing a
 * design with a word in it is the defect; the customer seeing nothing is worse.
 */
async function screenAndReroll(
  first: GenerationResult,
  render: () => Promise<GenerationResult>,
  prompt: string,
  maxRerolls: number
): Promise<GenerationResult> {
  let result = first;
  let rerolls = 0;

  for (;;) {
    const verdicts = await Promise.all(
      result.images.map((image) => screenForText(image, prompt))
    );

    const unscreened = verdicts.find((v) => !v.screened);
    if (unscreened) {
      // Could not check. Say so rather than let "no intrusion found" stand in
      // for "did not look" — those are different facts to debug.
      result.metadata.textGuardSkipped = unscreened.skipReason;
      if (rerolls) result.metadata.textGuardRerolls = rerolls;
      return result;
    }

    const offending = verdicts.filter((v) => v.intruded);
    if (offending.length === 0) {
      result.metadata.textIntrusion = false;
      if (rerolls) result.metadata.textGuardRerolls = rerolls;
      return result;
    }

    if (rerolls >= maxRerolls) {
      result.metadata.textIntrusion = true;
      result.metadata.textIntrusionWords = [
        ...new Set(offending.flatMap((v) => v.words)),
      ];
      result.metadata.textGuardRerolls = rerolls;
      return result;
    }

    rerolls += 1;
    result = await render();
  }
}

export async function generate(request: GenerationRequest): Promise<GenerationResult> {
  const { route, request: resolved } = resolveRoute(request);

  const withScreening = async (result: GenerationResult): Promise<GenerationResult> => {
    if (!request.screenText) return result;
    return screenAndReroll(
      result,
      () => dispatch(route.provider, resolved),
      resolved.prompt,
      request.screenText.maxRerolls ?? 1
    );
  };

  try {
    return await withScreening(await dispatch(route.provider, resolved));
  } catch (thrown) {
    const error = asGenerationError(thrown);
    if (resolved.allowProviderFallback === false) throw error;

    // Vertex → Replicate SDXL (when a token exists); Replicate → its routed
    // fallback chain. Vertex never appears as a fallback target.
    const fallbackModels =
      route.provider === 'vertex-ai'
        ? process.env.REPLICATE_API_TOKEN
          ? ['sdxl']
          : []
        : route.fallbackChain.filter((id) => id !== 'imagen3');

    let lastError: Error = error;
    for (const modelId of fallbackModels) {
      try {
        const result = await replicateProvider.generate({ ...resolved, modelId });
        result.metadata.fallbackUsed = true;
        result.metadata.fallbackReason = error.code || error.message || 'PRIMARY_FAILED';
        // A fallback render reaches the customer exactly like a primary one,
        // so it gets the same gate — re-rolling on the fallback model.
        return request.screenText
          ? await screenAndReroll(
              result,
              async () => {
                const retry = await replicateProvider.generate({ ...resolved, modelId });
                retry.metadata.fallbackUsed = true;
                retry.metadata.fallbackReason = result.metadata.fallbackReason;
                return retry;
              },
              resolved.prompt,
              request.screenText.maxRerolls ?? 1
            )
          : result;
      } catch (fallbackError) {
        lastError = asGenerationError(fallbackError);
      }
    }
    throw lastError;
  }
}

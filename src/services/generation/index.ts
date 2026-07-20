// Public entry point of the generation module (ADR-0001).
// Everything under internal/ is implementation detail — import only from here.
import { vertexImagenProvider } from './internal/vertexImagen';
import { replicateProvider } from './internal/replicate';
import { routeGeneration, inferProvider } from './internal/routing';
import type { GenerationRequest, GenerationResult, ProviderName } from './internal/provider';

export type {
  GenerationRequest,
  GenerationResult,
  GenerationMode,
  ProviderName,
  AspectRatio,
  SafetyFilterLevel
} from './internal/provider';

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

export async function generate(request: GenerationRequest): Promise<GenerationResult> {
  const { route, request: resolved } = resolveRoute(request);

  try {
    return await dispatch(route.provider, resolved);
  } catch (error: any) {
    if (resolved.allowProviderFallback === false) throw error;

    // Vertex → Replicate SDXL (when a token exists); Replicate → its routed
    // fallback chain. Vertex never appears as a fallback target.
    const fallbackModels =
      route.provider === 'vertex-ai'
        ? process.env.REPLICATE_API_TOKEN
          ? ['sdxl']
          : []
        : route.fallbackChain.filter((id) => id !== 'imagen3');

    let lastError = error;
    for (const modelId of fallbackModels) {
      try {
        const result = await replicateProvider.generate({ ...resolved, modelId });
        result.metadata.fallbackUsed = true;
        result.metadata.fallbackReason = error?.code || error?.message || 'PRIMARY_FAILED';
        return result;
      } catch (fallbackError: any) {
        lastError = fallbackError;
      }
    }
    throw lastError;
  }
}

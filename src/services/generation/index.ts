// Public entry point of the generation module (ADR-0001).
// Everything under internal/ is implementation detail — import only from here.
import { vertexImagenProvider } from './internal/vertexImagen';
import type { GenerationRequest, GenerationResult } from './internal/provider';

export type { GenerationRequest, GenerationResult } from './internal/provider';

export async function generate(request: GenerationRequest): Promise<GenerationResult> {
  // Provider routing (style/mode → Replicate vs Vertex) arrives with ticket 02;
  // until then all requests run on Vertex Imagen.
  return vertexImagenProvider.generate(request);
}

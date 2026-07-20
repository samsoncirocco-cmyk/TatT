import { describe, expect, it } from 'vitest';
import { routeGeneration } from '../internal/routing';

describe('generation routing', () => {
  it('routes traditional styles to the Classic Flash model on Replicate', () => {
    const route = routeGeneration({ prompt: 'anchor', style: 'traditional' });
    expect(route.modelId).toBe('tattoo');
    expect(route.provider).toBe('replicate');
  });

  it('routes realism styles to Imagen on Vertex', () => {
    const route = routeGeneration({ prompt: 'portrait', style: 'realism' });
    expect(route.modelId).toBe('imagen3');
    expect(route.provider).toBe('vertex-ai');
  });

  it('falls back to the default mapping for unknown styles', () => {
    const route = routeGeneration({ prompt: 'x', style: 'no-such-style' });
    expect(route.modelId).toBe('sdxl');
    expect(route.provider).toBe('replicate');
  });

  it('preview mode overrides style with the turbo model', () => {
    const route = routeGeneration({ prompt: 'x', style: 'realism', mode: 'preview' });
    expect(route.modelId).toBe('dreamshaper');
  });

  it('stencil mode forces the blackwork model and shields the negative prompt', () => {
    const route = routeGeneration({ prompt: 'x', style: 'anime', isStencilMode: true });
    expect(route.modelId).toBe('sdxl');
    expect(route.negativePrompt).toContain('messy lines, sketch: 1.5');
  });

  it('appends the stencil shield to an existing negative prompt', () => {
    const route = routeGeneration({ prompt: 'x', isStencilMode: true, negativePrompt: 'blurry' });
    expect(route.negativePrompt.startsWith('blurry, ')).toBe(true);
  });

  it('picks aspect ratio from body part anatomy', () => {
    expect(routeGeneration({ prompt: 'x', bodyPart: 'forearm' }).aspectRatio).toBe('9:16');
    expect(routeGeneration({ prompt: 'x', bodyPart: 'back' }).aspectRatio).toBe('4:3');
    expect(routeGeneration({ prompt: 'x', bodyPart: 'wrist' }).aspectRatio).toBe('1:1');
  });

  it('maps fallback chains to catalog ids and excludes the primary', () => {
    const route = routeGeneration({ prompt: 'x', style: 'anime' });
    expect(route.modelId).toBe('animeXL');
    expect(route.fallbackChain).toEqual(['dreamshaper', 'sdxl']);
    expect(route.fallbackChain).not.toContain('animeXL');
  });
});

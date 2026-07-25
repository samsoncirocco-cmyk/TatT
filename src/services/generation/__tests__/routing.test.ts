import { describe, expect, it } from 'vitest';
import { routeGeneration } from '../internal/routing';

describe('generation routing', () => {
  it('routes traditional styles to Flux Dev on Replicate', () => {
    const route = routeGeneration({ prompt: 'anchor', style: 'traditional' });
    expect(route.modelId).toBe('flux-dev');
    expect(route.provider).toBe('replicate');
  });

  it('routes realism styles to Imagen on Vertex', () => {
    const route = routeGeneration({ prompt: 'portrait', style: 'realism' });
    expect(route.modelId).toBe('imagen3');
    expect(route.provider).toBe('vertex-ai');
  });

  it('falls back to the default mapping (Flux Dev) for unknown styles', () => {
    const route = routeGeneration({ prompt: 'x', style: 'no-such-style' });
    expect(route.modelId).toBe('flux-dev');
    expect(route.provider).toBe('replicate');
  });

  it('preview mode overrides style with the speed model (Schnell)', () => {
    const route = routeGeneration({ prompt: 'x', style: 'realism', mode: 'preview' });
    expect(route.modelId).toBe('flux-schnell');
  });

  it('stencil mode forces Flux Dev and shields the negative prompt', () => {
    const route = routeGeneration({ prompt: 'x', style: 'anime', isStencilMode: true });
    expect(route.modelId).toBe('flux-dev');
    expect(route.negativePrompt).toContain('messy lines, sketch');
    expect(route.negativePrompt).not.toContain(': 1.5');
  });

  it('appends the stencil shield to an existing negative prompt', () => {
    const route = routeGeneration({ prompt: 'x', isStencilMode: true, negativePrompt: 'blurry' });
    expect(route.negativePrompt.startsWith('blurry, ')).toBe(true);
  });

  it('picks aspect ratio from body part anatomy', () => {
    expect(routeGeneration({ prompt: 'x', bodyPart: 'forearm' }).aspectRatio).toBe('9:16');
    expect(routeGeneration({ prompt: 'x', bodyPart: 'back' }).aspectRatio).toBe('3:4');
    expect(routeGeneration({ prompt: 'x', bodyPart: 'chest' }).aspectRatio).toBe('3:4');
    expect(routeGeneration({ prompt: 'x', bodyPart: 'wrist' }).aspectRatio).toBe('1:1');
  });

  // Placement is free text from intake, never a bare enum — whole-string
  // equality used to miss every real phrase and fall through to 1:1.
  it('matches placement phrases inside free text', () => {
    expect(routeGeneration({ prompt: 'x', bodyPart: 'left forearm' }).aspectRatio).toBe('9:16');
    expect(routeGeneration({ prompt: 'x', bodyPart: 'inner forearm' }).aspectRatio).toBe('9:16');
    expect(routeGeneration({ prompt: 'x', bodyPart: 'upper left back' }).aspectRatio).toBe('3:4');
  });

  it('resolves overlapping placements to the most specific match', () => {
    // "upper arm" (9) beats "back" (4) and "arm" (3).
    expect(routeGeneration({ prompt: 'x', bodyPart: 'back of the upper arm' }).aspectRatio).toBe('9:16');
    // "forearm" must not be matched by the shorter "arm" rule.
    expect(routeGeneration({ prompt: 'x', bodyPart: 'forearm' }).aspectRatio).toBe('9:16');
  });

  it('breaks equal-length placement ties toward the limb', () => {
    // "calf" and "back" are both 4 chars — a calf piece, not a back piece.
    expect(routeGeneration({ prompt: 'x', bodyPart: 'back of the calf' }).aspectRatio).toBe('9:16');
    expect(routeGeneration({ prompt: 'x', bodyPart: 'back of the hand' }).aspectRatio).toBe('1:1');
  });

  it('defaults to portrait, not square, when placement is unknown or absent', () => {
    expect(routeGeneration({ prompt: 'x' }).aspectRatio).toBe('9:16');
    expect(routeGeneration({ prompt: 'x', bodyPart: '' }).aspectRatio).toBe('9:16');
    expect(routeGeneration({ prompt: 'x', bodyPart: 'somewhere undecided' }).aspectRatio).toBe('9:16');
  });

  it('maps fallback chains to catalog ids and excludes the primary', () => {
    const route = routeGeneration({ prompt: 'x', style: 'anime' });
    expect(route.modelId).toBe('krea2');
    expect(route.fallbackChain).toEqual(['flux-dev', 'flux-schnell']);
    expect(route.fallbackChain).not.toContain('krea2');
  });
});

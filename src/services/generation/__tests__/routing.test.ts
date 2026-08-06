import { describe, expect, it } from 'vitest';
import { routeGeneration, fallbackChainForModelId } from '../internal/routing';
import { STYLE_MODEL_MAPPING } from '@/config/modelRoutingRules.js';

describe('generation routing', () => {
  it('routes traditional styles to Flux Dev on Replicate', () => {
    const route = routeGeneration({ prompt: 'anchor', style: 'traditional' });
    expect(route.modelId).toBe('flux-dev');
    expect(route.provider).toBe('replicate');
  });

  // Realism moved off Google: measured through the real prompt path, Gemini
  // baked banner text into 2 of 2 designs. No style may route to Vertex.
  it.each(['realism', 'portrait', 'photorealistic'])(
    'routes %s to Flux Dev on Replicate, not Vertex',
    (style) => {
      const route = routeGeneration({ prompt: 'portrait', style });
      expect(route.modelId).toBe('flux-dev');
      expect(route.provider).toBe('replicate');
    }
  );

  it('leaves no style mapped to a Vertex model', () => {
    const styles = Object.keys(STYLE_MODEL_MAPPING);
    const vertexStyles = styles.filter(
      (style) => routeGeneration({ prompt: 'x', style }).provider === 'vertex-ai'
    );
    expect(vertexStyles).toEqual([]);
  });

  // #293: Flux held 39–49% cast completeness on 3+ character requests while
  // the Gemini lane held 100%. ADR-0048 moved that lane from Vertex to
  // nano-banana-2 on Replicate — one bill, no Vertex quota exposure — so
  // the cast route no longer leaves Replicate at all.
  it('routes 3+ named characters to the Gemini lane on Replicate regardless of style', () => {
    const route = routeGeneration({ prompt: 'x', style: 'anime', castSize: 3 });
    expect(route.modelId).toBe('nano-banana-2');
    expect(route.provider).toBe('replicate');
    expect(route.reasoning).toContain('cast completeness');
  });

  // Downgrade path (ADR-0048): the cast lane's chain falls to the Flux
  // family, resolved to catalog ids with the primary removed.
  it('gives the cast lane a Flux fallback chain', () => {
    const route = routeGeneration({ prompt: 'x', castSize: 3 });
    expect(route.fallbackChain).toEqual(['flux-dev', 'flux-schnell']);
  });

  it('keeps one- and two-character requests on the style route', () => {
    expect(routeGeneration({ prompt: 'x', style: 'anime', castSize: 2 }).provider).toBe('replicate');
    expect(routeGeneration({ prompt: 'x', style: 'traditional', castSize: 1 }).modelId).toBe('flux-dev');
  });

  it('lets preview and stencil overrides beat the cast route', () => {
    expect(routeGeneration({ prompt: 'x', castSize: 4, mode: 'preview' }).modelId).toBe('flux-schnell');
    expect(routeGeneration({ prompt: 'x', castSize: 4, isStencilMode: true }).modelId).toBe('flux-dev');
  });

  // Reference photos force the strong lane (#296 18a): likeness needs the
  // one model with a real multi-image reference input (ADR-0050).
  it('forces attached reference photos to nano-banana-2 regardless of style or cast size', () => {
    const route = routeGeneration({
      prompt: 'memorial portrait',
      style: 'traditional',
      referenceImages: ['https://photos.example/mum.jpg'],
    });
    expect(route.modelId).toBe('nano-banana-2');
    expect(route.provider).toBe('replicate');
    expect(route.reasoning).toContain('ADR-0050');
  });

  // A preview draft does not spend the strong lane, and stencil derivation
  // transforms an already-approved design where the photo did its work.
  it('lets preview and stencil overrides beat the photo force', () => {
    const photos = ['https://photos.example/mum.jpg'];
    expect(routeGeneration({ prompt: 'x', referenceImages: photos, mode: 'preview' }).modelId).toBe(
      'flux-schnell'
    );
    expect(
      routeGeneration({ prompt: 'x', referenceImages: photos, isStencilMode: true }).modelId
    ).toBe('flux-dev');
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

  it('resolves limb over torso regardless of phrase length', () => {
    // Equal length: "calf" vs "back", both 4.
    expect(routeGeneration({ prompt: 'x', bodyPart: 'back of the calf' }).aspectRatio).toBe('9:16');
    expect(routeGeneration({ prompt: 'x', bodyPart: 'back of the hand' }).aspectRatio).toBe('1:1');
    // Limb phrase SHORTER than the torso phrase — length must not decide,
    // or "back" (4) beats "arm"/"leg" (3) and routes an arm piece to 3:4.
    expect(routeGeneration({ prompt: 'x', bodyPart: 'back of the arm' }).aspectRatio).toBe('9:16');
    expect(routeGeneration({ prompt: 'x', bodyPart: 'back of the leg' }).aspectRatio).toBe('9:16');
    expect(routeGeneration({ prompt: 'x', bodyPart: 'back of my arm' }).aspectRatio).toBe('9:16');
  });

  it('matches plural placements', () => {
    expect(routeGeneration({ prompt: 'x', bodyPart: 'hands' }).aspectRatio).toBe('1:1');
    expect(routeGeneration({ prompt: 'x', bodyPart: 'both wrists' }).aspectRatio).toBe('1:1');
    expect(routeGeneration({ prompt: 'x', bodyPart: 'ankles' }).aspectRatio).toBe('1:1');
    expect(routeGeneration({ prompt: 'x', bodyPart: 'both forearms' }).aspectRatio).toBe('9:16');
  });

  // A live session briefed "arm sleeve" and the reveal must render portrait
  // — a sleeve study is the length of the limb, never square busts. The
  // 'arm' rule catches "arm sleeve"; a bare "sleeve"/"full sleeve" falls to
  // the portrait default, which is the same correct answer.
  it('routes sleeve placements portrait', () => {
    expect(routeGeneration({ prompt: 'x', bodyPart: 'arm sleeve' }).aspectRatio).toBe('9:16');
    expect(routeGeneration({ prompt: 'x', bodyPart: 'full sleeve' }).aspectRatio).toBe('9:16');
    expect(routeGeneration({ prompt: 'x', bodyPart: 'leg sleeve' }).aspectRatio).toBe('9:16');
  });

  // Style tags are ontology ids ("new-school"); STYLE_MODEL_MAPPING is keyed
  // camelCase ("newSchool"). Lowercasing alone never bridged that, so these
  // fell through to flux-dev against ADR-0023's routing table.
  it('routes hyphenated ontology style ids to their mapped model', () => {
    expect(routeGeneration({ prompt: 'x', style: 'new-school' }).modelId).toBe('krea2');
    expect(routeGeneration({ prompt: 'x', style: 'newSchool' }).modelId).toBe('krea2');
    expect(routeGeneration({ prompt: 'x', style: 'neo-traditional' }).modelId).toBe('flux-dev');
    expect(routeGeneration({ prompt: 'x', style: 'anime' }).modelId).toBe('krea2');
  });

  it('finds the meaningful mapped style anywhere in the intake tag list', () => {
    expect(routeGeneration({ prompt: 'x', style: ['color', 'anime'] }).modelId).toBe('krea2');
    expect(routeGeneration({ prompt: 'x', style: ['illustrative', 'new-school'] }).modelId).toBe('krea2');
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

  // Pinned sessions store the RESOLVED catalog id (ADR-0016), so the loud
  // downgrade (ADR-0048) resolves chains from that form too.
  describe('fallbackChainForModelId', () => {
    it('resolves a pinned catalog id to its config chain', () => {
      expect(fallbackChainForModelId('nano-banana-2')).toEqual(['flux-dev', 'flux-schnell']);
      expect(fallbackChainForModelId('krea2')).toEqual(['flux-dev', 'flux-schnell']);
    });

    it('accepts config keys and excludes the model itself', () => {
      expect(fallbackChainForModelId('flux_dev')).toEqual(['flux-schnell', 'krea2']);
      expect(fallbackChainForModelId('flux-dev')).not.toContain('flux-dev');
    });

    it('returns an empty chain for unknown ids rather than guessing', () => {
      expect(fallbackChainForModelId('no-such-model')).toEqual([]);
    });
  });
});

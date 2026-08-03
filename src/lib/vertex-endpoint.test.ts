import { describe, it, expect, afterEach } from 'vitest';
import {
  buildVertexEndpoint,
  isGlobalOnlyModel,
  vertexRegion,
} from './vertex-endpoint';

const ORIGINAL_REGION = process.env.GCP_REGION;

afterEach(() => {
  if (ORIGINAL_REGION === undefined) delete process.env.GCP_REGION;
  else process.env.GCP_REGION = ORIGINAL_REGION;
});

describe('isGlobalOnlyModel', () => {
  it('treats the Gemini 3.x family as global-only', () => {
    expect(isGlobalOnlyModel('gemini-3.1-flash-lite')).toBe(true);
    expect(isGlobalOnlyModel('gemini-3.1-flash-lite-image')).toBe(true);
    expect(isGlobalOnlyModel('gemini-3.5-flash')).toBe(true);
    expect(isGlobalOnlyModel('gemini-3-pro-image')).toBe(true);
  });

  it('leaves the regional families alone', () => {
    expect(isGlobalOnlyModel('gemini-2.5-flash-lite')).toBe(false);
    expect(isGlobalOnlyModel('gemini-2.5-flash-image')).toBe(false);
    expect(isGlobalOnlyModel('imagen-3.0-generate-002')).toBe(false);
  });

  it('matches dated and preview suffixes without a per-variant entry', () => {
    expect(isGlobalOnlyModel('gemini-3.1-flash-image-preview')).toBe(true);
  });
});

describe('buildVertexEndpoint', () => {
  it('routes Gemini 3.x to the global host and location', () => {
    process.env.GCP_REGION = 'us-central1';
    expect(buildVertexEndpoint('tatt-pro', 'gemini-3.1-flash-lite')).toBe(
      'https://aiplatform.googleapis.com/v1/projects/tatt-pro/locations/global' +
        '/publishers/google/models/gemini-3.1-flash-lite:generateContent'
    );
  });

  it('ignores GCP_REGION for global-only models', () => {
    process.env.GCP_REGION = 'europe-west4';
    const url = buildVertexEndpoint('tatt-pro', 'gemini-3.1-flash-lite-image');
    expect(url).not.toContain('europe-west4');
    expect(url).toContain('/locations/global/');
  });

  it('keeps the regional host for the Gemini 2.5 family', () => {
    process.env.GCP_REGION = 'us-central1';
    expect(buildVertexEndpoint('tatt-pro', 'gemini-2.5-flash-lite')).toBe(
      'https://us-central1-aiplatform.googleapis.com/v1/projects/tatt-pro' +
        '/locations/us-central1/publishers/google/models/gemini-2.5-flash-lite:generateContent'
    );
  });

  it('honours GCP_REGION for regional models', () => {
    process.env.GCP_REGION = 'europe-west4';
    const url = buildVertexEndpoint('tatt-pro', 'gemini-2.5-flash');
    expect(url).toContain('https://europe-west4-aiplatform.googleapis.com');
    expect(url).toContain('/locations/europe-west4/');
  });

  it('supports the predict verb Imagen uses', () => {
    process.env.GCP_REGION = 'us-central1';
    expect(
      buildVertexEndpoint('tatt-pro', 'imagen-3.0-generate-002', 'predict')
    ).toContain('imagen-3.0-generate-002:predict');
  });

  it('defaults the region to us-central1', () => {
    delete process.env.GCP_REGION;
    expect(vertexRegion()).toBe('us-central1');
  });

  it('names the missing config instead of building projects/null/...', () => {
    expect(() => buildVertexEndpoint(null, 'gemini-2.5-flash')).toThrow(
      /Vertex project id is not configured/
    );
    expect(() => buildVertexEndpoint(undefined, 'gemini-3.1-flash-lite')).toThrow(
      /Vertex project id is not configured/
    );
    expect(() => buildVertexEndpoint('', 'gemini-2.5-flash')).toThrow(
      /Vertex project id is not configured/
    );
  });
});

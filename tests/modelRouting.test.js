/**
 * Multi-Model Routing Tests
 *
 * Validates model selection and fallback behavior.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  selectOptimalModel,
  getModelCapabilities,
  selectModelWithFallback,
  clearModelCache
} from '../src/utils/styleModelMapping.js';

describe('modelRouting', () => {
  beforeEach(() => {
    clearModelCache();
  });

  it('selects a model for a known style', () => {
    const result = selectOptimalModel('traditional', 'moderate', 'forearm');
    expect(result.modelId).toBeTruthy();
    expect(result.modelName).toBeTruthy();
  });

  it('returns capabilities for a known model', () => {
    const capabilities = getModelCapabilities('imagen3');
    expect(capabilities).toBeTruthy();
    expect(capabilities.id).toBe('imagen3');
    expect(Array.isArray(capabilities.strengths)).toBe(true);
  });

  it('selects a fallback model when needed', async () => {
    const result = await selectModelWithFallback('anime', 'Goku and Vegeta fighting', 'back');
    expect(result.modelId).toBeTruthy();
    expect(result.isFallback).toBeDefined();
  });
});

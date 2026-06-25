/**
 * Stencil Service Feature Tests
 *
 * Tests exports, size presets, style presets, and processing function existence
 * from the features/stencil path.
 */

import { describe, it, expect } from 'vitest';
import {
  STENCIL_SIZES,
  STYLE_PRESETS,
  convertToStencil,
  resizeToStencilSize,
  generateStencil,
  generateStencilPDF,
  downloadStencil
} from '../src/features/stencil/services/stencilService';

describe('Stencil Service (features)', () => {
  describe('STENCIL_SIZES', () => {
    it('should define small, medium, large, and xlarge presets', () => {
      expect(STENCIL_SIZES).toHaveProperty('small');
      expect(STENCIL_SIZES).toHaveProperty('medium');
      expect(STENCIL_SIZES).toHaveProperty('large');
      expect(STENCIL_SIZES).toHaveProperty('xlarge');
    });

    it('should have correct 300 DPI pixel calculations', () => {
      expect(STENCIL_SIZES.small.pixels).toBe(4 * 300);
      expect(STENCIL_SIZES.medium.pixels).toBe(6 * 300);
      expect(STENCIL_SIZES.large.pixels).toBe(8 * 300);
      expect(STENCIL_SIZES.xlarge.pixels).toBe(10 * 300);
    });

    it('should have increasing inch values', () => {
      const sizes = [
        STENCIL_SIZES.small.inches,
        STENCIL_SIZES.medium.inches,
        STENCIL_SIZES.large.inches,
        STENCIL_SIZES.xlarge.inches
      ];
      for (let i = 1; i < sizes.length; i++) {
        expect(sizes[i]).toBeGreaterThan(sizes[i - 1]);
      }
    });

    it('each preset should have name, inches, pixels, and description', () => {
      Object.values(STENCIL_SIZES).forEach((size) => {
        expect(typeof size.name).toBe('string');
        expect(typeof size.inches).toBe('number');
        expect(typeof size.pixels).toBe('number');
        expect(typeof size.description).toBe('string');
      });
    });
  });

  describe('STYLE_PRESETS', () => {
    it('should define traditional, fineline, blackwork, dotwork, and balanced', () => {
      expect(STYLE_PRESETS).toHaveProperty('traditional');
      expect(STYLE_PRESETS).toHaveProperty('fineline');
      expect(STYLE_PRESETS).toHaveProperty('blackwork');
      expect(STYLE_PRESETS).toHaveProperty('dotwork');
      expect(STYLE_PRESETS).toHaveProperty('balanced');
    });

    it('each preset should have name, threshold, contrast, brightness, and description', () => {
      Object.values(STYLE_PRESETS).forEach((preset) => {
        expect(typeof preset.name).toBe('string');
        expect(typeof preset.threshold).toBe('number');
        expect(typeof preset.contrast).toBe('number');
        expect(typeof preset.brightness).toBe('number');
        expect(typeof preset.description).toBe('string');
      });
    });

    it('blackwork should have the highest contrast', () => {
      const contrasts = Object.values(STYLE_PRESETS).map((p) => p.contrast);
      expect(STYLE_PRESETS.blackwork.contrast).toBe(Math.max(...contrasts));
    });
  });

  describe('Exported processing functions', () => {
    it('should export convertToStencil as a function', () => {
      expect(typeof convertToStencil).toBe('function');
    });

    it('should export resizeToStencilSize as a function', () => {
      expect(typeof resizeToStencilSize).toBe('function');
    });

    it('should export generateStencil as a function', () => {
      expect(typeof generateStencil).toBe('function');
    });

    it('should export generateStencilPDF as a function', () => {
      expect(typeof generateStencilPDF).toBe('function');
    });

    it('should export downloadStencil as a function', () => {
      expect(typeof downloadStencil).toBe('function');
    });
  });
});

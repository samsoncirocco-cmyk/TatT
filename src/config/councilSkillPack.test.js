import { describe, it, expect } from 'vitest';
import { COUNCIL_SKILL_PACK } from './councilSkillPack';

describe('COUNCIL_SKILL_PACK Configuration', () => {
  describe('Structure Validation', () => {
    it('should have all required top-level keys', () => {
      expect(COUNCIL_SKILL_PACK).toHaveProperty('negativeShield');
      expect(COUNCIL_SKILL_PACK).toHaveProperty('anatomicalFlow');
      expect(COUNCIL_SKILL_PACK).toHaveProperty('aestheticAnchors');
      expect(COUNCIL_SKILL_PACK).toHaveProperty('positionalInstructions');
      expect(COUNCIL_SKILL_PACK).toHaveProperty('spatialKeywords');
      expect(COUNCIL_SKILL_PACK).toHaveProperty('stencilKeywords');
    });

    it('should have negativeShield as non-empty string', () => {
      expect(typeof COUNCIL_SKILL_PACK.negativeShield).toBe('string');
      expect(COUNCIL_SKILL_PACK.negativeShield.length).toBeGreaterThan(0);
    });

    it('should have aestheticAnchors as non-empty string', () => {
      expect(typeof COUNCIL_SKILL_PACK.aestheticAnchors).toBe('string');
      expect(COUNCIL_SKILL_PACK.aestheticAnchors.length).toBeGreaterThan(0);
    });

    it('should have positionalInstructions as non-empty string', () => {
      expect(typeof COUNCIL_SKILL_PACK.positionalInstructions).toBe('string');
      expect(COUNCIL_SKILL_PACK.positionalInstructions.length).toBeGreaterThan(0);
    });
  });

  describe('Anatomical Flow Configuration', () => {
    const expectedBodyParts = ['forearm', 'shin', 'chest', 'back', 'shoulder', 'hip'];

    it('should have configurations for all expected body parts', () => {
      expectedBodyParts.forEach(bodyPart => {
        expect(COUNCIL_SKILL_PACK.anatomicalFlow).toHaveProperty(bodyPart);
      });
    });

    it('should have non-empty flow descriptions for all body parts', () => {
      expectedBodyParts.forEach(bodyPart => {
        const flow = COUNCIL_SKILL_PACK.anatomicalFlow[bodyPart];
        expect(typeof flow).toBe('string');
        expect(flow.length).toBeGreaterThan(0);
      });
    });

    it('should use consistent terminology for similar body parts', () => {
      // Vertical limbs should share similar terminology
      const forearm = COUNCIL_SKILL_PACK.anatomicalFlow.forearm;
      const shin = COUNCIL_SKILL_PACK.anatomicalFlow.shin;
      expect(forearm).toContain('vertical flow');
      expect(shin).toContain('vertical flow');
    });

    it('should use radial composition for joints', () => {
      const shoulder = COUNCIL_SKILL_PACK.anatomicalFlow.shoulder;
      const hip = COUNCIL_SKILL_PACK.anatomicalFlow.hip;
      expect(shoulder).toContain('radial composition');
      expect(hip).toContain('radial composition');
    });
  });

  describe('Spatial Keywords', () => {
    it('should be an array', () => {
      expect(Array.isArray(COUNCIL_SKILL_PACK.spatialKeywords)).toBe(true);
    });

    it('should contain essential spatial keywords', () => {
      const required = ['left', 'right', 'background', 'foreground'];
      required.forEach(keyword => {
        expect(COUNCIL_SKILL_PACK.spatialKeywords).toContain(keyword);
      });
    });

    it('should have all lowercase keywords', () => {
      COUNCIL_SKILL_PACK.spatialKeywords.forEach(keyword => {
        expect(keyword).toBe(keyword.toLowerCase());
      });
    });
  });

  describe('Stencil Keywords', () => {
    it('should be an array', () => {
      expect(Array.isArray(COUNCIL_SKILL_PACK.stencilKeywords)).toBe(true);
    });

    it('should contain essential stencil-related keywords', () => {
      const required = ['stencil', 'linework', 'blackwork'];
      required.forEach(keyword => {
        expect(COUNCIL_SKILL_PACK.stencilKeywords).toContain(keyword);
      });
    });

    it('should have all lowercase keywords', () => {
      COUNCIL_SKILL_PACK.stencilKeywords.forEach(keyword => {
        expect(keyword).toBe(keyword.toLowerCase());
      });
    });
  });

  describe('Negative Shield Prompt', () => {
    it('should contain key anti-patterns for stencil mode', () => {
      const shield = COUNCIL_SKILL_PACK.negativeShield.toLowerCase();
      expect(shield).toContain('shading');
      expect(shield).toContain('gradients');
      expect(shield).toContain('shadows');
    });

    it('should use weight modifiers correctly', () => {
      // Should contain weight syntax like (word: 1.5)
      expect(COUNCIL_SKILL_PACK.negativeShield).toMatch(/:\s*1\.\d+/);
    });
  });
});

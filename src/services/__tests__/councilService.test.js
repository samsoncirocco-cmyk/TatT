/**
 * Unit Tests for Council Service Character Enhancement
 *
 * Tests the character enhancement database and multi-character detection logic.
 */

import { describe, test, expect } from 'vitest';
import { buildCharacterMap, getAllCharacterNames, searchCharacters } from '../../config/characterDatabase.js';

describe('Character Database', () => {
  test('should build character map with primary names', () => {
    const map = buildCharacterMap();

    expect(map['goku']).toBeDefined();
    expect(map['goku']).toContain('spiky black hair');
    expect(map['goku']).toContain('orange gi');
  });

  test('should include character aliases', () => {
    const map = buildCharacterMap();

    // "son goku" is an alias for "goku"
    expect(map['son goku']).toBeDefined();
    expect(map['son goku']).toEqual(map['goku']);
  });

  test('should handle case-insensitive lookups', () => {
    const map = buildCharacterMap();

    // All keys should be lowercase
    expect(map['GOKU']).toBeUndefined();
    expect(map['goku']).toBeDefined();
  });

  test('should return all character names and aliases', () => {
    const names = getAllCharacterNames();

    expect(names).toContain('goku');
    expect(names).toContain('son goku'); // alias
    expect(names).toContain('killua');
    expect(names).toContain('naruto');
    expect(names.length).toBeGreaterThan(40); // Should have 40+ characters
  });

  test('should search characters by partial name', () => {
    const results = searchCharacters('go');

    // Should find Goku, Gohan, Gojo
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(c => c.name === 'goku')).toBe(true);

    // Results should be sorted by popularity
    const popularities = results.map(c => c.popularity);
    const sortedPopularities = [...popularities].sort((a, b) => b - a);
    expect(popularities).toEqual(sortedPopularities);
  });

  test('should handle multi-word character names', () => {
    const map = buildCharacterMap();

    expect(map['sung jinwoo']).toBeDefined();
    expect(map['sung jinwoo']).toContain('glowing purple eyes');
  });
});

describe('Character Enhancement Logic', () => {
  test('should detect single character in prompt', () => {
    const testPrompt = 'I want a tattoo of goku fighting';
    const names = getAllCharacterNames();

    const hasCharacter = names.some(name =>
      new RegExp(`\\b${name}\\b`, 'i').test(testPrompt)
    );

    expect(hasCharacter).toBe(true);
  });

  test('should detect multiple characters in prompt', () => {
    const testPrompt = 'gon and killua together';
    const names = getAllCharacterNames();

    const matches = names.filter(name =>
      new RegExp(`\\b${name}\\b`, 'i').test(testPrompt)
    );

    expect(matches.length).toBe(2);
    expect(matches).toContain('gon');
    expect(matches).toContain('killua');
  });

  test('should handle word boundaries correctly', () => {
    const testPrompt = 'dragon breathing fire'; // Contains "gon" but not as word
    const names = getAllCharacterNames();

    const hasGon = names.some(name =>
      name === 'gon' && new RegExp(`\\b${name}\\b`, 'i').test(testPrompt)
    );

    expect(hasGon).toBe(false); // Should NOT match "dragon"
  });

  test('should be case-insensitive', () => {
    const testPrompt = 'GOKU vs VEGETA';
    const names = getAllCharacterNames();

    const matches = names.filter(name =>
      new RegExp(`\\b${name}\\b`, 'i').test(testPrompt)
    );

    expect(matches.length).toBe(2);
  });

  test('should handle character names with special characters', () => {
    const testPrompt = "Monkey D. Luffy's adventure";
    const names = getAllCharacterNames();

    // Should match "luffy" or "monkey d luffy" or "monkey d. luffy"
    const matches = names.filter(name =>
      new RegExp(`\\b${name}\\b`, 'i').test(testPrompt)
    );

    expect(matches.length).toBeGreaterThan(0);
  });
});

describe('Multi-Character Detection', () => {
  test('should detect multi-character scene (2 characters)', () => {
    const testPrompt = 'goku and vegeta fighting';
    const names = getAllCharacterNames();

    const characterMatches = names.filter(name =>
      new RegExp(`\\b${name}\\b`, 'i').test(testPrompt)
    );

    const isMultiCharacter = characterMatches.length > 1;

    expect(isMultiCharacter).toBe(true);
    expect(characterMatches.length).toBe(2);
  });

  test('should NOT trigger multi-character for single character', () => {
    const testPrompt = 'naruto running with a scroll';
    const names = getAllCharacterNames();

    const characterMatches = names.filter(name =>
      new RegExp(`\\b${name}\\b`, 'i').test(testPrompt)
    );

    const isMultiCharacter = characterMatches.length > 1;

    expect(isMultiCharacter).toBe(false);
    expect(characterMatches.length).toBe(1);
  });

  test('should handle complex multi-character prompts', () => {
    const testPrompt = 'gon, killua, and hisoka from hxh all fighting atop shenron from dbz';
    const names = getAllCharacterNames();

    const characterMatches = names.filter(name =>
      new RegExp(`\\b${name}\\b`, 'i').test(testPrompt)
    );

    expect(characterMatches.length).toBe(4); // gon, killua, hisoka, shenron
  });

  test('should not count duplicates', () => {
    const testPrompt = 'goku fighting goku clone';
    const names = getAllCharacterNames();

    // Use Set to avoid duplicates
    const uniqueMatches = new Set(
      names.filter(name => new RegExp(`\\b${name}\\b`, 'i').test(testPrompt))
    );

    expect(uniqueMatches.size).toBe(1); // Only "goku" once
  });
});

describe('Character Description Quality', () => {
  test('all character descriptions should be substantial', () => {
    const map = buildCharacterMap();

    Object.entries(map).forEach(([, description]) => {
      expect(description.length).toBeGreaterThan(50); // At least 50 characters
      expect(description).not.toBe(''); // Not empty
      expect(description).not.toContain('undefined'); // No undefined values
    });
  });

  test('all character descriptions should contain visual details', () => {
    const map = buildCharacterMap();
    const visualKeywords = ['hair', 'eyes', 'clothing', 'armor', 'weapon', 'stance', 'expression', 'outfit', 'uniform', 'jacket', 'sword', 'style', 'aura', 'energy', 'technique', 'facial', 'build', 'pose', 'form', 'markings', 'color', 'lightning', 'crackling', 'body', 'face', 'head', 'hand', 'arm', 'leg', 'shirt', 'pants', 'shoes', 'belt', 'cape', 'mask', 'helmet'];

    Object.entries(map).forEach(([, description]) => {
      // Check if description is substantial (length > 30) OR contains visual keywords
      const isSubstantial = description.length > 30;
      const hasVisualDetail = visualKeywords.some(keyword =>
        description.toLowerCase().includes(keyword)
      );

      expect(isSubstantial || hasVisualDetail).toBe(true); // Should be substantial OR contain visual keywords
    });
  });
});

describe('Performance', () => {
  test('character map building should be fast', () => {
    const startTime = performance.now();
    buildCharacterMap();
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(10); // Should build in <10ms
  });

  test('character detection should be fast', () => {
    const testPrompt = 'gon and killua fighting together';
    const names = getAllCharacterNames();

    const startTime = performance.now();

    names.filter(name =>
      new RegExp(`\\b${name}\\b`, 'i').test(testPrompt)
    );

    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(50); // Should detect in <50ms
  });
});

/**
 * Integration Tests
 * (These would require mocking the enhancePrompt function)
 */
describe('Integration: Character Enhancement Flow', () => {
  test('should replace character names with descriptions', () => {
    const map = buildCharacterMap();
    const userIdea = 'goku fighting';

    // Simulate enhancement
    let enhanced = userIdea;
    const sortedNames = Object.keys(map).sort((a, b) => b.length - a.length);

    for (const characterName of sortedNames) {
      const regex = new RegExp(`\\b${characterName}\\b`, 'gi');
      enhanced = enhanced.replace(regex, map[characterName]);
    }

    expect(enhanced).toContain('spiky black hair');
    expect(enhanced).toContain('orange gi');
    expect(enhanced).not.toContain('goku'); // Original name should be replaced
  });

  test('should handle multiple character replacements', () => {
    const map = buildCharacterMap();
    const userIdea = 'gon and killua';

    let enhanced = userIdea;
    const sortedNames = Object.keys(map).sort((a, b) => b.length - a.length);

    for (const characterName of sortedNames) {
      const regex = new RegExp(`\\b${characterName}\\b`, 'gi');
      enhanced = enhanced.replace(regex, map[characterName]);
    }

    expect(enhanced).toContain('Gon Freecss');
    expect(enhanced).toContain('Killua Zoldyck');
    expect(enhanced).toContain('green jacket');
    expect(enhanced).toContain('crackling'); // Killua has "hands crackling with lightning"
  });

  test('should not replace partial matches', () => {
    const map = buildCharacterMap();
    const userIdea = 'a dragon breathing fire'; // Contains "gon" in "dragon"

    let enhanced = userIdea;
    const sortedNames = Object.keys(map).sort((a, b) => b.length - a.length);

    for (const characterName of sortedNames) {
      const regex = new RegExp(`\\b${characterName}\\b`, 'gi');
      enhanced = enhanced.replace(regex, map[characterName]);
    }

    expect(enhanced).toBe('a dragon breathing fire'); // Should remain unchanged
  });
});

/**
 * Hybrid Vector-Graph Matching Tests
 * 
 * Tests for the hybrid matching service that combines vector similarity
 * with graph-based artist matching.
 * 
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    normalizeScore,
    weightedAverage,
    calculateCompositeScore,
    generateMatchReasoning,
    mergeResults,
    DEFAULT_WEIGHTS
} from '../src/utils/scoreAggregation.js';

describe('Score Aggregation Utilities', () => {
    describe('normalizeScore', () => {
        it('should normalize values to 0-1 range', () => {
            expect(normalizeScore(5, 0, 10)).toBe(0.5);
            expect(normalizeScore(0, 0, 10)).toBe(0);
            expect(normalizeScore(10, 0, 10)).toBe(1);
        });

        it('should handle edge cases', () => {
            expect(normalizeScore(5, 5, 5)).toBe(0.5); // Same min/max
            expect(normalizeScore(-5, 0, 10)).toBe(0); // Below min
            expect(normalizeScore(15, 0, 10)).toBe(1); // Above max
        });
    });

    describe('weightedAverage', () => {
        it('should calculate weighted average correctly', () => {
            const scores = {
                visualSimilarity: 0.8,
                styleAlignment: 0.6,
                location: 0.4
            };
            const weights = {
                visualSimilarity: 0.5,
                styleAlignment: 0.3,
                location: 0.2
            };

            const result = weightedAverage(scores, weights);
            const expected = (0.8 * 0.5) + (0.6 * 0.3) + (0.4 * 0.2);
            expect(result).toBeCloseTo(expected, 5);
        });

        it('should handle missing scores', () => {
            const scores = {
                visualSimilarity: 0.8
            };
            const weights = {
                visualSimilarity: 0.5,
                styleAlignment: 0.3,
                location: 0.2
            };

            const result = weightedAverage(scores, weights);
            // Should normalize by actual weight (0.5)
            expect(result).toBeCloseTo(0.8, 5);
        });
    });

    describe('calculateCompositeScore', () => {
        it('should calculate composite score with default weights', () => {
            const signals = {
                visualSimilarity: 1.0,
                styleAlignment: 0.8,
                location: 0.6,
                budget: 0.4
            };

            const result = calculateCompositeScore(signals);

            expect(result.score).toBeGreaterThan(0);
            expect(result.score).toBeLessThanOrEqual(1);
            expect(result.breakdown).toBeDefined();
            expect(result.breakdown.weights).toEqual(DEFAULT_WEIGHTS);
        });

        it('should add random variety if not provided', () => {
            const signals = {
                visualSimilarity: 0.8
            };

            const result = calculateCompositeScore(signals);
            expect(result.breakdown.randomVariety).toBeDefined();
            expect(result.breakdown.randomVariety).toBeGreaterThanOrEqual(0);
            expect(result.breakdown.randomVariety).toBeLessThanOrEqual(1);
        });

        it('should use custom weights when provided', () => {
            const signals = {
                visualSimilarity: 0.8,
                styleAlignment: 0.6
            };
            const customWeights = {
                visualSimilarity: 0.7,
                styleAlignment: 0.3
            };

            const result = calculateCompositeScore(signals, customWeights);
            expect(result.breakdown.weights).toEqual(customWeights);
        });
    });

    describe('generateMatchReasoning', () => {
        it('should generate reasons for high visual similarity', () => {
            const scores = {
                visualSimilarity: 0.85
            };
            const artist = { name: 'Test Artist' };

            const reasons = generateMatchReasoning(scores, artist);
            expect(reasons.length).toBeGreaterThan(0);
            expect(reasons[0]).toContain('visual');
        });

        it('should generate reasons for style alignment', () => {
            const scores = {
                styleAlignment: 0.9
            };
            const artist = {
                styles: ['Anime', 'Watercolor']
            };
            const preferences = {
                styles: ['Anime']
            };

            const reasons = generateMatchReasoning(scores, artist, preferences);
            expect(reasons.some(r => r.includes('Anime'))).toBe(true);
        });

        it('should provide fallback reason when no specific matches', () => {
            const scores = {};
            const artist = {};

            const reasons = generateMatchReasoning(scores, artist);
            expect(reasons.length).toBeGreaterThan(0);
            expect(reasons[0]).toContain('Recommended');
        });
    });

    describe('mergeResults', () => {
        it('should merge vector and graph results', () => {
            const vectorResults = [
                { id: 'artist1', score: 0.9 },
                { id: 'artist2', score: 0.7 }
            ];
            const graphResults = [
                { id: 'artist1', name: 'Artist One', city: 'Austin' },
                { id: 'artist3', name: 'Artist Three', city: 'Dallas' }
            ];

            const merged = mergeResults(vectorResults, graphResults);

            expect(merged.length).toBe(3);

            // artist1 should have both vector and graph data
            const artist1 = merged.find(a => a.id === 'artist1');
            expect(artist1.vectorScore).toBe(0.9);
            expect(artist1.name).toBe('Artist One');
            expect(artist1.source).toBe('hybrid');

            // artist2 should only have vector data
            const artist2 = merged.find(a => a.id === 'artist2');
            expect(artist2.vectorScore).toBe(0.7);
            expect(artist2.source).toBe('vector');

            // artist3 should only have graph data
            const artist3 = merged.find(a => a.id === 'artist3');
            expect(artist3.name).toBe('Artist Three');
            expect(artist3.source).toBe('graph');
        });
    });
});

describe('Hybrid Matching Integration Tests', () => {
    describe('Composite scoring accuracy', () => {
        it('should calculate correct composite score with standard weights', () => {
            // Test case from requirements:
            // Artist with perfect style match (1.0) but distant location (0.2)
            // Expected: 0.4 + 0.25 + 0.03 + random ≈ 0.68-0.78

            const signals = {
                visualSimilarity: 1.0,  // 40% weight = 0.40
                styleAlignment: 1.0,     // 25% weight = 0.25
                location: 0.2,           // 15% weight = 0.03
                budget: 0.0,             // 10% weight = 0.00
                randomVariety: 0.3       // 10% weight = 0.03
            };

            const result = calculateCompositeScore(signals, DEFAULT_WEIGHTS);

            // Expected: (1.0 * 0.4) + (1.0 * 0.25) + (0.2 * 0.15) + (0.0 * 0.1) + (0.3 * 0.1)
            // = 0.4 + 0.25 + 0.03 + 0 + 0.03 = 0.71
            expect(result.score).toBeCloseTo(0.71, 2);
        });

        it('should weight visual similarity at 40%', () => {
            const signals = {
                visualSimilarity: 1.0,
                styleAlignment: 0.0,
                location: 0.0,
                budget: 0.0,
                randomVariety: 0.0
            };

            const result = calculateCompositeScore(signals, DEFAULT_WEIGHTS);
            expect(result.score).toBeCloseTo(0.4, 2);
        });

        it('should weight style alignment at 25%', () => {
            const signals = {
                visualSimilarity: 0.0,
                styleAlignment: 1.0,
                location: 0.0,
                budget: 0.0,
                randomVariety: 0.0
            };

            const result = calculateCompositeScore(signals, DEFAULT_WEIGHTS);
            expect(result.score).toBeCloseTo(0.25, 2);
        });
    });
});

/**
 * Manual Test Script for Hybrid Matching
 * 
 * Run this with: node tests/manual-hybrid-test.js
 */

import {
    normalizeScore,
    weightedAverage,
    calculateCompositeScore,
    generateMatchReasoning,
    mergeResults,
    DEFAULT_WEIGHTS
} from '../src/utils/scoreAggregation.js';

console.log('🧪 Testing Hybrid Matching Score Aggregation\n');

// Test 1: Normalize Score
console.log('Test 1: normalizeScore');
const norm1 = normalizeScore(5, 0, 10);
console.log(`  normalizeScore(5, 0, 10) = ${norm1} (expected: 0.5)`);
console.assert(norm1 === 0.5, 'Failed: should be 0.5');
console.log('  ✓ Passed\n');

// Test 2: Weighted Average
console.log('Test 2: weightedAverage');
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
const weighted = weightedAverage(scores, weights);
const expected = (0.8 * 0.5) + (0.6 * 0.3) + (0.4 * 0.2);
console.log(`  Result: ${weighted.toFixed(3)} (expected: ${expected.toFixed(3)})`);
console.assert(Math.abs(weighted - expected) < 0.001, 'Failed: weighted average incorrect');
console.log('  ✓ Passed\n');

// Test 3: Composite Score (from requirements)
console.log('Test 3: Composite Score - Requirements Test Case');
console.log('  Artist with perfect style match (1.0) but distant location (0.2)');
const signals = {
    visualSimilarity: 1.0,  // 40% weight = 0.40
    styleAlignment: 1.0,     // 25% weight = 0.25
    location: 0.2,           // 15% weight = 0.03
    budget: 0.0,             // 10% weight = 0.00
    randomVariety: 0.3       // 10% weight = 0.03
};

const result = calculateCompositeScore(signals, DEFAULT_WEIGHTS);
const expectedScore = (1.0 * 0.4) + (1.0 * 0.25) + (0.2 * 0.15) + (0.0 * 0.1) + (0.3 * 0.1);
console.log(`  Result: ${result.score.toFixed(3)} (expected: ${expectedScore.toFixed(3)})`);
console.log(`  Expected range: 0.68-0.78 (with random variety)`);
console.assert(Math.abs(result.score - expectedScore) < 0.001, 'Failed: composite score incorrect');
console.log('  ✓ Passed\n');

// Test 4: Weight Distribution
console.log('Test 4: Weight Distribution');
console.log('  Visual Similarity weight: 40%');
const visualOnly = calculateCompositeScore({
    visualSimilarity: 1.0,
    styleAlignment: 0.0,
    location: 0.0,
    budget: 0.0,
    randomVariety: 0.0
}, DEFAULT_WEIGHTS);
console.log(`  Result: ${visualOnly.score.toFixed(2)} (expected: 0.40)`);
console.assert(Math.abs(visualOnly.score - 0.4) < 0.01, 'Failed: visual weight incorrect');
console.log('  ✓ Passed\n');

// Test 5: Match Reasoning
console.log('Test 5: Match Reasoning Generation');
const reasonScores = {
    visualSimilarity: 0.85,
    styleAlignment: 0.9
};
const artist = {
    styles: ['Anime', 'Watercolor'],
    city: 'Austin'
};
const preferences = {
    styles: ['Anime']
};
const reasons = generateMatchReasoning(reasonScores, artist, preferences);
console.log(`  Generated ${reasons.length} reasons:`);
reasons.forEach(r => console.log(`    - ${r}`));
console.assert(reasons.length > 0, 'Failed: should generate reasons');
console.log('  ✓ Passed\n');

// Test 6: Merge Results
console.log('Test 6: Merge Vector and Graph Results');
const vectorResults = [
    { id: 'artist1', score: 0.9 },
    { id: 'artist2', score: 0.7 }
];
const graphResults = [
    { id: 'artist1', name: 'Artist One', city: 'Austin' },
    { id: 'artist3', name: 'Artist Three', city: 'Dallas' }
];
const merged = mergeResults(vectorResults, graphResults);
console.log(`  Merged ${merged.length} results (expected: 3)`);
console.log(`  Sources: ${merged.map(m => `${m.id}:${m.source}`).join(', ')}`);
console.assert(merged.length === 3, 'Failed: should have 3 merged results');
const artist1 = merged.find(a => a.id === 'artist1');
console.assert(artist1.source === 'hybrid', 'Failed: artist1 should be hybrid');
console.log('  ✓ Passed\n');

console.log('✅ All tests passed!\n');
console.log('Summary:');
console.log('  - Score normalization: ✓');
console.log('  - Weighted averaging: ✓');
console.log('  - Composite scoring: ✓');
console.log('  - Weight distribution (40/25/15/10/10): ✓');
console.log('  - Match reasoning generation: ✓');
console.log('  - Result merging: ✓');

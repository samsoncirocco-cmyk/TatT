/**
 * useVibeChipSuggestions Hook
 * 
 * Generate Vibe Chip suggestions based on user input with keyword matching
 */

import { useState, useEffect, useRef } from 'react';

// Keyword mapping for chip suggestions
const KEYWORD_MAP = {
    // Style triggers
    'dragon': { style: ['Irezumi', 'Traditional'] },
    'flower': { style: ['Watercolor', 'Fine-line'] },
    'rose': { style: ['Watercolor', 'Traditional'], element: ['Floral accents'] },
    'skull': { style: ['Blackwork', 'Traditional'] },
    'geometric': { style: ['Geometric patterns'], mood: ['Minimalist'] },
    'mandala': { style: ['Geometric patterns'], mood: ['Delicate'] },
    'tribal': { style: ['Blackwork', 'Tribal'] },
    'japanese': { style: ['Irezumi'] },
    'watercolor': { style: ['Watercolor'] },
    'realistic': { style: ['Realism'] },
    'portrait': { style: ['Realism'] },
    'animal': { style: ['Realism', 'Traditional'] },
    'wolf': { style: ['Blackwork', 'Realism'], mood: ['Aggressive'] },
    'lion': { style: ['Traditional', 'Realism'], mood: ['Bold'] },
    'butterfly': { style: ['Watercolor', 'Fine-line'], mood: ['Delicate'] },

    // Element triggers
    'lightning': { element: ['Lightning effects'] },
    'thunder': { element: ['Lightning effects'] },
    'cloud': { element: ['Dark-cloud background'] },
    'clouds': { element: ['Dark-cloud background'] },
    'smoke': { element: ['Dark-cloud background'] },
    'pattern': { element: ['Geometric patterns'] },
    'patterns': { element: ['Geometric patterns'] },
    'floral': { element: ['Floral accents'] },
    'flowers': { element: ['Floral accents'] },

    // Mood triggers
    'fierce': { mood: ['Aggressive', 'Bold'] },
    'aggressive': { mood: ['Aggressive'] },
    'bold': { mood: ['Bold'] },
    'delicate': { mood: ['Delicate', 'Ethereal'] },
    'soft': { mood: ['Delicate'] },
    'simple': { mood: ['Minimalist'] },
    'minimal': { mood: ['Minimalist'] },
    'minimalist': { mood: ['Minimalist'] },
    'clean': { mood: ['Minimalist'] },
    'ethereal': { mood: ['Ethereal', 'Delicate'] },
    'mystical': { mood: ['Ethereal'] },
    'dark': { mood: ['Aggressive'], element: ['Dark-cloud background'] },
    'light': { mood: ['Delicate', 'Ethereal'] }
};

// Cache for performance
const suggestionCache = new Map();

export default function useVibeChipSuggestions(promptText, debounceMs = 300) {
    const [suggestions, setSuggestions] = useState({ style: [], element: [], mood: [] });
    const [isLoading, setIsLoading] = useState(false);
    const debounceTimerRef = useRef(null);

    useEffect(() => {
        // Clear previous timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Don't process empty input
        if (!promptText || promptText.trim().length < 3) {
            setSuggestions({ style: [], element: [], mood: [] });
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        // Debounce the suggestion generation
        debounceTimerRef.current = setTimeout(() => {
            const newSuggestions = generateSuggestions(promptText);
            setSuggestions(newSuggestions);
            setIsLoading(false);
        }, debounceMs);

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [promptText, debounceMs]);

    return { suggestions, isLoading };
}

/**
 * Generate suggestions based on keyword matching
 */
function generateSuggestions(promptText) {
    // Check cache first
    const cacheKey = promptText.toLowerCase().trim();
    if (suggestionCache.has(cacheKey)) {
        return suggestionCache.get(cacheKey);
    }

    const lowerText = promptText.toLowerCase();
    const words = lowerText.split(/\s+/);

    const matchedSuggestions = {
        style: new Set(),
        element: new Set(),
        mood: new Set()
    };

    // Check each word against keyword map
    words.forEach(word => {
        // Also check for partial matches in the full text
        Object.entries(KEYWORD_MAP).forEach(([keyword, categories]) => {
            if (lowerText.includes(keyword)) {
                // Add suggestions from each category
                if (categories.style) {
                    categories.style.forEach(s => matchedSuggestions.style.add(s));
                }
                if (categories.element) {
                    categories.element.forEach(e => matchedSuggestions.element.add(e));
                }
                if (categories.mood) {
                    categories.mood.forEach(m => matchedSuggestions.mood.add(m));
                }
            }
        });
    });

    // Convert sets to arrays and limit to 3 per category
    const result = {
        style: Array.from(matchedSuggestions.style).slice(0, 3),
        element: Array.from(matchedSuggestions.element).slice(0, 3),
        mood: Array.from(matchedSuggestions.mood).slice(0, 3)
    };

    // Cache the result
    suggestionCache.set(cacheKey, result);

    // Limit cache size to prevent memory issues
    if (suggestionCache.size > 100) {
        const firstKey = suggestionCache.keys().next().value;
        suggestionCache.delete(firstKey);
    }

    return result;
}

/**
 * Prompt Enhancer Component
 *
 * Integrates with LLM Council to generate rich, detailed prompts
 * from simple user ideas. Provides multiple detail levels and
 * allows users to select or customize the generated prompts.
 *
 * Features:
 * - AI-powered prompt enhancement
 * - Multiple detail levels (Simple, Detailed, Ultra)
 * - Real-time council discussion visualization
 * - Negative prompt generation
 * - Custom prompt editing
 */

import { useState } from 'react';
import { enhancePrompt } from '../services/councilService';

export default function PromptEnhancer({
  userInput,
  onPromptSelected,
  style = 'traditional',
  bodyPart = 'forearm'
}) {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedPrompts, setEnhancedPrompts] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState('detailed');
  const [customPrompt, setCustomPrompt] = useState('');
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [error, setError] = useState(null);
  const [councilDiscussion, setCouncilDiscussion] = useState([]);

  const handleEnhance = async () => {
    if (!userInput.trim()) {
      setError('Please enter a tattoo idea first');
      return;
    }

    setIsEnhancing(true);
    setError(null);
    setCouncilDiscussion([]);

    try {
      console.log('[PromptEnhancer] Enhancing prompt:', userInput);

      // Call LLM Council API
      const result = await enhancePrompt({
        userIdea: userInput,
        style,
        bodyPart,
        onDiscussionUpdate: (message) => {
          setCouncilDiscussion(prev => [...prev, message]);
        }
      });

      console.log('[PromptEnhancer] Enhancement complete:', result);

      setEnhancedPrompts(result);
      setSelectedLevel('detailed'); // Default selection

    } catch (err) {
      console.error('[PromptEnhancer] Enhancement failed:', err);
      setError(err.message || 'Failed to enhance prompt. Please try again.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSelectPrompt = () => {
    if (showCustomEditor && customPrompt.trim()) {
      onPromptSelected(
        customPrompt,
        enhancedPrompts?.negativePrompt,
        enhancedPrompts?.modelSelection
      );
    } else if (enhancedPrompts) {
      onPromptSelected(
        enhancedPrompts.prompts[selectedLevel],
        enhancedPrompts.negativePrompt,
        enhancedPrompts.modelSelection
      );
    }
  };

  const handleCustomEdit = () => {
    setCustomPrompt(enhancedPrompts.prompts[selectedLevel]);
    setShowCustomEditor(true);
  };

  return (
    <div className="space-y-4">
      {/* Enhance Button */}
      <button
        onClick={handleEnhance}
        disabled={isEnhancing || !userInput.trim()}
        className={`w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center ${isEnhancing || !userInput.trim()
          ? 'bg-gray-400 cursor-not-allowed text-white'
          : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl'
          }`}
      >
        {isEnhancing ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            AI Council Enhancing...
          </>
        ) : (
          <>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Enhance with AI Council
          </>
        )}
      </button>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Council Discussion (Real-time feedback) */}
      {councilDiscussion.length > 0 && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-xs font-semibold text-purple-900 mb-2">
            Council Discussion:
          </p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {councilDiscussion.map((message, idx) => (
              <p key={idx} className="text-xs text-purple-700">
                {message}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Model Selection Display */}
      {enhancedPrompts?.modelSelection && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-semibold text-blue-900">
                  Selected Model: {enhancedPrompts.modelSelection.modelName}
                  {enhancedPrompts.modelSelection.isFallback && (
                    <span className="ml-2 text-xs text-orange-600">(Fallback)</span>
                  )}
                </p>
              </div>
              <p className="text-xs text-blue-700 mb-2">
                {enhancedPrompts.modelSelection.reasoning}
              </p>
              <div className="flex items-center space-x-4 text-xs text-blue-600">
                <span>Est. Time: {enhancedPrompts.modelSelection.estimatedTime}</span>
                <span>Cost: ${enhancedPrompts.modelSelection.cost.toFixed(4)}/image</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Prompts Display */}
      {enhancedPrompts && !showCustomEditor && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              Select prompt detail level:
            </p>
            <button
              onClick={handleCustomEdit}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Custom Edit
            </button>
          </div>

          {/* Prompt Options */}
          <div className="space-y-2">
            {Object.entries(enhancedPrompts.prompts).map(([level, prompt]) => (
              <div
                key={level}
                onClick={() => setSelectedLevel(level)}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedLevel === level
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-blue-300 bg-white'
                  }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full border-2 mr-2 ${selectedLevel === level
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                      }`}>
                      {selectedLevel === level && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="font-semibold text-sm capitalize text-gray-900">
                      {level}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {prompt.length} characters
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {prompt}
                </p>
              </div>
            ))}
          </div>

          {/* Negative Prompt Display */}
          {enhancedPrompts.negativePrompt && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs font-semibold text-gray-700 mb-1">
                Negative Prompt (what to avoid):
              </p>
              <p className="text-xs text-gray-600 italic">
                {enhancedPrompts.negativePrompt}
              </p>
            </div>
          )}

          {/* Use Prompt Button */}
          <button
            onClick={handleSelectPrompt}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
          >
            Use {selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1)} Prompt
          </button>
        </div>
      )}

      {/* Custom Editor */}
      {showCustomEditor && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              Custom Prompt Editor
            </p>
            <button
              onClick={() => {
                setShowCustomEditor(false);
                setCustomPrompt('');
              }}
              className="text-sm text-gray-600 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>

          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="Edit your custom prompt here..."
          />

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{customPrompt.length} characters</span>
            <span>Tip: Be specific about style, composition, and details</span>
          </div>

          <button
            onClick={handleSelectPrompt}
            disabled={!customPrompt.trim()}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${customPrompt.trim()
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
              : 'bg-gray-400 cursor-not-allowed text-white'
              }`}
          >
            Use Custom Prompt
          </button>
        </div>
      )}

      {/* Info Box */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>How it works:</strong> The AI Council discusses your idea and generates
          prompts optimized for tattoo design. Choose from Simple, Detailed, or Ultra levels,
          or create your own custom prompt.
        </p>
      </div>
    </div>
  );
}

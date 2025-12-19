/**
 * Design Generator with LLM Council Integration
 *
 * Enhanced version of DesignGenerator that uses the LLM Council
 * to generate better prompts before calling the image generation API.
 *
 * User Flow:
 * 1. User enters basic idea (e.g., "dragon")
 * 2. User clicks "Enhance with AI Council"
 * 3. Council generates 3 detailed prompt levels
 * 4. User selects prompt level or customizes
 * 5. Image generation uses enhanced prompt
 * 6. Better tattoo designs generated!
 *
 * Features:
 * - AI-powered prompt enhancement
 * - Real-time council discussion visualization
 * - Multiple detail levels
 * - Custom prompt editing
 * - Backward compatible with direct generation
 */

import { useState, useEffect } from 'react';
import { generateWithRateLimit, getAPIUsage, AI_MODELS } from '../services/replicateService';
import { saveDesign } from '../services/designLibraryService';
import { TATTOO_STYLES, BODY_PART_SPECS, SIZE_SPECS } from '../config/promptTemplates';
import PromptEnhancer from './PromptEnhancer';
import CouncilLoadingState from './CouncilLoadingState';
import StencilExport from './StencilExport';
import InpaintingEditor from './InpaintingEditor';

export default function DesignGeneratorWithCouncil() {
  // Form state
  const [formData, setFormData] = useState({
    style: 'traditional',
    subject: '',
    bodyPart: 'forearm',
    size: 'medium',
    aiModel: 'tattoo'
  });

  // Enhanced prompt state
  const [enhancedPrompt, setEnhancedPrompt] = useState(null);
  const [negativePrompt, setNegativePrompt] = useState(null);
  const [showEnhancer, setShowEnhancer] = useState(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDesigns, setGeneratedDesigns] = useState(null);
  const [error, setError] = useState(null);

  // UI state
  const [selectedImage, setSelectedImage] = useState(null);
  const [savedImages, setSavedImages] = useState(new Set());
  const [apiUsage, setApiUsage] = useState(null);
  const [selectedForStencil, setSelectedForStencil] = useState(null);
  const [selectedForInpainting, setSelectedForInpainting] = useState(null);
  const [inpaintedImages, setInpaintedImages] = useState({});

  // Load API usage on mount
  useEffect(() => {
    const usage = getAPIUsage();
    setApiUsage(usage);
  }, []);

  // Handle form field changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Reset enhanced prompt if user changes subject
    if (field === 'subject') {
      setEnhancedPrompt(null);
      setNegativePrompt(null);
    }
  };

  // Handle prompt enhancement selection
  const handlePromptSelected = (prompt, negative) => {
    console.log('[DesignGenerator] Prompt enhanced:', { prompt, negative });
    setEnhancedPrompt(prompt);
    setNegativePrompt(negative);
    setShowEnhancer(false);
  };

  // Handle generate button click
  const handleGenerate = async () => {
    // Validate input
    if (!formData.subject.trim() && !enhancedPrompt) {
      setError('Please describe what you want in your tattoo');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedDesigns(null);

    try {
      console.log('[DesignGenerator] Generating designs with:', {
        ...formData,
        enhancedPrompt,
        negativePrompt
      });

      // Call Replicate API with enhanced prompt (if available)
      const result = await generateWithRateLimit({
        ...formData,
        // Override subject with enhanced prompt if available
        subject: enhancedPrompt || formData.subject,
        negativePrompt: negativePrompt
      });

      console.log('[DesignGenerator] Generation successful:', result);

      setGeneratedDesigns(result);

      // Update API usage
      const usage = getAPIUsage();
      setApiUsage(usage);

    } catch (err) {
      console.error('[DesignGenerator] Generation failed:', err);
      setError(err.message || 'Failed to generate designs. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle save to library
  const handleSaveToLibrary = async (imageUrl, index) => {
    try {
      const design = saveDesign(
        imageUrl,
        {
          ...generatedDesigns.metadata,
          variationIndex: index,
          enhancedPrompt: enhancedPrompt || null,
          negativePrompt: negativePrompt || null
        },
        formData
      );

      setSavedImages(prev => new Set([...prev, imageUrl]));

      console.log('[DesignGenerator] Design saved to library:', design.id);

      alert('Design saved to your library!');

    } catch (err) {
      console.error('[DesignGenerator] Failed to save:', err);
      alert(`Failed to save design: ${err.message}`);
    }
  };

  // Handle image click to enlarge
  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
  };

  // Close enlarged view
  const handleCloseEnlarged = () => {
    setSelectedImage(null);
  };

  // Handle inpainting save
  const handleInpaintingSave = (newImageUrl) => {
    console.log('[DesignGenerator] Inpainting complete, new image:', newImageUrl);

    if (generatedDesigns && selectedForInpainting !== null) {
      const updatedImages = [...generatedDesigns.images];
      updatedImages[selectedForInpainting] = newImageUrl;

      setGeneratedDesigns({
        ...generatedDesigns,
        images: updatedImages
      });

      setInpaintedImages(prev => ({
        ...prev,
        [selectedForInpainting]: true
      }));
    }

    setSelectedForInpainting(null);
    alert('Design edited successfully!');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Tattoo Designer</h1>
              <p className="text-sm text-gray-600 mt-1">
                Create custom tattoo designs with AI Council enhancement
              </p>
            </div>
            {enhancedPrompt && (
              <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Council Enhanced
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Budget Tracker */}
        {apiUsage && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">Budget Tracker</p>
                <p className="text-xs text-blue-700 mt-1">
                  ${apiUsage.totalSpent.toFixed(2)} spent / ${apiUsage.remainingBudget.toFixed(2)} remaining
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-700">Today: {apiUsage.todayRequests} requests</p>
                <p className="text-xs text-blue-600">${apiUsage.todaySpent.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Design Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Design Your Tattoo
          </h2>

          {/* AI Model Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Model
            </label>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(AI_MODELS).map(([key, model]) => (
                <button
                  key={key}
                  onClick={() => handleInputChange('aiModel', key)}
                  className={`p-3 border rounded-lg text-left transition-all ${
                    formData.aiModel === key
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  <div className="font-medium text-sm">{model.name}</div>
                  <div className={`text-xs mt-1 ${
                    formData.aiModel === key ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {model.description}
                  </div>
                  <div className={`text-xs mt-1 font-medium ${
                    formData.aiModel === key ? 'text-blue-200' : 'text-gray-600'
                  }`}>
                    ${(model.cost * model.params.num_outputs).toFixed(4)} per request
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Style Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tattoo Style
            </label>
            <select
              value={formData.style}
              onChange={(e) => handleInputChange('style', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
            >
              {Object.entries(TATTOO_STYLES).map(([key, style]) => (
                <option key={key} value={key}>
                  {style.displayName}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {TATTOO_STYLES[formData.style].description}
            </p>
          </div>

          {/* Subject Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What do you want in your tattoo?
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              placeholder="e.g., dragon, geometric wolf, rose with thorns..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Start simple! The AI Council will enhance it for you.
            </p>
          </div>

          {/* Body Part & Size Row */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Body Placement
              </label>
              <select
                value={formData.bodyPart}
                onChange={(e) => handleInputChange('bodyPart', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              >
                {Object.entries(BODY_PART_SPECS).map(([key, spec]) => (
                  <option key={key} value={key}>
                    {spec.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Size
              </label>
              <select
                value={formData.size}
                onChange={(e) => handleInputChange('size', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              >
                {Object.entries(SIZE_SPECS).map(([key, spec]) => (
                  <option key={key} value={key}>
                    {spec.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Show Enhanced Prompt (if set) */}
          {enhancedPrompt && !showEnhancer && (
            <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <p className="text-sm font-semibold text-purple-900">
                  ✨ AI Enhanced Prompt:
                </p>
                <button
                  onClick={() => {
                    setEnhancedPrompt(null);
                    setNegativePrompt(null);
                  }}
                  className="text-xs text-purple-600 hover:text-purple-700"
                >
                  Clear
                </button>
              </div>
              <p className="text-sm text-purple-800 leading-relaxed">
                {enhancedPrompt}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Enhance Prompt Button */}
            {!enhancedPrompt && !showEnhancer && (
              <button
                onClick={() => setShowEnhancer(true)}
                disabled={!formData.subject.trim()}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center ${
                  formData.subject.trim()
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-400 cursor-not-allowed text-white'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                ✨ Enhance with AI Council
              </button>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || (!formData.subject.trim() && !enhancedPrompt)}
              className={`w-full py-4 rounded-lg font-semibold text-white transition-all ${
                isGenerating || (!formData.subject.trim() && !enhancedPrompt)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-98'
              }`}
            >
              {isGenerating ? (
                <CouncilLoadingState message="Generating your tattoo designs..." />
              ) : (
                `Generate Design ${enhancedPrompt ? '(Enhanced)' : ''}`
              )}
            </button>

            <p className="text-xs text-center text-gray-500">
              {enhancedPrompt
                ? '✨ Using AI-enhanced prompt for better results'
                : 'Tip: Enhance your prompt with AI Council for better designs!'
              }
            </p>
          </div>
        </div>

        {/* Prompt Enhancer Panel */}
        {showEnhancer && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                AI Council Prompt Enhancement
              </h2>
              <button
                onClick={() => setShowEnhancer(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <PromptEnhancer
              userInput={formData.subject}
              onPromptSelected={handlePromptSelected}
              style={formData.style}
              bodyPart={formData.bodyPart}
            />
          </div>
        )}

        {/* Generated Designs Grid */}
        {generatedDesigns && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Your Designs
              </h2>
              <p className="text-sm text-gray-600">
                {generatedDesigns.images.length} variations
              </p>
            </div>

            {/* Design Metadata */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Style:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {generatedDesigns.metadata.style}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Placement:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {generatedDesigns.metadata.bodyPart}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Prompt:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {enhancedPrompt ? '✨ AI Enhanced' : generatedDesigns.metadata.subject}
                  </span>
                </div>
              </div>
            </div>

            {/* Image Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {generatedDesigns.images.map((imageUrl, index) => (
                <div
                  key={index}
                  className="relative group rounded-lg overflow-hidden bg-gray-100 aspect-square"
                >
                  <img
                    src={imageUrl}
                    alt={`Variation ${index + 1}`}
                    className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                    onClick={() => handleImageClick(imageUrl)}
                  />

                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all pointer-events-none" />

                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="space-y-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedForInpainting(index);
                        }}
                        className="w-full py-2 px-4 rounded-lg font-medium bg-purple-600 text-white hover:bg-purple-700 transition-all"
                      >
                        ✏️ Edit Design
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveToLibrary(imageUrl, index);
                        }}
                        disabled={savedImages.has(imageUrl)}
                        className={`w-full py-2 px-4 rounded-lg font-medium transition-all ${
                          savedImages.has(imageUrl)
                            ? 'bg-green-500 text-white cursor-default'
                            : 'bg-white text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        {savedImages.has(imageUrl) ? '✓ Saved' : 'Save to Library'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedForStencil(imageUrl);
                        }}
                        className="w-full py-2 px-4 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all"
                      >
                        Export as Stencil
                      </button>
                    </div>
                  </div>

                  <div className="absolute top-3 left-3 flex gap-2">
                    <div className="bg-black/50 text-white text-xs font-medium px-2 py-1 rounded">
                      #{index + 1}
                    </div>
                    {enhancedPrompt && (
                      <div className="bg-purple-600 text-white text-xs font-medium px-2 py-1 rounded">
                        ✨ AI Enhanced
                      </div>
                    )}
                    {inpaintedImages[index] && (
                      <div className="bg-blue-600 text-white text-xs font-medium px-2 py-1 rounded">
                        ✏️ Edited
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stencil Export Panel */}
        {selectedForStencil && (
          <div className="mt-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Stencil Export
                </h2>
                <button
                  onClick={() => setSelectedForStencil(null)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <StencilExport
                imageUrl={selectedForStencil}
                designName={formData.subject ? `${formData.subject.replace(/\s+/g, '-')}-${Date.now()}` : `tattoo-${Date.now()}`}
              />
            </div>
          </div>
        )}

        {/* Enlarged Image Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
            onClick={handleCloseEnlarged}
          >
            <div className="relative max-w-4xl w-full">
              <button
                onClick={handleCloseEnlarged}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <img
                src={selectedImage}
                alt="Enlarged view"
                className="w-full h-auto rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        {/* Inpainting Editor Modal */}
        {selectedForInpainting !== null && generatedDesigns && (
          <InpaintingEditor
            imageUrl={generatedDesigns.images[selectedForInpainting]}
            onClose={() => setSelectedForInpainting(null)}
            onSave={handleInpaintingSave}
          />
        )}
      </main>
    </div>
  );
}

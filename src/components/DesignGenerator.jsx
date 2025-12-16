/**
 * Design Generator Component
 *
 * Main interface for AI tattoo design generation.
 * Mobile-first, clean gallery-like aesthetic.
 *
 * User Flow:
 * 1. Select style, enter subject, choose body part and size
 * 2. Click generate
 * 3. View 4 variations in responsive grid
 * 4. Tap to enlarge, save favorites to library
 */

import { useState, useEffect } from 'react';
import { generateWithRateLimit, getAPIUsage, AI_MODELS } from '../services/replicateService';
import { saveDesign } from '../services/designLibraryService';
import { processInBrowser, optimizeForAR } from '../services/imageProcessingService';
import { TATTOO_STYLES, BODY_PART_SPECS, SIZE_SPECS } from '../config/promptTemplates';
import StencilExport from './StencilExport';

export default function DesignGenerator() {
  // Form state
  const [formData, setFormData] = useState({
    style: 'traditional',
    subject: '',
    bodyPart: 'forearm',
    size: 'medium',
    aiModel: 'tattoo' // Default to tattoo-specific model
  });

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDesigns, setGeneratedDesigns] = useState(null);
  const [error, setError] = useState(null);

  // UI state
  const [selectedImage, setSelectedImage] = useState(null);
  const [savedImages, setSavedImages] = useState(new Set());
  const [apiUsage, setApiUsage] = useState(null);
  const [selectedForStencil, setSelectedForStencil] = useState(null);

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
  };

  // Handle generate button click
  const handleGenerate = async () => {
    // Validate input
    if (!formData.subject.trim()) {
      setError('Please describe what you want in your tattoo');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedDesigns(null);

    try {
      console.log('[DesignGenerator] Generating designs with:', formData);

      // Call Replicate API
      const result = await generateWithRateLimit(formData);

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
          variationIndex: index
        },
        formData
      );

      setSavedImages(prev => new Set([...prev, imageUrl]));

      console.log('[DesignGenerator] Design saved to library:', design.id);

      // Show success feedback
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">AI Tattoo Designer</h1>
          <p className="text-sm text-gray-600 mt-1">
            Create custom tattoo designs with AI
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Budget Tracker */}
        {apiUsage && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Budget Tracker
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  ${apiUsage.totalSpent.toFixed(2)} spent / ${apiUsage.remainingBudget.toFixed(2)} remaining
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-700">
                  Today: {apiUsage.todayRequests} requests
                </p>
                <p className="text-xs text-blue-600">
                  ${apiUsage.todaySpent.toFixed(2)}
                </p>
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
              placeholder="e.g., wolf and moon, rose with thorns, geometric mountains..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Be specific! The more detail, the better the result.
            </p>
          </div>

          {/* Body Part Selector */}
          <div className="mb-4">
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

          {/* Size Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Size
            </label>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(SIZE_SPECS).map(([key, spec]) => (
                <button
                  key={key}
                  onClick={() => handleInputChange('size', key)}
                  className={`px-4 py-3 border rounded-lg font-medium transition-all ${
                    formData.size === key
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {spec.displayName.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !formData.subject.trim()}
            className={`w-full py-4 rounded-lg font-semibold text-white transition-all ${
              isGenerating || !formData.subject.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:scale-98'
            }`}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Consulting with AI tattoo artist...
              </span>
            ) : (
              'Generate Design'
            )}
          </button>

          <p className="mt-2 text-xs text-center text-gray-500">
            Generates 4 unique variations (~${(AI_MODELS[formData.aiModel].cost * AI_MODELS[formData.aiModel].params.num_outputs).toFixed(4)} per request)
          </p>
        </div>

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
                <div>
                  <span className="text-gray-600">Subject:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {generatedDesigns.metadata.subject}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Size:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {generatedDesigns.metadata.size}
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
                  {/* Image */}
                  <img
                    src={imageUrl}
                    alt={`Variation ${index + 1}`}
                    className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                    onClick={() => handleImageClick(imageUrl)}
                  />

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all pointer-events-none" />

                  {/* Action Buttons */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="space-y-2">
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

                  {/* Variation Number */}
                  <div className="absolute top-3 left-3 bg-black/50 text-white text-xs font-medium px-2 py-1 rounded">
                    #{index + 1}
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
                designName={generatedDesigns ? `${generatedDesigns.metadata.subject.replace(/\s+/g, '-')}-${Date.now()}` : 'tattoo'}
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
              {/* Close Button */}
              <button
                onClick={handleCloseEnlarged}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Image */}
              <img
                src={selectedImage}
                alt="Enlarged view"
                className="w-full h-auto rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

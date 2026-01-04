/**
 * Design Generator Component (Refactored)
 *
 * Main interface for AI tattoo design generation.
 * Decomposed into focused sub-components with proper cleanup.
 */

import { useState, useEffect, useRef } from 'react';
import { generateWithRateLimit, getAPIUsage, AI_MODELS } from '../services/replicateService';
import { saveDesign } from '../services/designLibraryService';
import { getRecommendedModel, getRandomTip } from '../config/promptTemplates';
import DesignForm from './generator/DesignForm';
import ResultsGrid from './generator/ResultsGrid';
import GeneratorModals from './generator/GeneratorModals';

export default function DesignGenerator() {
  // Form state
  const [formData, setFormData] = useState({
    style: 'traditional',
    subject: '',
    bodyPart: 'forearm',
    size: 'medium',
    aiModel: 'tattoo'
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
  const [selectedForInpainting, setSelectedForInpainting] = useState(null);
  const [inpaintedImages, setInpaintedImages] = useState({});
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [currentTip, setCurrentTip] = useState(null);

  // Refs for cleanup
  const tipIntervalRef = useRef(null);

  // Load API usage on mount
  useEffect(() => {
    const usage = getAPIUsage();
    setApiUsage(usage);
  }, []);

  // Auto-recommend AI model based on selected style
  useEffect(() => {
    const recommendedModel = getRecommendedModel(formData.style);
    if (formData.aiModel !== recommendedModel) {
      setFormData(prev => ({
        ...prev,
        aiModel: recommendedModel
      }));
    }
  }, [formData.style, formData.aiModel]);

  // Cleanup tip interval on unmount or when generation completes
  useEffect(() => {
    return () => {
      if (tipIntervalRef.current) {
        clearInterval(tipIntervalRef.current);
        tipIntervalRef.current = null;
      }
    };
  }, []);

  // Handle form field changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle template selection
  const handleTemplateSelect = (template) => {
    setFormData(prev => ({
      ...prev,
      subject: template.subject,
      style: template.recommendedStyle || prev.style
    }));
    setShowTemplates(false);
    setSelectedCategory(null);
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

    // Start showing tips with proper cleanup
    setCurrentTip(getRandomTip());
    tipIntervalRef.current = setInterval(() => {
      setCurrentTip(getRandomTip());
    }, 4000);

    try {
      console.log('[DesignGenerator] Generating designs with:', formData);

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
      
      // Clean up tip interval
      if (tipIntervalRef.current) {
        clearInterval(tipIntervalRef.current);
        tipIntervalRef.current = null;
      }
      setCurrentTip(null);
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

      // TODO: Replace with toast notification
      alert('Design saved to your library!');

    } catch (err) {
      console.error('[DesignGenerator] Failed to save:', err);
      alert(`Failed to save design: ${err.message}`);
    }
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

    // TODO: Replace with toast notification
    alert('Design edited successfully! Your customized design is now in the gallery.');
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
        <DesignForm
          formData={formData}
          onInputChange={handleInputChange}
          onGenerate={handleGenerate}
          onShowTemplates={() => setShowTemplates(true)}
          isGenerating={isGenerating}
          error={error}
          currentTip={currentTip}
        />

        {/* Results Grid */}
        <ResultsGrid
          generatedDesigns={generatedDesigns}
          savedImages={savedImages}
          inpaintedImages={inpaintedImages}
          onImageClick={setSelectedImage}
          onSaveToLibrary={handleSaveToLibrary}
          onOpenStencil={setSelectedForStencil}
          onOpenInpainting={setSelectedForInpainting}
        />

        {/* All Modals */}
        <GeneratorModals
          selectedImage={selectedImage}
          onCloseEnlarged={() => setSelectedImage(null)}
          showTemplates={showTemplates}
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
          onTemplateSelect={handleTemplateSelect}
          onCloseTemplates={() => {
            setShowTemplates(false);
            setSelectedCategory(null);
          }}
          selectedForStencil={selectedForStencil}
          onCloseStencil={() => setSelectedForStencil(null)}
          selectedForInpainting={selectedForInpainting}
          generatedDesigns={generatedDesigns}
          onInpaintingSave={handleInpaintingSave}
          onCloseInpainting={() => setSelectedForInpainting(null)}
        />
      </main>
    </div>
  );
}


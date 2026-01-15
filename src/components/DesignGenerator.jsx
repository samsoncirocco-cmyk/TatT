/**
 * Design Generator Component - "The Forge"
 * 
 * Completely redesigned with cinematic dark aesthetic
 * Main interface for AI tattoo design generation
 */

import { useState, useEffect, useRef } from 'react';
import { generateWithRateLimit, getAPIUsage, AI_MODELS, checkServiceHealth } from '../services/replicateService';
import { saveDesign } from '../services/designLibraryService';
import { getRecommendedModel, getRandomTip } from '../config/promptTemplates';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from './ui/Toast';
import { TATTOO_STYLES, BODY_PART_SPECS } from '../config/promptTemplates';
import ResultsGrid from './generator/ResultsGrid';
import GeneratorModals from './generator/GeneratorModals';
import Button from './ui/Button';
import { Sparkles, ChevronDown, Zap, Cpu, Palette, AlertCircle } from 'lucide-react';

export default function DesignGenerator() {
  const { toast, toasts, removeToast } = useToast();

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
  const [serviceHealth, setServiceHealth] = useState(null);

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
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Refs for cleanup
  const tipIntervalRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Load API usage and check service health on mount
  useEffect(() => {
    const usage = getAPIUsage();
    setApiUsage(usage);

    checkServiceHealth().then(health => {
      setServiceHealth(health);
    });
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tipIntervalRef.current) {
        clearInterval(tipIntervalRef.current);
        tipIntervalRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTemplateSelect = (template) => {
    setFormData(prev => ({
      ...prev,
      subject: template.subject,
      style: template.recommendedStyle || prev.style
    }));
    setShowTemplates(false);
    setSelectedCategory(null);
  };

  const handleGenerate = async () => {
    if (!formData.subject.trim()) {
      setError('Please describe what you want in your tattoo');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedDesigns(null);

    abortControllerRef.current = new AbortController();

    setCurrentTip(getRandomTip());
    tipIntervalRef.current = setInterval(() => {
      setCurrentTip(getRandomTip());
    }, 4000);

    try {
      const result = await generateWithRateLimit(formData, abortControllerRef.current.signal);
      setGeneratedDesigns(result);
      const usage = getAPIUsage();
      setApiUsage(usage);
    } catch (err) {
      if (!err.message.includes('cancelled')) {
        setError(err.message || 'Failed to generate designs. Please try again.');
      }
    } finally {
      setIsGenerating(false);
      if (tipIntervalRef.current) {
        clearInterval(tipIntervalRef.current);
        tipIntervalRef.current = null;
      }
      setCurrentTip(null);
      abortControllerRef.current = null;
    }
  };

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
      toast.success('Design saved to your library!');
    } catch (err) {
      toast.error(`Failed to save design: ${err.message}`);
    }
  };

  const handleInpaintingSave = (newImageUrl) => {
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
    toast.success('Design edited successfully!');
  };

  return (
    <div className="relative min-h-screen pt-16 px-4 pb-32">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-black -z-20" />
      <div className="fixed inset-0 bg-gradient-to-br from-blue-950/20 via-black to-black -z-10" />
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-ducks-green/10 rounded-full blur-[150px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      <main className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16 pt-8">
          <h1 className="text-7xl md:text-8xl font-display font-black tracking-tighter text-white mb-3">
            THE FORGE
          </h1>
          <p className="text-xs font-mono text-ducks-green uppercase tracking-[0.3em]">
            Neural Ink Generation Engine // v4.2
          </p>
        </div>

        {/* Ambient Metadata */}
        {apiUsage && (
          <div className="flex justify-between items-center mb-8 text-xs font-mono text-gray-600">
            <div>
              GENERATIONS: <span className="text-white font-bold">{apiUsage.todayRequests}</span> TODAY // <span className="text-white font-bold">{apiUsage.totalRequests}</span> TOTAL
            </div>
            <div>
              BUDGET REMAINING: <span className="text-ducks-green font-bold">${apiUsage.remainingBudget.toFixed(2)}</span> CREDITS
            </div>
          </div>
        )}

        {/* Service Health Alert */}
        {serviceHealth && !serviceHealth.healthy && serviceHealth.banner && (
          <div className={`glass-panel rounded-xl p-4 mb-8 border-l-4 flex items-start gap-3 ${serviceHealth.banner.type === 'error'
              ? 'border-l-red-500 bg-red-500/5'
              : 'border-l-yellow-500 bg-yellow-500/5'
            }`}>
            <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
            <div className="flex-1">
              <p className="text-sm font-bold text-white mb-1">
                {serviceHealth.banner.message}
              </p>
              {serviceHealth.banner.action && (
                <p className="text-xs text-gray-400">
                  {serviceHealth.banner.action}
                </p>
              )}
            </div>
            <button
              onClick={() => setServiceHealth(null)}
              className="text-gray-500 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Input - Cinematic */}
        <div className="mb-12">
          <div className="relative group">
            <textarea
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              placeholder="Describe your vision..."
              className="w-full bg-transparent text-4xl md:text-6xl font-display font-bold text-white placeholder-white/10 border-b-2 border-white/10 focus:border-ducks-yellow focus:ring-0 outline-none transition-all resize-none py-6 leading-tight min-h-[140px]"
              rows="2"
            />
            <div className="absolute bottom-2 right-2">
              <button
                onClick={() => setShowTemplates(true)}
                className="text-xs text-gray-600 hover:text-white transition-colors flex items-center gap-1 font-mono uppercase tracking-wider"
              >
                <Palette size={12} /> Templates
              </button>
            </div>
          </div>
        </div>

        {/* Engine Selection */}
        <div className="mb-10">
          <p className="text-xs font-mono text-gray-600 uppercase tracking-widest mb-4">
            Choose The Artist's Hand
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(AI_MODELS).map(([key, model]) => (
              <button
                key={key}
                onClick={() => handleInputChange('aiModel', key)}
                className={`glass-panel p-6 rounded-2xl border-2 transition-all group hover:scale-[1.02] ${formData.aiModel === key
                    ? 'border-ducks-green bg-ducks-green/5 shadow-glow-green'
                    : 'border-white/10 hover:border-white/20'
                  }`}
              >
                <div className="flex items-center justify-center mb-3">
                  <Cpu className={`${formData.aiModel === key ? 'text-ducks-green' : 'text-gray-600'}`} size={24} />
                </div>
                <h3 className={`text-sm font-bold mb-1 ${formData.aiModel === key ? 'text-white' : 'text-gray-400'}`}>
                  {model.name}
                </h3>
                <p className="text-[10px] text-gray-600 font-mono uppercase tracking-wider">
                  {key === 'tattoo' ? 'Real-time Sketching' :
                    key === 'sdxl' ? 'High-Detail Realism' :
                      key === 'dalle' ? 'Creative & Abstract' :
                        'Photorealistic Concepts'}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Options - Collapsed */}
        <div className="mb-10">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-xs font-mono text-gray-600 hover:text-white transition-colors uppercase tracking-widest mb-4"
          >
            <ChevronDown className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} size={14} />
            Tattoo Fine-Tuning
          </button>

          {showAdvanced && (
            <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-6 animate-slide-down">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Style Selector */}
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-3">
                    Style Selector
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(TATTOO_STYLES).slice(0, 6).map(([key, style]) => (
                      <button
                        key={key}
                        onClick={() => handleInputChange('style', key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${formData.style === key
                            ? 'bg-white text-black'
                            : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white'
                          }`}
                      >
                        {style.displayName}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Body Part Selector */}
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-3">
                    Body Part Selector
                  </label>
                  <select
                    value={formData.bodyPart}
                    onChange={(e) => handleInputChange('bodyPart', e.target.value)}
                    className="w-full bg-black/40 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:border-ducks-green focus:outline-none appearance-none cursor-pointer"
                  >
                    {Object.entries(BODY_PART_SPECS).slice(0, 8).map(([key, spec]) => (
                      <option key={key} value={key} className="bg-black">
                        {spec.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Size & Aspect Ratio */}
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-3">
                    Size & Aspect Ratio
                  </label>
                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-400 hover:text-white transition-colors">
                      Small
                    </button>
                    <button className="flex-1 px-3 py-2 bg-white text-black rounded-lg text-xs font-bold">
                      Medium
                    </button>
                    <button className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-400 hover:text-white transition-colors">
                      Large
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-start gap-3">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Primary Action */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !formData.subject.trim()}
          isLoading={isGenerating}
          className="w-full h-20 text-xl font-black tracking-wider bg-ducks-yellow text-black hover:bg-white shadow-2xl"
          icon={isGenerating ? Zap : Sparkles}
        >
          {isGenerating ? (
            <span className="flex items-center gap-3">
              <span className="animate-pulse">{currentTip ? currentTip.text : 'Consulting Neural Network...'}</span>
            </span>
          ) : (
            'IGNITE FORGE'
          )}
        </Button>

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

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

/**
 * DesignForm Component
 * 
 * Form for tattoo design input - style, subject, body part, size, and AI model selection
 */

import { TATTOO_STYLES, BODY_PART_SPECS, SIZE_SPECS, getRecommendedModel } from '../../config/promptTemplates';
import { AI_MODELS } from '../../services/replicateService';

export default function DesignForm({
  formData,
  onInputChange,
  onGenerate,
  onShowTemplates,
  isGenerating,
  error,
  currentTip
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Design Your Tattoo
      </h2>

      {/* AI Model Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          AI Model <span className="text-xs text-gray-500 font-normal">(Auto-selected based on your style)</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(AI_MODELS).map(([key, model]) => {
            const isRecommended = getRecommendedModel(formData.style) === key;
            return (
              <button
                key={key}
                onClick={() => onInputChange('aiModel', key)}
                className={`p-3 border rounded-lg text-left transition-all relative ${
                  formData.aiModel === key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                {isRecommended && (
                  <span className="absolute top-1 right-1 text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-medium">
                    ★ Recommended
                  </span>
                )}
                <div className="font-medium text-sm mb-1">{model.name}</div>
                <div className={`text-xs ${formData.aiModel === key ? 'text-blue-100' : 'text-gray-500'}`}>
                  {model.description}
                </div>
                <div className={`text-xs mt-1 font-medium ${formData.aiModel === key ? 'text-blue-200' : 'text-gray-600'}`}>
                  ~${(model.cost * model.params.num_outputs).toFixed(4)} per request
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Style Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tattoo Style
        </label>
        <select
          value={formData.style}
          onChange={(e) => onInputChange('style', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {Object.entries(TATTOO_STYLES).map(([key, style]) => (
            <option key={key} value={key}>
              {style.displayName}
            </option>
          ))}
        </select>
      </div>

      {/* Subject Input */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            What do you want in your tattoo?
          </label>
          <button
            onClick={onShowTemplates}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Browse Templates
          </button>
        </div>
        <textarea
          value={formData.subject}
          onChange={(e) => onInputChange('subject', e.target.value)}
          placeholder="e.g., a wolf howling at the moon, surrounded by pine trees"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows="3"
        />
        <p className="mt-1 text-xs text-gray-500">
          Be specific! Describe the subject, composition, and any important details.
        </p>
      </div>

      {/* Body Part Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Body Placement
        </label>
        <select
          value={formData.bodyPart}
          onChange={(e) => onInputChange('bodyPart', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              onClick={() => onInputChange('size', key)}
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
        onClick={onGenerate}
        disabled={isGenerating || !formData.subject.trim()}
        className={`w-full py-4 rounded-lg font-semibold text-white transition-all ${
          isGenerating || !formData.subject.trim()
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 active:scale-98'
        }`}
      >
        {isGenerating ? (
          <span className="flex flex-col items-center justify-center">
            <div className="flex items-center mb-2">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Consulting with AI tattoo artist...
            </div>
            {currentTip && (
              <span className="text-sm font-normal text-blue-100 animate-pulse bg-blue-700/50 px-3 py-1 rounded-full">
                {currentTip.text}
              </span>
            )}
          </span>
        ) : (
          'Generate Design'
        )}
      </button>

      <p className="mt-2 text-xs text-center text-gray-500">
        Generates 4 unique variations (~${(AI_MODELS[formData.aiModel].cost * AI_MODELS[formData.aiModel].params.num_outputs).toFixed(4)} per request)
      </p>
    </div>
  );
}


import { useState } from 'react';
import {
  generateStencil,
  downloadStencil,
  STENCIL_SIZES,
  STYLE_PRESETS
} from '../services/stencilService';

export default function StencilExport({ imageUrl, designName = 'tattoo' }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [stencilPreview, setStencilPreview] = useState(null);
  const [selectedSize, setSelectedSize] = useState('medium');
  const [selectedPreset, setSelectedPreset] = useState('balanced');
  const [processingMode, setProcessingMode] = useState('threshold'); // 'threshold' or 'edge'
  const [customSettings, setCustomSettings] = useState({
    threshold: 128,
    contrast: 1.2,
    brightness: 0
  });

  const handleGeneratePreview = async () => {
    // Validate imageUrl exists before processing
    if (!imageUrl) {
      alert('No image selected. Please select a design first.');
      return;
    }

    setIsProcessing(true);
    try {
      const preset = STYLE_PRESETS[selectedPreset];
      const settings = {
        threshold: customSettings.threshold || preset.threshold,
        contrast: customSettings.contrast || preset.contrast,
        brightness: customSettings.brightness || preset.brightness
      };

      const stencil = await generateStencil(imageUrl, selectedSize, settings, processingMode);
      setStencilPreview(stencil);
    } catch (error) {
      console.error('Failed to generate stencil:', error);
      alert(`Failed to generate stencil: ${error.message}. Please try again.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!stencilPreview) return;

    const size = STENCIL_SIZES[selectedSize];
    const filename = `${designName}-stencil-${size.inches}in-300dpi.png`;
    downloadStencil(stencilPreview, filename);
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Stencil Export</h3>
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">300 DPI</span>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Settings Panel */}
        <div className="space-y-4">
          {/* Size Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stencil Size
            </label>
            <div className="space-y-2">
              {Object.entries(STENCIL_SIZES).map(([key, size]) => (
                <label
                  key={key}
                  className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="size"
                    value={key}
                    checked={selectedSize === key}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    className="text-blue-600"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{size.name}</div>
                    <div className="text-xs text-gray-500">{size.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Processing Mode Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Processing Mode
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setProcessingMode('threshold')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  processingMode === 'threshold'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Threshold
              </button>
              <button
                onClick={() => setProcessingMode('edge')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  processingMode === 'edge'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Edge Detection
                <span className="ml-1 text-xs">✨ New</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {processingMode === 'threshold' 
                ? 'Classic threshold-based conversion (fast)' 
                : 'Canny edge detection for crisp linework (slower)'}
            </p>
          </div>

          {/* Style Preset */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Style Preset
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(STYLE_PRESETS).map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.name} - {preset.description}
                </option>
              ))}
            </select>
          </div>

          {/* Advanced Controls */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">
              Advanced Controls
            </p>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Threshold: {customSettings.threshold}
              </label>
              <input
                type="range"
                min="50"
                max="200"
                value={customSettings.threshold}
                onChange={(e) => setCustomSettings({
                  ...customSettings,
                  threshold: parseInt(e.target.value)
                })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>More Black</span>
                <span>More White</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Contrast: {customSettings.contrast.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={customSettings.contrast}
                onChange={(e) => setCustomSettings({
                  ...customSettings,
                  contrast: parseFloat(e.target.value)
                })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Brightness: {customSettings.brightness > 0 ? '+' : ''}{customSettings.brightness}
              </label>
              <input
                type="range"
                min="-50"
                max="50"
                value={customSettings.brightness}
                onChange={(e) => setCustomSettings({
                  ...customSettings,
                  brightness: parseInt(e.target.value)
                })}
                className="w-full"
              />
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGeneratePreview}
            disabled={isProcessing}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {isProcessing ? 'Processing...' : 'Generate Stencil Preview'}
          </button>
        </div>

        {/* Preview Panel */}
        <div className="space-y-4">
          <div className="bg-gray-100 rounded-lg p-4 min-h-[400px] flex items-center justify-center">
            {stencilPreview ? (
              <div className="space-y-4 w-full">
                <img
                  src={stencilPreview}
                  alt="Stencil Preview"
                  className="w-full rounded shadow-lg"
                  style={{ imageRendering: 'crisp-edges' }}
                />
                <div className="text-sm text-gray-600 text-center">
                  <p className="font-medium">
                    {STENCIL_SIZES[selectedSize].inches}" × {STENCIL_SIZES[selectedSize].inches}" at 300 DPI
                  </p>
                  <p className="text-xs">
                    {STENCIL_SIZES[selectedSize].pixels} × {STENCIL_SIZES[selectedSize].pixels} pixels
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p>Click "Generate Stencil Preview" to see result</p>
              </div>
            )}
          </div>

          {stencilPreview && (
            <button
              onClick={handleDownload}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download Print-Ready Stencil</span>
            </button>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          Stencil Tips
        </h4>
        <ul className="text-sm text-blue-900 space-y-1">
          <li>• Print at 100% scale for accurate sizing</li>
          <li>• Use thermal printer or copier transfer method</li>
          <li>• Adjust threshold if lines are too thick/thin</li>
          <li>• Higher contrast = bolder, more defined lines</li>
          <li>• Test print on regular paper before thermal paper</li>
        </ul>
      </div>
    </div>
  );
}

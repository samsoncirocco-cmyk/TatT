import { useEffect, useMemo, useState } from 'react';
import {
  generateStencil,
  generateStencilPDF,
  downloadStencil,
  STENCIL_SIZES,
  STYLE_PRESETS
} from '../services/stencilService';
import {
  PAPER_SIZES,
  calculateScaleFactor,
  suggestPaperSize,
  validateDimensions
} from '@/utils/stencilCalibration';

const formatFileSize = (bytes) => {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function StencilExport({ imageUrl, designName = 'tattoo', designId }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [stencilPreview, setStencilPreview] = useState(null);
  const [selectedSize, setSelectedSize] = useState('medium');
  const [selectedPreset, setSelectedPreset] = useState('balanced');
  const [processingMode, setProcessingMode] = useState('threshold');
  const [exportFormat, setExportFormat] = useState('png');
  const [customSettings, setCustomSettings] = useState({
    threshold: 128,
    contrast: 1.2,
    brightness: 0
  });
  const [paperSize, setPaperSize] = useState('letter');
  const [customPaper, setCustomPaper] = useState({
    width: 8.5,
    height: 11,
    unit: 'inches'
  });
  const [dimensionError, setDimensionError] = useState(null);
  const [estimatedFileSize, setEstimatedFileSize] = useState(null);
  const [designTitle, setDesignTitle] = useState(designName);
  const [artistNotes, setArtistNotes] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [internalDesignId] = useState(
    () => designId
      || (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `design-${Date.now()}`)
  );

  useEffect(() => {
    setDesignTitle(designName);
  }, [designName]);

  const selectedSizeInfo = STENCIL_SIZES[selectedSize] || STENCIL_SIZES.medium;

  const designDimensions = useMemo(() => ({
    widthInches: selectedSizeInfo?.inches || 6,
    heightInches: selectedSizeInfo?.inches || 6
  }), [selectedSizeInfo]);

  const paperCalculation = useMemo(() => {
    if (paperSize === 'custom') {
      try {
        const validated = validateDimensions(
          customPaper.width,
          customPaper.height,
          customPaper.unit
        );
        return {
          paperDimensions: { ...validated, key: 'custom', name: 'Custom' },
          paperError: null
        };
      } catch (error) {
        return { paperDimensions: null, paperError: error.message };
      }
    }

    const preset = PAPER_SIZES[paperSize] || PAPER_SIZES.letter;
    return { paperDimensions: { ...preset }, paperError: null };
  }, [paperSize, customPaper]);

  useEffect(() => {
    setDimensionError(paperCalculation.paperError);
  }, [paperCalculation.paperError]);

  const recommendedPaper = useMemo(
    () => suggestPaperSize(designDimensions),
    [designDimensions]
  );

  const scalePercent = paperCalculation.paperDimensions
    ? Math.round(calculateScaleFactor(designDimensions, paperCalculation.paperDimensions) * 100)
    : 0;

  useEffect(() => {
    if (!stencilPreview) {
      setEstimatedFileSize(null);
      return;
    }

    const base64 = stencilPreview.split(',')[1];
    if (!base64) {
      setEstimatedFileSize(null);
      return;
    }
    const sizeBytes = Math.ceil((base64.length * 3) / 4);
    setEstimatedFileSize(sizeBytes);
  }, [stencilPreview]);

  const stencilSettings = useMemo(() => {
    const preset = STYLE_PRESETS[selectedPreset];
    return {
      threshold: customSettings.threshold || preset.threshold,
      contrast: customSettings.contrast || preset.contrast,
      brightness: customSettings.brightness || preset.brightness
    };
  }, [customSettings, selectedPreset]);

  const buildMetadataPayload = (format) => ({
    format,
    design_name: designTitle,
    design_id: internalDesignId,
    artist_notes: artistNotes,
    paper_size: paperSize,
    created_at: new Date().toISOString(),
    dimensions: {
      width_inches: designDimensions.widthInches,
      height_inches: designDimensions.heightInches
    }
  });

  const handleGeneratePreview = async () => {
    if (!imageUrl) {
      alert('No image selected. Please select a design first.');
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Generating 300 DPI preview...');
    try {
      const stencil = await generateStencil(
        imageUrl,
        selectedSize,
        stencilSettings,
        processingMode,
        { exportFormat: 'png' }
      );
      setStencilPreview(stencil);
      setStatusMessage('Preview ready at 300 DPI.');
    } catch (error) {
      console.error('Failed to generate stencil:', error);
      alert(`Failed to generate stencil: ${error.message}. Please try again.`);
      setStatusMessage('Preview failed. Adjust settings and retry.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadPNG = () => {
    if (!stencilPreview) return;
    const size = STENCIL_SIZES[selectedSize] || STENCIL_SIZES.medium;
    const filename = `${designTitle || 'tattoo'}-stencil-${size.inches}in-300dpi.png`;
    downloadStencil(stencilPreview, filename);
    setStatusMessage('PNG downloaded with stencil calibration metadata.');
  };

  const handleDownloadPDF = async () => {
    if (!imageUrl) {
      alert('Select a design before exporting.');
      return;
    }

    if (paperSize === 'custom' && dimensionError) {
      alert(`Fix paper dimensions: ${dimensionError}`);
      return;
    }

    setIsExportingPDF(true);
    setExportProgress(10);
    setStatusMessage('Calibrating 300 DPI PDF export...');

    try {
      const { blob, filename } = await generateStencilPDF(
        imageUrl,
        selectedSize,
        stencilSettings,
        processingMode,
        {
          metadata: buildMetadataPayload('pdf'),
          paperSize,
          customPaperDimensions: customPaper,
          onProgress: (value) => setExportProgress(Math.max(5, Math.round(value * 100)))
        }
      );
      downloadStencil(blob, filename);
      setStatusMessage('PDF export complete.');
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert(`PDF export failed: ${error.message}`);
      setStatusMessage('PDF export failed. Adjust settings and retry.');
    } finally {
      setIsExportingPDF(false);
      setTimeout(() => setExportProgress(0), 800);
    }
  };

  const handleCustomPaperChange = (field, value) => {
    setCustomPaper((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const formatButtonClass = (format) => (
    `press flex-1 px-4 py-2 text-[11px] uppercase tracking-[0.18em] transition-colors border-2 ${
      exportFormat === format
        ? 'bg-pink text-black border-pink'
        : 'bg-black text-white/70 hairline-white hover:border-pink'
    }`
  );

  const formattedRecommendedPaper = recommendedPaper === 'custom'
    ? 'Custom size'
    : PAPER_SIZES[recommendedPaper]?.name || 'Letter';

  return (
    <div className="bg-black p-6 text-white font-body">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-display tracking-wide uppercase text-white">Stencil Export</h3>
        <span className="text-[10px] bg-pink text-black px-2 py-1 uppercase tracking-[0.18em]">
          300 DPI Calibrated
        </span>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Settings Panel */}
        <div className="space-y-4">
          {/* Size Selection */}
          <div>
            <label className="block text-[10px] uppercase tracking-[0.25em] text-pink mb-2">
              Stencil Size
            </label>
            <div className="space-y-2">
              {Object.entries(STENCIL_SIZES).map(([key, size]) => (
                <label
                  key={key}
                  className="flex items-center space-x-3 p-3 border hairline-white cursor-pointer hover:bg-white/5"
                >
                  <input
                    type="radio"
                    name="size"
                    value={key}
                    checked={selectedSize === key}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    className="accent-[#ff1f6b]"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{size.name}</div>
                    <div className="text-[11px] text-white/50">{size.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Paper Size */}
          <div>
            <label className="block text-[10px] uppercase tracking-[0.25em] text-pink mb-2">
              Paper Size (thermal printer)
            </label>
            <div className="space-y-2">
              {Object.values(PAPER_SIZES).map((paper) => (
                <label
                  key={paper.key}
                  className="flex items-center space-x-3 p-3 border hairline-white cursor-pointer hover:bg-white/5"
                >
                  <input
                    type="radio"
                    name="paperSize"
                    value={paper.key}
                    checked={paperSize === paper.key}
                    onChange={(e) => setPaperSize(e.target.value)}
                    className="accent-[#ff1f6b]"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{paper.name}</div>
                    <div className="text-[11px] text-white/50">
                      {paper.widthInches.toFixed(2)}" × {paper.heightInches.toFixed(2)}"
                    </div>
                  </div>
                </label>
              ))}

              <label className="flex items-center space-x-3 p-3 border hairline-white cursor-pointer hover:bg-white/5">
                <input
                  type="radio"
                  name="paperSize"
                  value="custom"
                  checked={paperSize === 'custom'}
                  onChange={(e) => setPaperSize(e.target.value)}
                  className="accent-[#ff1f6b]"
                />
                <div className="flex-1">
                  <div className="font-medium">Custom</div>
                  <div className="text-[11px] text-white/50">Specify width & height</div>
                </div>
              </label>
            </div>

            {paperSize === 'custom' && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-[11px] text-white/60 mb-1">Width</label>
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    value={customPaper.width}
                    onChange={(e) => handleCustomPaperChange('width', e.target.value)}
                    className="w-full bg-black border-2 hairline focus:border-pink px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-white/60 mb-1">Height</label>
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    value={customPaper.height}
                    onChange={(e) => handleCustomPaperChange('height', e.target.value)}
                    className="w-full bg-black border-2 hairline focus:border-pink px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-white/60 mb-1">Units</label>
                  <select
                    value={customPaper.unit}
                    onChange={(e) => handleCustomPaperChange('unit', e.target.value)}
                    className="w-full bg-black border-2 hairline focus:border-pink px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="inches">Inches</option>
                    <option value="cm">Centimeters</option>
                  </select>
                </div>
              </div>
            )}

            {dimensionError && (
              <p className="text-[11px] text-pink mt-2">{dimensionError}</p>
            )}
            <p className="text-[11px] text-white/50 mt-2">
              Recommended: {formattedRecommendedPaper}
            </p>
          </div>

          {/* Format Selector */}
          <div>
            <label className="block text-[10px] uppercase tracking-[0.25em] text-pink mb-2">
              Export Format
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setExportFormat('png')}
                className={formatButtonClass('png')}
              >
                PNG (thermal ready)
              </button>
              <button
                type="button"
                onClick={() => setExportFormat('pdf')}
                className={formatButtonClass('pdf')}
              >
                PDF (with crop marks)
              </button>
            </div>
          </div>

          {/* Processing Mode */}
          <div>
            <label className="block text-[10px] uppercase tracking-[0.25em] text-pink mb-2">
              Processing Mode
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setProcessingMode('threshold')}
                className={`press flex-1 px-4 py-2 text-[11px] uppercase tracking-[0.18em] transition-colors ${
                  processingMode === 'threshold'
                    ? 'bg-pink text-black'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                Threshold
              </button>
              <button
                onClick={() => setProcessingMode('edge')}
                className={`press flex-1 px-4 py-2 text-[11px] uppercase tracking-[0.18em] transition-colors ${
                  processingMode === 'edge'
                    ? 'bg-pink text-black'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                Edge Detection
              </button>
            </div>
            <p className="text-[11px] text-white/50 mt-1">
              {processingMode === 'threshold'
                ? 'Classic threshold-based conversion (fast)'
                : 'Canny edge detection for crisp linework (slower)'}
            </p>
          </div>

          {/* Style Preset */}
          <div>
            <label className="block text-[10px] uppercase tracking-[0.25em] text-pink mb-2">
              Style Preset
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              className="w-full px-3 py-2 bg-black border-2 hairline focus:border-pink text-white focus:outline-none"
            >
              {Object.entries(STYLE_PRESETS).map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.name} - {preset.description}
                </option>
              ))}
            </select>
          </div>

          {/* Advanced Controls */}
          <div className="border hairline-white p-4 space-y-3">
            <p className="text-[10px] text-pink uppercase tracking-[0.25em]">
              Advanced Controls
            </p>

            <div>
              <label className="block text-[11px] text-white/60 mb-1">
                Threshold: {customSettings.threshold}
              </label>
              <input
                type="range"
                min="50"
                max="200"
                value={customSettings.threshold}
                onChange={(e) => setCustomSettings({
                  ...customSettings,
                  threshold: parseInt(e.target.value, 10)
                })}
                className="w-full accent-[#ff1f6b]"
              />
              <div className="flex justify-between text-[11px] text-white/50 mt-1">
                <span>More Black</span>
                <span>More White</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-white/60 mb-1">
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
                className="w-full accent-[#ff1f6b]"
              />
            </div>

            <div>
              <label className="block text-[11px] text-white/60 mb-1">
                Brightness: {customSettings.brightness > 0 ? '+' : ''}{customSettings.brightness}
              </label>
              <input
                type="range"
                min="-50"
                max="50"
                value={customSettings.brightness}
                onChange={(e) => setCustomSettings({
                  ...customSettings,
                  brightness: parseInt(e.target.value, 10)
                })}
                className="w-full accent-[#ff1f6b]"
              />
            </div>
          </div>

          {/* Metadata */}
          <div className="border hairline-white p-4 space-y-3">
            <p className="text-[10px] text-pink uppercase tracking-[0.25em]">
              Metadata (embedded in PDF/PNG)
            </p>
            <div>
              <label className="block text-[11px] text-white/60 mb-1">
                Design Name
              </label>
              <input
                type="text"
                value={designTitle}
                onChange={(e) => setDesignTitle(e.target.value)}
                className="w-full bg-black border-2 hairline focus:border-pink px-3 py-2 text-white focus:outline-none"
                placeholder="Dragon Sleeve"
              />
            </div>
            <div>
              <label className="block text-[11px] text-white/60 mb-1">
                Artist Notes (optional)
              </label>
              <textarea
                value={artistNotes}
                onChange={(e) => setArtistNotes(e.target.value.slice(0, 280))}
                className="w-full bg-black border-2 hairline focus:border-pink px-3 py-2 text-white focus:outline-none"
                rows={3}
                placeholder="Placement, transfer tape, needle callouts..."
              />
              <div className="text-[11px] text-white/50 mt-1">
                {artistNotes.length}/280 characters
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGeneratePreview}
            disabled={isProcessing}
            className="press w-full bg-pink text-black py-3 font-display uppercase text-[14px] tracking-[0.2em] hover:bg-pink-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? 'Processing...' : 'Generate Stencil Preview'}
          </button>
        </div>

        {/* Preview Panel */}
        <div className="space-y-4">
          <div className="bg-white p-4 min-h-[400px] flex items-center justify-center">
            {stencilPreview ? (
              <img
                src={stencilPreview}
                alt="Stencil Preview"
                className="w-full"
                style={{ imageRendering: 'crisp-edges' }}
              />
            ) : (
              <div className="text-center text-black/50">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p>Click "Generate Stencil Preview" to see result</p>
              </div>
            )}
          </div>

          <div className="border hairline-white p-4 text-[12px] text-white/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Dimension Preview</span>
              <span className="text-[11px] text-pink">
                Scale: {scalePercent}% {scalePercent === 100 ? '(True size)' : ''}
              </span>
            </div>
            <div className="text-[11px] text-white/60 space-y-1">
              <p>
                Design: {designDimensions.widthInches.toFixed(2)}" × {designDimensions.heightInches.toFixed(2)}" @300 DPI
              </p>
              {paperCalculation.paperDimensions && (
                <p>
                  Paper: {paperCalculation.paperDimensions.widthInches.toFixed(2)}" × {paperCalculation.paperDimensions.heightInches.toFixed(2)}"
                </p>
              )}
              <p>
                Format: {exportFormat.toUpperCase()} • Crop marks & registration guides applied
              </p>
            </div>
          </div>

          <div className="border hairline-white p-4 text-[12px] text-white/70">
            <div className="flex items-center justify-between">
              <span className="font-medium">Estimated File Size</span>
              <span className="text-[11px] text-white/60">
                {estimatedFileSize ? formatFileSize(estimatedFileSize) : 'Generate preview to estimate'}
              </span>
            </div>
            <p className="text-[11px] text-white/50 mt-2">
              PDF exports embed metadata, crop marks, and registration guides for thermal printers.
            </p>
          </div>

          {(exportProgress > 0 || isExportingPDF) && (
            <div>
              <div className="flex items-center justify-between text-[11px] text-white/50 mb-1">
                <span>Export Progress</span>
                <span>{exportProgress}%</span>
              </div>
              <div className="w-full bg-white/10 h-2">
                <div
                  className="h-2 bg-pink transition-all"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          )}

          {statusMessage && (
            <p className="text-[11px] text-white/50">{statusMessage}</p>
          )}

          {stencilPreview && (
            <div className="grid sm:grid-cols-2 gap-3">
              <button
                onClick={handleDownloadPNG}
                className={`press w-full py-3 text-[12px] uppercase tracking-[0.18em] transition-colors flex items-center justify-center space-x-2 ${
                  exportFormat === 'png'
                    ? 'bg-pink text-black hover:bg-pink-deep'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download PNG</span>
              </button>

              <button
                onClick={handleDownloadPDF}
                disabled={isExportingPDF}
                className={`press w-full py-3 text-[12px] uppercase tracking-[0.18em] transition-colors flex items-center justify-center space-x-2 ${
                  exportFormat === 'pdf'
                    ? 'bg-pink text-black hover:bg-pink-deep'
                    : 'bg-black text-pink border-2 border-pink hover:bg-pink hover:text-black'
                } ${isExportingPDF ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" />
                </svg>
                <span>{isExportingPDF ? 'Generating PDF...' : 'Download PDF'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 border hairline p-4">
        <h4 className="text-[10px] text-pink uppercase tracking-[0.25em] mb-2 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          Pro Export Tips
        </h4>
        <ul className="text-[12px] text-white/70 space-y-1">
          <li>• Print at 100% scale for accurate sizing</li>
          <li>• Use thermal printer or copier transfer method</li>
          <li>• Adjust threshold if lines are too thick/thin</li>
          <li>• Higher contrast = bolder, more defined lines</li>
          <li>• Metadata is embedded for printer history and QA</li>
        </ul>
      </div>
    </div>
  );
}

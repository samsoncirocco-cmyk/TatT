/**
 * Inpainting Editor Component
 *
 * Allows users to customize AI-generated tattoo designs by:
 * 1. Painting a mask over areas to modify
 * 2. Providing a new prompt for those areas
 * 3. Regenerating only the masked regions
 *
 * Mobile-first, intuitive brush controls
 */

import { useState, useRef, useEffect } from 'react';
import { inpaintTattooDesign, createMaskCanvas, getInpaintingCost } from '../services/inpaintingService';

export default function InpaintingEditor({ imageUrl, onClose, onSave }) {
  // Canvas refs
  const imageCanvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);

  // State
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('blurry, low quality, distorted, deformed, ugly, bad anatomy');
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Canvas dimensions
  const [canvasSize, setCanvasSize] = useState({ width: 1024, height: 1024 });

  // Load image and initialize canvases
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const aspectRatio = img.width / img.height;
      const maxSize = 1024;

      let width, height;
      if (aspectRatio > 1) {
        width = maxSize;
        height = maxSize / aspectRatio;
      } else {
        height = maxSize;
        width = maxSize * aspectRatio;
      }

      setCanvasSize({ width, height });

      // Draw image on image canvas
      const imageCanvas = imageCanvasRef.current;
      const imageCtx = imageCanvas.getContext('2d');
      imageCanvas.width = width;
      imageCanvas.height = height;
      imageCtx.drawImage(img, 0, 0, width, height);

      // Initialize mask canvas (black background)
      const maskCanvas = maskCanvasRef.current;
      const maskCtx = maskCanvas.getContext('2d');
      maskCanvas.width = width;
      maskCanvas.height = height;
      maskCtx.fillStyle = 'black';
      maskCtx.fillRect(0, 0, width, height);

      // Initialize overlay canvas (transparent)
      const overlayCanvas = overlayCanvasRef.current;
      const overlayCtx = overlayCanvas.getContext('2d');
      overlayCanvas.width = width;
      overlayCanvas.height = height;
      overlayCtx.clearRect(0, 0, width, height);

      setImageLoaded(true);
    };

    img.onerror = () => {
      setError('Failed to load image');
    };

    img.src = imageUrl;
  }, [imageUrl]);

  // Get mouse/touch position relative to canvas
  const getCanvasPosition = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  // Draw on both mask and overlay canvases
  const drawBrush = (x, y) => {
    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas.getContext('2d');
    const overlayCanvas = overlayCanvasRef.current;
    const overlayCtx = overlayCanvas.getContext('2d');

    // Draw white on mask (areas to inpaint)
    maskCtx.fillStyle = 'white';
    maskCtx.beginPath();
    maskCtx.arc(x, y, brushSize, 0, Math.PI * 2);
    maskCtx.fill();

    // Draw semi-transparent red on overlay (visual feedback)
    overlayCtx.fillStyle = 'rgba(255, 59, 48, 0.5)';
    overlayCtx.beginPath();
    overlayCtx.arc(x, y, brushSize, 0, Math.PI * 2);
    overlayCtx.fill();
  };

  // Mouse/touch event handlers
  const startDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = overlayCanvasRef.current;
    const pos = getCanvasPosition(e, canvas);
    drawBrush(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = overlayCanvasRef.current;
    const pos = getCanvasPosition(e, canvas);
    drawBrush(pos.x, pos.y);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Clear mask
  const clearMask = () => {
    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas.getContext('2d');
    maskCtx.fillStyle = 'black';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    const overlayCanvas = overlayCanvasRef.current;
    const overlayCtx = overlayCanvas.getContext('2d');
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  };

  // Handle inpainting
  const handleInpaint = async () => {
    if (!prompt.trim()) {
      setError('Please describe what you want to add in the painted area');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('[InpaintingEditor] Starting inpainting...');

      const result = await inpaintTattooDesign({
        imageUrl,
        maskCanvas: maskCanvasRef.current,
        prompt,
        negativePrompt,
        guidanceScale,
        numInferenceSteps: 50
      });

      console.log('[InpaintingEditor] Inpainting complete!');

      // Call onSave callback with new image
      if (onSave) {
        onSave(result);
      }

    } catch (err) {
      console.error('[InpaintingEditor] Error:', err);
      setError(err.message || 'Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const costEstimate = getInpaintingCost(50);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-panel border border-white/10 rounded-2xl shadow-xl max-w-5xl w-full text-white">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Edit Your Design
              </h2>
              <p className="text-sm text-white/60 mt-1">
                Paint over areas you want to change, then describe what you'd like instead
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Main Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Canvas Area */}
              <div className="space-y-4">
                <div className="bg-black/30 rounded-lg p-4">
                  <div className="relative" style={{ maxWidth: '100%', aspectRatio: `${canvasSize.width}/${canvasSize.height}` }}>
                    {/* Image Canvas (background) */}
                    <canvas
                      ref={imageCanvasRef}
                      className="absolute inset-0 w-full h-full rounded-lg"
                      style={{ imageRendering: 'crisp-edges' }}
                    />

                    {/* Mask Canvas (hidden) */}
                    <canvas
                      ref={maskCanvasRef}
                      className="hidden"
                    />

                    {/* Overlay Canvas (drawing surface) */}
                    <canvas
                      ref={overlayCanvasRef}
                      className="absolute inset-0 w-full h-full rounded-lg cursor-crosshair touch-none"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />

                    {/* Loading overlay */}
                    {!imageLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                        <div className="text-white/60">Loading image...</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Brush Controls */}
                <div className="bg-black/30 rounded-lg p-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Brush Size: {brushSize}px
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-full accent-ducks-green"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={clearMask}
                      className="flex-1 py-2 px-4 bg-white/10 text-white/70 rounded-lg hover:bg-white/20 transition-colors font-medium"
                    >
                      Clear Mask
                    </button>
                  </div>
                </div>
              </div>

              {/* Controls Area */}
              <div className="space-y-4">
                {/* Prompt Input */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    What should replace the painted area?
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., add cherry blossoms, change to a dragon, remove background..."
                    className="w-full px-4 py-3 border border-white/10 rounded-lg bg-black/40 text-white focus:ring-2 focus:ring-ducks-green focus:border-transparent resize-none"
                    rows={3}
                  />
                  <p className="mt-1 text-xs text-white/50">
                    Be specific about what you want in the painted area
                  </p>
                </div>

                {/* Advanced Options Toggle */}
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-sm text-ducks-green hover:text-white font-medium"
                >
                  {showAdvanced ? '▼' : '▶'} Tattoo Fine-Tuning
                </button>

                {showAdvanced && (
                  <div className="space-y-3 bg-black/30 rounded-lg p-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        The "No-Go" List
                      </label>
                      <textarea
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-white/10 rounded-lg bg-black/40 text-white focus:ring-2 focus:ring-ducks-green focus:border-transparent resize-none"
                        rows={2}
                      />
                      <p className="mt-1 text-xs text-white/50">
                        What to avoid in the generation
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        Guidance Scale: {guidanceScale}
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        step="0.5"
                        value={guidanceScale}
                        onChange={(e) => setGuidanceScale(Number(e.target.value))}
                        className="w-full accent-ducks-green"
                      />
                      <p className="mt-1 text-xs text-white/50">
                        How closely to follow your prompt (7-8 recommended)
                      </p>
                    </div>
                  </div>
                )}

                {/* Cost Estimate */}
                <div className="bg-ducks-green/10 border border-ducks-green/30 rounded-lg p-3">
                  <p className="text-sm text-ducks-green/90">
                    Estimated cost: <span className="font-medium">{costEstimate.formatted}</span>
                  </p>
                  <p className="text-xs text-ducks-green/60 mt-1">
                    Processing time: ~10-20 seconds
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <p className="text-sm text-red-200">{error}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={handleInpaint}
                    disabled={isProcessing || !prompt.trim() || !imageLoaded}
                    className={`w-full py-4 rounded-lg font-semibold text-white transition-all ${
                      isProcessing || !prompt.trim() || !imageLoaded
                        ? 'bg-white/20 cursor-not-allowed'
                        : 'bg-ducks-yellow text-black hover:bg-white active:scale-98'
                    }`}
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing... This may take 10-20 seconds
                      </span>
                    ) : (
                      'Generate Edited Design'
                    )}
                  </button>

                  <button
                    onClick={onClose}
                    disabled={isProcessing}
                    className="w-full py-3 rounded-lg font-medium text-white/70 bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>

                {/* Instructions */}
                <div className="bg-black/30 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-white mb-2">
                    How to use:
                  </h3>
                  <ol className="text-sm text-white/70 space-y-1 list-decimal list-inside">
                    <li>Paint over the area you want to modify (shown in red)</li>
                    <li>Describe what you want in that area</li>
                    <li>Click "Generate Edited Design"</li>
                    <li>Wait ~10-20 seconds for AI processing</li>
                  </ol>
                  <p className="text-xs text-white/50 mt-3">
                    Tip: Be specific in your prompt for best results. You can paint multiple areas before generating.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import designsData from '../data/designs.json';
import { requestCameraAccess, stopCameraStream, captureFrame, ARSessionState, captureDepthFrame } from '../services/ar/arService';
import { validateDepthQuality, calculateSurfaceNormal, estimateCurvature } from '../services/ar/depthMappingService';
import { detectBodyPart, validatePlacementAccuracy } from '../utils/anatomicalMapping';
import { safeLocalStorageGet, safeLocalStorageSet } from '../services/storageService';


const CONFIDENCE_TIPS = [
  "Looking good! 87% of users feel more confident after preview.",
  "Try moving your arm to see how the design flows.",
  "Check the design from different angles.",
  "Placement is key - try a few centimeters up or down.",
  "Visualize your new look!",
  "Take your time to find the perfect spot."
];

function Visualize() {
  const [photo, setPhoto] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [currentConfidenceTip, setCurrentConfidenceTip] = useState("");
  const [stream, setStream] = useState(null);
  const [arState, setArState] = useState(ARSessionState.IDLE);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const photoRef = useRef(null);
  const compositeCanvasRef = useRef(null);

  // Tattoo design and category state
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filteredDesigns, setFilteredDesigns] = useState(designsData.designs);

  // Tattoo overlay state
  const [selectedTattoo, setSelectedTattoo] = useState(null);
  const [tattooPosition, setTattooPosition] = useState({ x: 50, y: 50 }); // percentage
  const [tattooSize, setTattooSize] = useState(30); // percentage
  const [tattooRotation, setTattooRotation] = useState(0); // degrees
  const [tattooOpacity, setTattooOpacity] = useState(0.8);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const tattooRef = useRef(null);

  // Touch gesture state for pinch and rotate
  const [initialDistance, setInitialDistance] = useState(null);
  const [initialRotation, setInitialRotation] = useState(null);
  const [initialSize, setInitialSize] = useState(null);
  const [initialAngle, setInitialAngle] = useState(null);

  // Depth and Accuracy state
  const [depthMap, setDepthMap] = useState(null);
  const [depthQuality, setDepthQuality] = useState(null);
  const [placementAccuracy, setPlacementAccuracy] = useState(null);
  const [detectedBodyPart, setDetectedBodyPart] = useState(null);
  const [savedPlacements, setSavedPlacements] = useState([]);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [surfaceNormal, setSurfaceNormal] = useState({ x: 0, y: 0, z: 1 });
  const [surfaceCurvature, setSurfaceCurvature] = useState(0);

  // Filter designs by category
  useEffect(() => {
    if (selectedCategory === 'All') {
      setFilteredDesigns(designsData.designs);
    } else {
      setFilteredDesigns(
        designsData.designs.filter(design => design.category === selectedCategory)
      );
    }
  }, [selectedCategory]);

  // Cleanup camera stream when component unmounts or camera closes
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Rotate confidence tips
  useEffect(() => {
    if (photo && selectedTattoo) {
      // Set initial tip
      setCurrentConfidenceTip(CONFIDENCE_TIPS[0]);

      const interval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * CONFIDENCE_TIPS.length);
        setCurrentConfidenceTip(CONFIDENCE_TIPS[randomIndex]);
      }, 5000);

      return () => clearInterval(interval);
      setSavedPlacements(safeLocalStorageGet('tattester_saved_placements', []));
    } else {
      setCurrentConfidenceTip("");
    }
  }, [photo, selectedTattoo]);

  // Real-time accuracy updates
  useEffect(() => {
    if (photo && selectedTattoo && depthMap) {
      const updateAccuracy = () => {
        const accuracy = validatePlacementAccuracy(
          { position: tattooPosition, scale: tattooSize, rotation: tattooRotation },
          depthMap
        );
        setPlacementAccuracy(accuracy);

        // Update surface normal for perspective
        if (photoRef.current) {
          const rect = photoRef.current.getBoundingClientRect();
          const imgX = (tattooPosition.x / 100) * (depthMap.length === 640 * 480 ? 640 : 1); // rough estimate
          const imgY = (tattooPosition.y / 100) * (depthMap.length === 640 * 480 ? 480 : 1);
          const normal = calculateSurfaceNormal(depthMap, imgX, imgY, 640);
          setSurfaceNormal(normal);

          // Curvature affects perceived size and warping
          const curvature = estimateCurvature(depthMap,
            { x: imgX - 20, y: imgY - 20, width: 40, height: 40 },
            640
          );
          setSurfaceCurvature(curvature);
        }
      };

      const interval = setInterval(updateAccuracy, 500);
      return () => clearInterval(interval);
    }
  }, [photo, selectedTattoo, tattooPosition, tattooSize, tattooRotation, depthMap]);

  // Start camera with improved state management
  const startCamera = async () => {
    setArState(ARSessionState.REQUESTING_PERMISSION);

    try {
      const mediaStream = await requestCameraAccess();

      setStream(mediaStream);
      setShowCamera(true);
      setArState(ARSessionState.LOADING);

      setTimeout(async () => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = async () => {
            setArState(ARSessionState.CALIBRATING_DEPTH);
            setIsCalibrating(true);

            // Simulate depth calibration
            await new Promise(resolve => setTimeout(resolve, 2000));

            const depth = await captureDepthFrame(videoRef.current);
            const quality = validateDepthQuality(depth);
            const bodyPart = await detectBodyPart(videoRef.current, depth);

            setDepthMap(depth);
            setDepthQuality(quality);
            setDetectedBodyPart(bodyPart);
            setArState(ARSessionState.ACTIVE);
            setIsCalibrating(false);
          };
        }
      }, 100);
    } catch (error) {
      console.error('Error accessing camera:', error);

      // Set appropriate error state based on error message
      if (error.message.includes('permission denied')) {
        setArState(ARSessionState.PERMISSION_DENIED);
      } else if (error.message.includes('No camera found')) {
        setArState(ARSessionState.NO_CAMERA);
      } else {
        setArState(ARSessionState.ERROR);
      }
      setIsCalibrating(false);
    }
  };

  // Capture photo from camera using AR service
  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      try {
        const photoData = captureFrame(videoRef.current, canvasRef.current);
        const currentDepth = await captureDepthFrame(videoRef.current);

        setPhoto(photoData);
        setDepthMap(currentDepth);

        // Final depth quality check
        const quality = validateDepthQuality(currentDepth);
        setDepthQuality(quality);

        stopCamera();
      } catch (error) {
        console.error('Failed to capture photo:', error);
        setArState(ARSessionState.ERROR);
      }
    }
  };

  // Stop camera stream with cleanup
  const stopCamera = () => {
    if (stream) {
      stopCameraStream(stream);
      setStream(null);
    }
    setShowCamera(false);
    setArState(ARSessionState.IDLE);
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setPhoto(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Reset to choose new photo
  const resetPhoto = () => {
    setPhoto(null);
    setSelectedTattoo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Calculate distance between two touch points
  const getDistance = (touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Calculate angle between two touch points
  const getAngle = (touch1, touch2) => {
    return Math.atan2(touch2.clientY - touch1.clientY, touch2.clientX - touch1.clientX) * 180 / Math.PI;
  };

  // Handle mouse/touch drag start
  const handleDragStart = (e) => {
    e.preventDefault();
    setIsDragging(true);

    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

    setDragStart({ x: clientX, y: clientY });

    // Handle pinch gestures
    if (e.type.includes('touch') && e.touches.length === 2) {
      const distance = getDistance(e.touches[0], e.touches[1]);
      const angle = getAngle(e.touches[0], e.touches[1]);
      setInitialDistance(distance);
      setInitialSize(tattooSize);
      setInitialRotation(tattooRotation);
      setInitialAngle(angle);
    }
  };

  // Handle mouse/touch drag move
  const handleDragMove = (e) => {
    if (!isDragging && (!e.touches || e.touches.length < 2)) return;

    e.preventDefault();

    // Handle pinch and rotate gestures
    if (e.type.includes('touch') && e.touches.length === 2) {
      if (initialDistance && initialSize !== null) {
        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        const scale = currentDistance / initialDistance;
        const newSize = Math.max(10, Math.min(100, initialSize * scale));
        setTattooSize(newSize);
      }

      if (initialAngle !== null && initialRotation !== null) {
        const currentAngle = getAngle(e.touches[0], e.touches[1]);
        const angleDiff = currentAngle - initialAngle;
        setTattooRotation(initialRotation + angleDiff);
      }
      return;
    }

    // Handle drag positioning
    if (!isDragging) return;

    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

    if (photoRef.current) {
      const rect = photoRef.current.getBoundingClientRect();
      const deltaX = ((clientX - dragStart.x) / rect.width) * 100;
      const deltaY = ((clientY - dragStart.y) / rect.height) * 100;

      setTattooPosition(prev => ({
        x: Math.max(0, Math.min(100, prev.x + deltaX)),
        y: Math.max(0, Math.min(100, prev.y + deltaY))
      }));

      setDragStart({ x: clientX, y: clientY });
    }
  };

  // Handle mouse/touch drag end
  const handleDragEnd = () => {
    setIsDragging(false);
    setInitialDistance(null);
    setInitialSize(null);
    setInitialAngle(null);
    setInitialRotation(null);
  };

  // Save composite image
  const saveImage = async () => {
    if (!photo || !selectedTattoo || !photoRef.current || !tattooRef.current) {
      alert('Please select both a photo and a tattoo design');
      return;
    }

    const canvas = compositeCanvasRef.current;
    const ctx = canvas.getContext('2d');

    // Create image objects
    const photoImg = new Image();
    const tattooImg = new Image();

    photoImg.onload = () => {
      canvas.width = photoImg.width;
      canvas.height = photoImg.height;
      ctx.drawImage(photoImg, 0, 0);

      tattooImg.onload = () => {
        const tattooWidth = (canvas.width * tattooSize) / 100;
        const tattooHeight = tattooWidth;
        const x = (canvas.width * tattooPosition.x) / 100 - tattooWidth / 2;
        const y = (canvas.height * tattooPosition.y) / 100 - tattooHeight / 2;

        ctx.save();
        ctx.globalAlpha = tattooOpacity;
        ctx.translate(x + tattooWidth / 2, y + tattooHeight / 2);
        ctx.rotate((tattooRotation * Math.PI) / 180);
        ctx.translate(-(x + tattooWidth / 2), -(y + tattooHeight / 2));
        ctx.drawImage(tattooImg, x, y, tattooWidth, tattooHeight);
        ctx.restore();

        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `tatt-tester-${Date.now()}.jpg`;
          link.click();
          URL.revokeObjectURL(url);
        }, 'image/jpeg', 0.95);
      };

      tattooImg.src = selectedTattoo.file;
    };

    photoImg.src = photo;
  };

  // Save current placement configuration
  const savePlacement = () => {
    if (!selectedTattoo) return;

    const newPlacement = {
      id: Date.now(),
      designId: selectedTattoo.id,
      bodyPart: detectedBodyPart?.name || 'unknown',
      position: tattooPosition,
      rotation: tattooRotation,
      scale: tattooSize,
      opacity: tattooOpacity,
      accuracy: placementAccuracy?.errorCm,
      timestamp: new Date().toISOString()
    };

    const updated = [...savedPlacements, newPlacement];
    setSavedPlacements(updated);
    safeLocalStorageSet('tattester_saved_placements', updated);
    alert('Placement saved successfully!');
  };

  // Load a saved placement
  const loadPlacement = (placement) => {
    const design = designsData.designs.find(d => d.id === placement.designId);
    if (design) {
      setSelectedTattoo(design);
      setTattooPosition(placement.position);
      setTattooRotation(placement.rotation);
      setTattooSize(placement.scale);
      setTattooOpacity(placement.opacity || 0.8);
    }
  };

  // Camera view
  if (showCamera) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col">
        <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <button
            onClick={stopCamera}
            className="text-gray-600 hover:text-gray-900 text-sm uppercase tracking-wider"
          >
            Cancel
          </button>
          <h2 className="text-sm uppercase tracking-wider text-gray-900">Camera</h2>
          <div className="w-16"></div>
        </div>

        <div className="flex-1 relative flex items-center justify-center bg-black">
          {/* AR State Banner */}
          {arState === ARSessionState.REQUESTING_PERMISSION && (
            <div className="absolute top-4 left-4 right-4 bg-blue-500 text-white px-4 py-3 rounded-lg shadow-lg z-10">
              <p className="text-sm font-medium">📷 Requesting camera access...</p>
            </div>
          )}
          {arState === ARSessionState.PERMISSION_DENIED && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-10 p-6">
              <div className="bg-white rounded-lg p-6 max-w-sm text-center">
                <p className="text-red-600 font-medium mb-2">⚠️ Camera Access Denied</p>
                <p className="text-gray-600 text-sm mb-4">
                  Please allow camera access in your browser settings and try again.
                </p>
                <button
                  onClick={stopCamera}
                  className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800"
                >
                  Go Back
                </button>
              </div>
            </div>
          )}
          {arState === ARSessionState.NO_CAMERA && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-10 p-6">
              <div className="bg-white rounded-lg p-6 max-w-sm text-center">
                <p className="text-red-600 font-medium mb-2">📷 No Camera Found</p>
                <p className="text-gray-600 text-sm mb-4">
                  Please connect a camera and try again, or upload a photo instead.
                </p>
                <button
                  onClick={stopCamera}
                  className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800"
                >
                  Go Back
                </button>
              </div>
            </div>
          )}
          {arState === ARSessionState.LOADING && (
            <div className="absolute top-4 left-4 right-4 bg-yellow-500 text-white px-4 py-3 rounded-lg shadow-lg z-10">
              <p className="text-sm font-medium">⏳ Loading camera...</p>
            </div>
          )}
          {arState === ARSessionState.CALIBRATING_DEPTH && (
            <div className="absolute top-4 left-4 right-4 bg-purple-600 text-white px-4 py-3 rounded-lg shadow-lg z-10 animate-pulse">
              <p className="text-sm font-medium">🎯 Calibrating Anatomical Depth...</p>
              <div className="w-full bg-purple-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-white h-full animate-grow-width"></div>
              </div>
            </div>
          )}
          {arState === ARSessionState.ACTIVE && (
            <div className="absolute top-4 left-4 right-4 flex flex-col gap-2 z-10">
              <div className="bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg animate-fade-in-up">
                <p className="text-sm font-medium">✓ Camera ready</p>
              </div>
              {detectedBodyPart && (
                <div className="bg-white/90 backdrop-blur px-3 py-1 rounded-full self-start text-[10px] uppercase tracking-widest font-bold text-gray-900 shadow-sm border border-gray-200">
                  Detected: {detectedBodyPart.name}
                </div>
              )}
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="max-w-full max-h-full object-contain"
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="bg-white border-t border-gray-200 p-8 flex justify-center items-center gap-4">
          <button
            onClick={capturePhoto}
            className="w-20 h-20 rounded-full border-4 border-gray-900 bg-white hover:bg-gray-100 transition-all active:scale-95 shadow-lg flex items-center justify-center"
          >
            <div className="w-16 h-16 rounded-full bg-gray-900"></div>
          </button>
          <span className="text-sm text-gray-600 font-light">Tap to capture</span>
        </div>

        {/* Onboarding Overlay */}
        {showOnboarding && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Capture Your Canvas</h3>
              <p className="text-gray-600 mb-6 text-sm">
                For the best AR result:
                <br />✨ Find bright, even lighting
                <br />📏 Keep the camera steady relative to your body
                <br />🎯 Center the body part
              </p>
              <button
                onClick={() => setShowOnboarding(false)}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                I'm Ready
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Editing view
  if (photo) {
    return (
      <div className="fixed inset-0 bg-white z-40 flex flex-col pt-16">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center sticky top-16 z-40">
          <button
            onClick={resetPhoto}
            className="text-gray-600 hover:text-gray-900 text-sm uppercase tracking-wider"
          >
            Back
          </button>
          <h1 className="text-sm uppercase tracking-wider text-gray-900">Visualize</h1>
          <button
            onClick={saveImage}
            disabled={!selectedTattoo}
            className={selectedTattoo ? 'text-gray-900 text-sm uppercase tracking-wider' : 'text-gray-400 text-sm uppercase tracking-wider cursor-not-allowed'}
          >
            Save
          </button>
        </div>

        {/* Photo Display */}
        <div className="flex-1 relative overflow-hidden bg-gray-100 flex items-center justify-center">
          <div className="relative max-w-full max-h-full">
            <img
              ref={photoRef}
              src={photo}
              alt="Selected photo"
              className="max-w-full max-h-full object-contain select-none"
              draggable={false}
            />

            {/* Confidence Trigger / Tip Overlay */}
            {currentConfidenceTip && (
              <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none fade-in">
                <div className="bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full text-xs font-medium shadow-lg animate-fade-in-up">
                  ✨ {currentConfidenceTip}
                </div>
              </div>
            )}

            {/* Placement Accuracy Badge */}
            {placementAccuracy && (
              <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                <div className={`px-3 py-1.5 rounded-lg backdrop-blur-md shadow-lg border ${placementAccuracy.errorCm <= 2 ? 'bg-green-500/80 border-green-400' : 'bg-yellow-500/80 border-yellow-400'
                  } text-white`}>
                  <div className="text-[10px] uppercase font-bold opacity-80 leading-tight">Accuracy</div>
                  <div className="text-sm font-black italic">±{placementAccuracy.errorCm}cm</div>
                </div>

                {depthQuality && (
                  <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${depthQuality.isReliable ? 'bg-blue-500/80 text-white' : 'bg-red-500/80 text-white'
                    }`}>
                    Depth: {depthQuality.isReliable ? 'Good' : 'Low'}
                  </div>
                )}
              </div>
            )}

            {/* Tattoo Overlay */}
            {selectedTattoo && (
              <div
                ref={tattooRef}
                className="absolute cursor-move"
                style={{
                  left: `${tattooPosition.x}%`,
                  top: `${tattooPosition.y}%`,
                  transform: `translate(-50%, -50%) rotate(${tattooRotation}deg) rotateX(${surfaceNormal.y * 45}deg) rotateY(${surfaceNormal.x * 45}deg) scale(${1 - surfaceCurvature * 0.2})`,
                  width: `${tattooSize}%`,
                  opacity: tattooOpacity,
                  touchAction: 'none',
                  perspective: '1000px',
                  transformStyle: 'preserve-3d',
                  filter: `blur(${surfaceCurvature * 0.5}px)` // subtle warp effect
                }}
                onMouseDown={handleDragStart}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onTouchStart={handleDragStart}
                onTouchMove={handleDragMove}
                onTouchEnd={handleDragEnd}
              >
                <img
                  src={selectedTattoo.file}
                  alt={selectedTattoo.name}
                  className="w-full h-full object-contain select-none pointer-events-none"
                  draggable={false}
                />
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        {selectedTattoo && (
          <div className="bg-white border-t border-gray-200 p-6">
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-600 mb-3">
                  Size: {tattooSize}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={tattooSize}
                  onChange={(e) => setTattooSize(Number(e.target.value))}
                  className="w-full h-px bg-gray-300 appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-600 mb-3">
                  Rotation: {Math.round(tattooRotation)}°
                </label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={tattooRotation}
                  onChange={(e) => setTattooRotation(Number(e.target.value))}
                  className="w-full h-px bg-gray-300 appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-600 mb-3">
                  Opacity: {Math.round(tattooOpacity * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={tattooOpacity}
                  onChange={(e) => setTattooOpacity(Number(e.target.value))}
                  className="w-full h-px bg-gray-300 appearance-none cursor-pointer"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  onClick={savePlacement}
                  className="flex-1 py-3 bg-gray-900 text-white text-xs uppercase tracking-widest font-bold hover:bg-black transition-colors"
                >
                  Save Placement
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Saved Placements */}
        {savedPlacements.length > 0 && (
          <div className="bg-gray-50 border-t border-gray-200 p-4">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-3">Saved Placements</h3>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {savedPlacements.map((p) => (
                <button
                  key={p.id}
                  onClick={() => loadPlacement(p)}
                  className="flex-shrink-0 px-3 py-2 bg-white border border-gray-200 rounded text-[10px] hover:border-gray-900 transition-all text-left min-w-[120px]"
                >
                  <p className="font-bold truncate">{p.bodyPart}</p>
                  <p className="text-gray-400">±{p.accuracy}cm accurate</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex gap-3 overflow-x-auto">
            {designsData.categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex-shrink-0 px-4 py-2 rounded-none text-xs uppercase tracking-wider transition-all ${selectedCategory === category
                  ? 'bg-gray-900 text-white'
                  : 'border border-gray-300 text-gray-700 hover:border-gray-900'
                  }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Design Selection */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="mb-3 text-center">
            <p className="text-xs uppercase tracking-wider text-gray-600">
              {selectedTattoo ? selectedTattoo.name : `${filteredDesigns.length} Designs`}
            </p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {filteredDesigns.map((tattoo) => (
              <button
                key={tattoo.id}
                onClick={() => setSelectedTattoo(tattoo)}
                className={`flex-shrink-0 w-20 h-20 border p-2 transition-all ${selectedTattoo?.id === tattoo.id
                  ? 'border-gray-900 bg-gray-100'
                  : 'border-gray-300 bg-white hover:border-gray-900'
                  }`}
                title={tattoo.name}
              >
                <img
                  src={tattoo.file}
                  alt={tattoo.name}
                  className="w-full h-full object-contain"
                />
              </button>
            ))}
          </div>
        </div>

        <canvas ref={compositeCanvasRef} className="hidden" />
      </div>
    );
  }

  // Initial view
  return (
    <div className="min-h-screen pt-20 bg-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-5xl font-light tracking-tight mb-4 text-gray-900">
          Visualize
        </h1>
        <p className="text-gray-600 mb-12 font-light">
          Take or upload a photo to preview tattoo designs
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <button
            onClick={startCamera}
            className="group border border-gray-200 hover:border-gray-900 p-12 text-left transition-all"
          >
            <svg className="w-16 h-16 mb-6 text-gray-300 group-hover:text-gray-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h2 className="text-2xl font-light mb-2 text-gray-900">Take Photo</h2>
            <p className="text-gray-600 font-light text-sm">
              Use your camera to capture an image
            </p>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="group border border-gray-200 hover:border-gray-900 p-12 text-left transition-all"
          >
            <svg className="w-16 h-16 mb-6 text-gray-300 group-hover:text-gray-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h2 className="text-2xl font-light mb-2 text-gray-900">Upload Photo</h2>
            <p className="text-gray-600 font-light text-sm">
              Choose from your photo library
            </p>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        <div className="border-t border-gray-200 pt-12">
          <h3 className="text-sm uppercase tracking-wider text-gray-600 mb-6">Best Practices</h3>
          <ul className="space-y-3 text-gray-700 font-light">
            <li>Use good lighting for clear photos</li>
            <li>Show the area where you want the tattoo</li>
            <li>Keep the camera steady for sharp images</li>
            <li>Maximum file size: 10MB</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Visualize;

import { useState, useRef, useEffect } from 'react';
import designsData from '../data/designs.json';
import { requestCameraAccess, stopCameraStream, captureFrame, ARSessionState, captureDepthFrame } from '../services/ar/arService';
import { validateDepthQuality, calculateSurfaceNormal, estimateCurvature } from '../services/ar/depthMappingService';
import { detectBodyPart, validatePlacementAccuracy } from '../utils/anatomicalMapping';
import { safeLocalStorageGet, safeLocalStorageSet } from '../services/storageService';
import Button from '../components/ui/Button';
import { Camera, Upload, RotateCw, Move, Check, AlertTriangle, Loader2 } from 'lucide-react';


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
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="glass-panel border-b border-white/10 p-4 flex justify-between items-center backdrop-blur-md sticky top-0 z-40">
          <button
            onClick={stopCamera}
            className="text-white hover:text-ducks-yellow transition-colors text-xs font-bold uppercase tracking-widest"
          >
            Cancel
          </button>
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-ducks-green px-2 py-1 bg-ducks-green/10 rounded">Camera // AR-Stream</h2>
          <div className="w-16"></div>
        </div>

        <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
          {/* AR State Banner */}
          {arState === ARSessionState.REQUESTING_PERMISSION && (
            <div className="absolute top-4 left-4 right-4 bg-ducks-green/20 border border-ducks-green/50 text-white px-4 py-3 rounded-lg shadow-glow-green z-10 backdrop-blur">
              <p className="text-sm font-bold flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Requesting Interface...</p>
            </div>
          )}

          {/* ... Other States Reskinned ... */}
          {arState === ARSessionState.ACTIVE && (
            <div className="absolute top-4 left-4 right-4 flex flex-col gap-2 z-10">
              <div className="bg-ducks-green/80 text-white px-4 py-3 rounded-lg shadow-glow-green animate-slide-up backdrop-blur">
                <p className="text-sm font-bold flex items-center gap-2"><Check size={16} /> Link Established</p>
              </div>
              {detectedBodyPart && (
                <div className="bg-black/60 backdrop-blur px-3 py-1 rounded-full self-start text-[10px] uppercase tracking-widest font-bold text-ducks-yellow border border-ducks-yellow/20 animate-fade-in-up">
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

        <div className="bg-black border-t border-white/10 p-8 flex justify-center items-center gap-4 bg-opacity-90 backdrop-blur">
          <button
            onClick={capturePhoto}
            className="w-20 h-20 rounded-full border-4 border-white bg-transparent hover:bg-white/10 transition-all active:scale-95 shadow-glow flex items-center justify-center group"
          >
            <div className="w-16 h-16 rounded-full bg-white group-hover:scale-90 transition-transform"></div>
          </button>
        </div>
      </div>
    );
  }

  // Editing view
  if (photo) {
    return (
      <div className="fixed inset-0 bg-black z-40 flex flex-col pt-16">
        {/* Header */}
        <div className="glass-panel border-b border-white/10 p-4 flex justify-between items-center sticky top-16 z-40 backdrop-blur-md">
          <button
            onClick={resetPhoto}
            className="text-gray-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
          >
            Back
          </button>
          <h1 className="text-xs uppercase tracking-widest text-ducks-green font-mono">Visualize // Edit</h1>
          <button
            onClick={saveImage}
            disabled={!selectedTattoo}
            className={selectedTattoo
              ? 'text-ducks-yellow hover:text-white transition-colors text-xs font-bold uppercase tracking-widest shadow-glow'
              : 'text-gray-600 text-xs font-bold uppercase tracking-widest cursor-not-allowed'}
          >
            Export
          </button>
        </div>

        {/* Photo Display */}
        <div className="flex-1 relative overflow-hidden bg-zinc-900 flex items-center justify-center">

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
                <div className="glass-panel border-ducks-green/30 text-white px-4 py-2 rounded-full text-xs font-bold shadow-glow-green animate-bounce-subtle">
                  {currentConfidenceTip}
                </div>
              </div>
            )}

            {/* Placement Accuracy Badge */}
            {placementAccuracy && (
              <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                <div className={`px-3 py-1.5 rounded-lg backdrop-blur-md shadow-lg border ${placementAccuracy.errorCm <= 2 ? 'bg-ducks-green/80 border-ducks-green' : 'bg-yellow-500/80 border-yellow-500'
                  } text-white`}>
                  <div className="text-[9px] uppercase font-bold opacity-80 leading-tight">Accuracy</div>
                  <div className="text-sm font-black italic">±{placementAccuracy.errorCm}cm</div>
                </div>
              </div>
            )}

            {/* Tattoo Overlay */}
            {selectedTattoo && (
              <div
                ref={tattooRef}
                className="absolute cursor-move border-2 border-transparent hover:border-ducks-yellow/50 transition-colors"
                style={{
                  left: `${tattooPosition.x}%`,
                  top: `${tattooPosition.y}%`,
                  transform: `translate(-50%, -50%) rotate(${tattooRotation}deg) rotateX(${surfaceNormal.y * 45}deg) rotateY(${surfaceNormal.x * 45}deg) scale(${1 - surfaceCurvature * 0.2})`,
                  width: `${tattooSize}%`,
                  opacity: tattooOpacity,
                  touchAction: 'none',
                  perspective: '1000px',
                  transformStyle: 'preserve-3d',
                  filter: `blur(${surfaceCurvature * 0.5}px)`
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

        {/* Controls - Glass Panel */}
        {selectedTattoo && (
          <div className="glass-panel border-t border-white/10 p-6 bg-black/80 backdrop-blur-xl">
            <div className="max-w-2xl mx-auto space-y-4">
              {/* Sliders with custom styles */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] w-12 font-bold text-gray-400 uppercase">Size</span>
                  <input type="range" min="10" max="100" value={tattooSize} onChange={(e) => setTattooSize(Number(e.target.value))} className="w-full accent-ducks-green h-1 bg-white/20 rounded-lg appearance-none cursor-pointer" />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] w-12 font-bold text-gray-400 uppercase">Rot</span>
                  <input type="range" min="0" max="360" value={tattooRotation} onChange={(e) => setTattooRotation(Number(e.target.value))} className="w-full accent-ducks-green h-1 bg-white/20 rounded-lg appearance-none cursor-pointer" />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <Button onClick={savePlacement} variant="secondary" size="sm" className="flex-1 w-full">
                  Save Placement
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Selection Bar */}
        <div className="glass-panel border-t border-white/10 p-4 bg-black/90 backdrop-blur pb-24">
          <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
            {filteredDesigns.map((tattoo) => (
              <button
                key={tattoo.id}
                onClick={() => setSelectedTattoo(tattoo)}
                className={`flex-shrink-0 w-16 h-16 rounded-xl border-2 overflow-hidden transition-all ${selectedTattoo?.id === tattoo.id
                    ? 'border-ducks-green shadow-glow-green scale-110'
                    : 'border-white/10 opacity-60 hover:opacity-100 hover:border-white/30'
                  }`}
              >
                <img src={tattoo.file} className="w-full h-full object-contain bg-white/5" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Initial view
  return (
    <div className="min-h-screen pt-24 px-6 pb-32">
      <div className="max-w-3xl mx-auto text-center space-y-12">

        <div className="space-y-4">
          <p className="text-ducks-green font-mono font-bold text-[10px] uppercase tracking-[0.5em]">AR Interface // Ready</p>
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tighter text-white">
            Visualize <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-ducks-green to-ducks-yellow">Ink.</span>
          </h1>
          <p className="text-gray-400 font-light max-w-lg mx-auto">
            Project designs directly onto your skin using depth-aware augmented reality.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <button
            onClick={startCamera}
            className="group relative overflow-hidden glass-panel p-8 rounded-3xl border border-white/10 hover:border-ducks-green/50 transition-all hover:scale-[1.02]"
          >
            <div className="absolute inset-0 bg-ducks-green/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Camera className="w-12 h-12 text-ducks-green mb-6" />
            <h2 className="text-2xl font-display font-bold text-white mb-2">Camera Feed</h2>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Real-time AR</p>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="group relative overflow-hidden glass-panel p-8 rounded-3xl border border-white/10 hover:border-ducks-yellow/50 transition-all hover:scale-[1.02]"
          >
            <div className="absolute inset-0 bg-ducks-yellow/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Upload className="w-12 h-12 text-ducks-yellow mb-6" />
            <h2 className="text-2xl font-display font-bold text-white mb-2">Upload Photo</h2>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Static Composite</p>
          </button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />
      </div>
    </div>
  );
}

export default Visualize;

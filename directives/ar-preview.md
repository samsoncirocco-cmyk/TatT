# AR Preview

## Goal
Enable users to visualize their tattoo design overlaid on their body in real-time using augmented reality, with realistic depth mapping and perspective correction.

## When to Use
- User wants to preview design placement before committing
- API endpoint: `POST /api/v1/ar/visualize`
- Trigger: User clicks "Preview on Body" button in design view

## Prerequisites
- Finalized design image (PNG with transparency preferred)
- Target body part selection (arm, chest, back, leg, etc.)
- Device camera access (mobile or desktop webcam)
- MindAR library loaded (face/body tracking)

## Steps

### 1. Initialize AR Session
**Location:** `src/services/ar/mindarSession.js` → `initSession()`
- Request camera permissions
- Load MindAR body tracker:
  - **Face tracking** for head/neck tattoos
  - **Body tracking** for torso/limbs (if available)
  - **Marker tracking** fallback for unsupported devices
- Start video stream at 640x480 (balance quality vs performance)

### 2. Detect Body Landmarks
**Location:** `src/services/ar/mindarLoader.js`
- MindAR detects key body points:
  - **Arm:** Shoulder, elbow, wrist
  - **Chest:** Sternum, clavicle
  - **Back:** Spine, shoulder blades
  - **Leg:** Hip, knee, ankle
- Return 3D coordinates + confidence scores (0-1)
- Filter out low-confidence detections (<0.6)

### 3. Calculate Depth Mapping
**Location:** `src/services/ar/depthMappingService.js`
- Estimate depth from camera to body part:
  - Use landmark distances (e.g., shoulder to elbow)
  - Compare to anatomical averages
  - Adjust for camera FOV and distance
- Apply depth-based scaling:
  - Closer body parts → larger tattoo
  - Farther body parts → smaller tattoo
- Calculate curvature compensation:
  - Cylindrical surfaces (arm, leg) → warp design
  - Flat surfaces (back, chest) → minimal warping

### 4. Position and Transform Design
**Location:** `src/services/ar/arService.js` → `positionTattoo()`
- Calculate transformation matrix:
  - Translation: Center design on target landmark
  - Rotation: Align with body orientation
  - Scale: Adjust for depth and user-specified size
  - Skew: Compensate for perspective distortion
- Apply real-time tracking updates (60fps for smooth motion)

### 5. Render Overlay
**Location:** `src/services/ar/arService.js` → `renderOverlay()`
- Composite design onto video stream:
  - Blend mode: Multiply (for realistic skin interaction)
  - Opacity: 80% (semi-transparent for realism)
  - Shadow: Subtle drop shadow for depth perception
- Apply lighting adjustment:
  - Detect ambient lighting from video frame
  - Adjust tattoo brightness/contrast to match
- Add occlusion handling:
  - Hide design behind body parts (e.g., arm in front of chest)

### 6. Real-Time Adjustment Controls
**Location:** `src/components/ar/ARControls.tsx`
- Provide UI sliders:
  - **Size:** 50% - 200% of default
  - **Rotation:** -180° to +180°
  - **Position:** Fine-tune X/Y offset
  - **Opacity:** 60% - 100%
- Update rendering in real-time (<16ms latency)

### 7. Capture Screenshot
**Location:** `src/services/ar/arService.js` → `captureFrame()`
- Freeze current video frame
- Render high-quality overlay (upscale to 1080p if possible)
- Export as PNG or JPEG
- Save to user's gallery or share directly

### 8. Return to Client
**Response Format (for API-based AR):**
```json
{
  "sessionId": "ar_session_123",
  "bodyPartDetected": "right_arm",
  "landmarks": [
    {"point": "shoulder", "x": 320, "y": 120, "confidence": 0.89},
    {"point": "elbow", "x": 280, "y": 280, "confidence": 0.92},
    {"point": "wrist", "x": 260, "y": 420, "confidence": 0.85}
  ],
  "transformMatrix": {
    "scale": 1.2,
    "rotation": 15,
    "translation": [320, 240],
    "depth": 0.8
  },
  "captureUrl": "https://storage.googleapis.com/.../ar_capture_123.png"
}
```

## Expected Output
- **Real-time overlay:** 30-60 fps video with tattoo rendered on body
- **Latency:** <50ms from camera frame to display
- **Accuracy:** ±2cm positioning accuracy on body landmarks
- **Capture resolution:** 1080p or device native resolution

## Edge Cases

### Camera Permission Denied
- **Fallback:** Show static preview using uploaded body photo
- **UI Message:** "Enable camera access for live AR preview, or upload a photo."

### Body Part Not Detected
- **Fallback:** Manual placement mode (user taps screen to position)
- **UI Guidance:** "Point camera at your [arm/chest/etc.] and hold steady."
- **Retry:** Continue scanning for 10s, then prompt manual mode

### Poor Lighting Conditions
- **Detection:** Low brightness or high noise in video frame
- **Solution:** Increase camera exposure, apply denoising filter
- **UI Message:** "Move to a brighter area for better results."

### Device Not Supported (Old Browser)
- **Detection:** WebGL not available or MindAR fails to load
- **Fallback:** Static overlay using pre-defined body templates
- **UI Message:** "AR preview not available. Use photo upload instead."

### Design Too Large for Body Part
- **Detection:** Tattoo exceeds anatomical boundaries
- **Solution:** Auto-scale to fit within detected surface
- **UI Warning:** "Design scaled to fit [arm/chest]. Actual size may differ."

### Rapid Movement (Motion Blur)
- **Detection:** Landmark confidence drops below 0.5
- **Solution:** Temporarily hide overlay until stable tracking resumes
- **UI Message:** "Hold camera steady for best results."

## Performance Optimization

### Frame Rate Throttling
- **Mobile:** Limit to 30fps to conserve battery
- **Desktop:** Full 60fps for smooth experience
- **Low-end devices:** Drop to 15fps + reduce resolution

### Lazy Loading
- Load MindAR models only when AR mode is activated
- Preload models in background during design generation

### Caching
- Cache body tracking models (localStorage, ~5MB)
- Cache transformation matrices for common body parts

## Device Requirements

### Minimum Specs
- **Mobile:** iOS 12+ / Android 8+, camera 720p, WebGL 2.0
- **Desktop:** Chrome 90+, webcam 480p, WebGL 2.0
- **RAM:** 2GB+ (MindAR body tracking is memory-intensive)

### Recommended Specs
- **Mobile:** iOS 14+ / Android 11+, camera 1080p
- **Desktop:** Chrome 110+, webcam 1080p
- **RAM:** 4GB+

## Cost (per session)

| Service | Cost | Notes |
|---------|------|-------|
| MindAR (client-side) | Free | Runs in browser, no API calls |
| Video processing | Free | Local compute |
| Capture storage (GCS) | ~$0.00004 | Per screenshot saved |

**Average Session:** Free (no server costs unless capturing)

## Related Directives
- `generate-tattoo.md` — Design generation (provides tattoo image)
- `stencil-export.md` — Export finalized placement for artist
- `api-endpoints.md` — API reference (if using server-side AR processing)

## Future Enhancements
- **3D body mesh:** Full body scanning for accurate surface mapping
- **Skin tone matching:** Adjust tattoo colors based on detected skin tone
- **Multi-tattoo preview:** Overlay multiple designs simultaneously
- **Social sharing:** Export AR video clips (not just screenshots)

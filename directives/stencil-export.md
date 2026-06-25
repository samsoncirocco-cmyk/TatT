# Stencil Export

## Goal
Convert a finalized tattoo design into a high-quality, printable stencil (PDF or PNG) optimized for thermal transfer printing.

## When to Use
- User finalizes a design and wants to bring it to an artist
- API endpoint: `POST /api/v1/stencil/export`
- Trigger: User clicks "Export Stencil" button after design approval

## Prerequisites
- Finalized design image (URL or base64)
- Canvas dimensions (actual tattoo size in inches or cm)
- DPI setting (default 300 for high-quality printing)
- Output format preference (PDF or PNG)

## Steps

### 1. Load and Prepare Image
**Location:** `src/features/stencil/services/stencilService.js` → `generateStencil()`
- Fetch design image from URL or decode base64
- Validate dimensions (must be 300 DPI or higher)
- Convert to grayscale if not already
- Apply contrast enhancement to ensure clean lines

### 2. Edge Detection and Enhancement
**Location:** `src/features/stencil/services/stencilEdgeService.js`
- Apply Sobel edge detection algorithm
- Threshold adjustment:
  - Dark lines → pure black (#000000)
  - Light backgrounds → pure white (#FFFFFF)
  - Gray areas → intelligent dithering
- Line weight optimization:
  - Fine details: 1-2px lines
  - Bold outlines: 3-5px lines
  - Fill areas: 60% halftone pattern

### 3. Size Calibration
**Location:** `src/utils/stencilCalibration.js`
- Convert design dimensions to actual tattoo size
- Calculate DPI based on intended print size:
  - Small (2-4 inches): 300 DPI
  - Medium (4-8 inches): 400 DPI
  - Large (8+ inches): 600 DPI
- Add 10% bleed margin for trimming
- Add alignment marks (corners + center cross)

### 4. Generate PDF (if requested)
**Location:** `src/utils/pdfGenerator.js`
- Use jsPDF library to create document
- Set page size based on design dimensions + margins
- Embed image at exact DPI
- Add metadata:
  - Design ID
  - Export date
  - Recommended size
  - Print settings (300 DPI, grayscale)
- Add footer with QR code linking back to original design

### 5. Generate PNG (if requested)
**Location:** `src/features/stencil/services/stencilService.js`
- Use Sharp library for high-quality image processing
- Apply DPI metadata to PNG EXIF
- Optimize compression (lossless)
- Add alpha channel for transparency (white → transparent)

### 6. Upload to Storage
**Location:** `src/services/gcs-service.ts`
- Upload stencil to GCS bucket: `tatt-pro-stencils/`
- Generate signed URL (expires in 7 days)
- Store metadata in Firestore:
  - Original design ID
  - Export timestamp
  - User ID
  - Download count

### 7. Return to Client
**Response Format:**
```json
{
  "stencilUrl": "https://storage.googleapis.com/tatt-pro-stencils/xyz123.pdf",
  "format": "pdf",
  "dimensions": {
    "widthInches": 6,
    "heightInches": 8,
    "dpi": 300
  },
  "fileSize": 245678,
  "expiresAt": "2026-02-15T00:00:00Z",
  "metadata": {
    "designId": "design_abc",
    "exportedAt": "2026-02-08T12:34:56Z",
    "lineCount": 3456,
    "estimatedPrintTime": "8 minutes"
  }
}
```

## Expected Output
- **PDF:** Vector-based, crisp at any zoom level, 300-600 DPI
- **PNG:** Lossless compression, transparent background, EXIF DPI metadata
- **File size:** 200KB - 2MB (depending on complexity)
- **Processing time:** 2-5 seconds
- **Print quality:** Sharp enough for 1:1 thermal transfer

## Edge Cases

### Image Resolution Too Low
- **Detection:** Source image <200 DPI when scaled to target size
- **Fallback:** Warn user, offer to export at reduced size
- **UI Message:** "Your design may appear pixelated at this size. Reduce to X inches for best quality."

### Design Has Color (Not Grayscale)
- **Automatic Conversion:** Convert to grayscale, boost contrast
- **Warn User:** "Stencils are black-and-white. Color information will be lost."
- **Offer Alternative:** Suggest exporting full-color version for artist reference

### Complex Gradients or Textures
- **Challenge:** Thermal printers struggle with gradients
- **Solution:** Apply intelligent halftone pattern (60% threshold)
- **Warn User:** "Gradients converted to halftone dots for printing."

### Very Large Size (>20 inches)
- **Issue:** Single-page print may not fit thermal printer
- **Solution:** Offer to split into tiles with overlap markers
- **UI:** "Your design will be printed across 2 pages. Align using corner marks."

### GCS Upload Fails
- **Fallback:** Return base64-encoded file directly in response
- **Warn User:** "Download this file immediately—link expires in 5 minutes."

## Print Preparation Guide

### For Users
1. **Download stencil** (PDF or PNG)
2. **Print settings:**
   - Black & white only
   - Actual size (no scaling)
   - Thermal paper (spirit/hectograph paper)
3. **Bring to artist** along with full-color reference image

### For Artists
1. **Load stencil** into thermal printer (e.g., Stencil Puma, EZ Filter Plus)
2. **Print at 100% scale**
3. **Apply to skin** using standard transfer technique
4. **Reference full-color image** for shading/color guidance

## Cost (per export)

| Service | Cost | Notes |
|---------|------|-------|
| Image Processing (Sharp) | Free | Local compute |
| PDF Generation (jsPDF) | Free | Client-side |
| GCS Storage | ~$0.02/GB | ~$0.00004 per stencil |
| GCS Egress | ~$0.12/GB | First GB free monthly |

**Average Export:** <$0.001 (negligible)

## Performance Optimization

### Caching
- Cache processed stencils for 7 days (re-use if user exports same design)
- Precompute edge detection during design finalization (async)

### Compression
- Use jsPDF compression for smaller file sizes
- PNG: Use pngquant for lossy compression (optional, only if user accepts)

### Parallel Processing
- Generate PDF and PNG simultaneously (Promise.all)
- Upload to GCS while generating second format

## Related Directives
- `generate-tattoo.md` — Design generation (provides source image)
- `layer-management.md` — Multi-layer designs may need layer merging before export
- `api-endpoints.md` — Full API reference for stencil endpoints

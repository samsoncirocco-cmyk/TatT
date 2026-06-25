# Quick Reference - Directory Reorganization

## ✅ What Was Done

Your directory structure has been reorganized to match the **AGENTS.md framework** with feature-based architecture.

### Key Changes

#### Components Moved
- ✅ `ForgeCanvas` → `src/features/generate/components/`
- ✅ `VersionTimeline`, `VersionComparison` → `src/features/generate/components/`
- ✅ `MatchPulseSidebar`, `ArtistMatchCard` → `src/features/match-pulse/components/Match/`
- ✅ `InpaintingEditor` → `src/features/inpainting/components/`
- ✅ `StencilExport` → `src/features/stencil/components/`

#### Services Moved
- ✅ `canvasService` → `src/features/generate/services/`
- ✅ `replicateService`, `versionService` → `src/features/generate/services/`
- ✅ `matchService`, `neo4jService`, `matchPulseIntegration` → `src/features/match-pulse/services/`
- ✅ `inpaintingService` → `src/features/inpainting/services/`
- ✅ `stencilService`, `stencilEdgeService` → `src/features/stencil/services/`

#### Hooks Moved
- ✅ `useLayerManagement`, `useImageGeneration`, `useVersionHistory`, `useSmartPreview` → `src/features/generate/hooks/`
- ✅ `useArtistMatching`, `useRealtimeMatchPulse` → `src/features/match-pulse/hooks/`

#### Imports Updated
- ✅ `src/pages/Generate.jsx` - All feature imports updated
- ✅ `src/features/Generate.jsx` - All feature imports updated
- ✅ `src/hooks/useTransformShortcuts.ts` - canvasService import updated
- ✅ `src/hooks/useTransformOperations.ts` - canvasService import updated
- ✅ `src/stores/useForgeStore.ts` - canvasService import updated

#### Barrel Exports Created
- ✅ `src/features/generate/index.ts`
- ✅ `src/features/match-pulse/index.ts`
- ✅ `src/features/inpainting/index.ts`
- ✅ `src/features/stencil/index.ts`

---

## 📦 New Feature Architecture

```
src/features/
├── generate/              # The Forge - Design generation
│   ├── components/
│   ├── services/
│   ├── hooks/
│   └── index.ts
├── match-pulse/          # Artist matching
│   ├── components/
│   ├── services/
│   ├── hooks/
│   └── index.ts
├── inpainting/           # Design refinement
│   ├── components/
│   ├── services/
│   └── index.ts
├── stencil/              # Stencil export
│   ├── components/
│   ├── services/
│   └── index.ts
```

---

## 🔗 Import Examples

### Before Reorganization
```javascript
import { ForgeCanvas } from '../components/generate/ForgeCanvas';
import { useLayerManagement } from '../hooks/useLayerManagement';
import * as versionService from '../services/versionService';
import MatchPulseSidebar from '../components/generate/MatchPulseSidebar';
import { inpaintTattooDesign } from '../services/inpaintingService';
```

### After Reorganization
```javascript
// Direct imports
import { ForgeCanvas } from '../features/generate/components/ForgeCanvas';
import { useLayerManagement } from '../features/generate/hooks/useLayerManagement';
import * as versionService from '../features/generate/services/versionService';
import MatchPulseSidebar from '../features/match-pulse/components/Match/MatchPulseSidebar';
import { inpaintTattooDesign } from '../features/inpainting/services/inpaintingService';

// Using barrel exports
import { ForgeCanvas, useLayerManagement } from '../features/generate';
import { MatchPulseSidebar, useRealtimeMatchPulse } from '../features/match-pulse';
import { InpaintingEditor } from '../features/inpainting';
import { StencilExport } from '../features/stencil';
```

---

## ⚠️ Important Notes

### What Still Needs Updating (Optional)

Some files still reference old import paths:
- `src/components/DesignGenerator.jsx` - imports replicateService
- `src/components/DesignLibrary.jsx` - imports imageProcessingService
- `src/components/DesignGeneratorWithCouncil.jsx` - imports replicateService
- `src/api/routes/*.js` - imports various services
- `src/app/api/v1/*.ts` - imports various services

### Core Framework Files (Already Updated)
- ✅ `src/pages/Generate.jsx`
- ✅ `src/features/Generate.jsx`

### Why This Matters
The reorganization aligns with the **AGENTS.md framework** which documents:
- **Generate/Forge feature**: Canvas + layer management + version history
- **Match Pulse feature**: Artist matching system
- **Inpainting feature**: Design refinement
- **Stencil feature**: Export functionality

---

## 📝 Full Documentation

See [DIRECTORY_REORGANIZATION.md](./DIRECTORY_REORGANIZATION.md) for:
- Complete file mapping
- Architecture rationale
- Benefits of the new structure
- Remaining optional tasks
- Path alias setup recommendations

---

## ✨ Next Steps

### Option 1: Gradual Adoption (Recommended)
Update files as you work on them:
```javascript
// When working on a file, update its imports to use new paths
import { ForgeCanvas } from '../features/generate/components/ForgeCanvas';
```

### Option 2: Complete Cleanup (One-time effort)
Update all remaining files immediately to new paths.

### Option 3: Use Barrel Exports (Cleanest)
```javascript
// Instead of:
import { ForgeCanvas } from '../features/generate/components/ForgeCanvas';

// Use:
import { ForgeCanvas } from '../features/generate';
```

---

## 🔍 Verification

To verify the new structure is working:

```bash
# List all moved files
find src/features -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx"

# Check for correct imports in main Generate page
grep "from.*features" src/pages/Generate.jsx

# Verify index.ts barrel exports
ls -la src/features/*/index.ts
```

---

## 💡 Benefits

1. **Better Organization** - Related code is grouped by feature
2. **Easier Discovery** - Know exactly where to find feature-specific code
3. **Cleaner Imports** - Use barrel exports for cleaner code
4. **Scalability** - Easy to add new features or sub-features
5. **Maintainability** - Self-contained features are easier to test and maintain
6. **Architecture Clarity** - Clearly documents the system architecture

---

*Generated: 2026-01-31*
*Framework: AGENTS.md (Feature-based architecture)*

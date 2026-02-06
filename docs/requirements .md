# Redesign Generate Page: The Forge - AI-Powered Tattoo Design Studio

## Overview

Transform the Generate page (https://tat-t-3x8t.vercel.app/generate) into a professional-grade design tool that enables users with no AI image generation experience to create complex tattoo designs with 20+ elements. The redesigned interface should feel as intuitive as Canva while leveraging TatT's advanced AI capabilities for tattoo-specific generation, layered editing, and real-time artist matching.

## Problem Statement

Current tattoo design tools present significant barriers:
- **Blank Canvas Anxiety**: Users struggle to start without visual inspiration or guidance
- **Technical Complexity**: AI image generation requires expertise in prompt engineering that most users lack
- **Iterative Friction**: Refining complex designs with multiple elements is cumbersome and non-intuitive
- **Disconnected Workflow**: The creative design phase is isolated from the artist discovery and booking process
- **Limited Editability**: Generated designs are static images with no ability to adjust individual elements

Users need a unified "Forge" experience that bridges creative exploration, technical generation, and professional artist connection in a single, fluid workflow.

## User Stories

**As a tattoo enthusiast**, I want to start designing immediately with visual inspiration, so I can overcome blank canvas anxiety and see what's possible.

**As a non-technical user**, I want to describe my tattoo idea in natural language with optional style guidance, so I don't need to learn complex AI prompting techniques.

**As a designer creating a complex piece**, I want to generate a base composition and then refine individual elements separately, so I can build intricate designs with 20+ components iteratively.

**As someone exploring tattoo options**, I want to see how many artists match my design in real-time, so I understand the feasibility and can adjust my design to match available talent.

**As a user refining my design**, I want automatic version history with the ability to branch from any previous iteration, so I can experiment freely without losing good variations.

## Functional Requirements

### Initial Landing Experience (Hybrid Approach)

- Display a "Trending Now" gallery featuring 6-8 high-quality example designs (e.g., "Cyberpunk Gohan", "Fine-line Peonies") that showcase style diversity
- Provide a prominent "Start from Scratch" option with an empty canvas and clear call-to-action
- Enable one-click loading of gallery examples into the Forge for immediate customization
- Show visual proof of the AI engine's capabilities through diverse style examples

### Body Placement Context (Anatomy-First Design)

- Require body part selection before design generation (forearm, shoulder, back, chest, thigh, etc.)
- Automatically adjust canvas aspect ratio based on selected body part:
  - Forearm: 1:3 (vertical)
  - Chest: 4:5 (square-ish)
  - Back: 3:4 (portrait)
  - Thigh: 2:3 (portrait)
- Display body part silhouette as canvas background for spatial context
- Allow body part change with warning about aspect ratio impact on existing design

### Prompt Interface (Hybrid Form)

- **Primary Input**: Large, prominent text box for natural language description
- **AI Council Enhancement**: Automatic prompt enhancement using the existing LLM Council API
- **Vibe Chips**: Dynamic suggestion chips that appear based on text input:
  - Style chips (e.g., "Irezumi", "Fine-line", "Blackwork")
  - Element chips (e.g., "Dark-cloud background", "Lightning effects")
  - Mood chips (e.g., "Aggressive", "Delicate", "Bold")
- **Expandable Advanced Options**: Collapsible panel for:
  - Size selection (small, medium, large, xlarge)
  - AI model selection (tattoo, sdxl, turbo, vertex-ai)
  - Negative prompt customization
  - Prompt enhancement level (Simple, Detailed, Ultra)

### Composition Workflow (Hybrid Approach)

**Base Generation:**
- Generate full composition from natural language description
- Use AI Council to ensure spatial separation of multiple subjects (e.g., "Gohan fighting Cell with lightning")
- Output layered RGBA format with subjects and backgrounds separated into editable stacks

**Element Refinement:**
- Enable selection of individual elements/layers within the composition
- Support regeneration of specific elements while preserving others
- Allow addition of new elements to existing composition
- Maintain spatial relationships and composition balance during element updates

### Canvas & Editing Capabilities

**Layer Management:**
- Display layer stack panel showing all composition elements
- Support layer reordering (bring to front, send to back)
- Enable layer visibility toggle
- Show layer thumbnails for quick identification

**Transform Operations:**
- Move: Drag elements to reposition
- Resize: Scale elements proportionally or freely
- Rotate: Rotate elements around center point
- Flip: Horizontal/vertical flip

**Advanced Editing:**
- **Inpainting/Masking**: Select and regenerate specific regions with new prompts (e.g., "Change eyes to glowing blue")
- **Style Transfer**: Apply different style to element while preserving composition
- **Blend Modes**: Apply blend modes between layers (Multiply, Overlay, Screen) to simulate ink layering
- **Remove/Erase**: Manual cleanup tool for stencil preparation

**Stencil View Toggle:**
- One-click toggle to "Stencil View" mode
- Strip all colors and grays to show binary line-art preview
- Display exactly what will print on thermal printer
- Maintain toggle state across editing operations

### Real-Time Preview System (Smart Preview)

**Low-Resolution Preview:**
- Show instant visual feedback as users adjust parameters (style, size, placement)
- Use lightweight preview model for sub-second response times
- Display "Preview" watermark to indicate non-final quality
- Update on parameter change with 300ms debounce

**High-Resolution Generation:**
- Trigger full 300 DPI generation on "Refine" or "Finalize" button click
- Show progress indicator with estimated completion time
- Replace preview with high-resolution result
- Generate transparent PNG "AR-Asset" in background for instant AR transition

### Version Management (Auto-Save Timeline)

- Automatically save every generation as a new version in history timeline
- Display timeline as horizontal scrollable strip with thumbnails
- Show version number, timestamp, and key parameters for each version
- Enable branching: Select any previous version to continue editing from that point
- Support version comparison: Select two versions to view side-by-side
- Allow version merging: Combine elements from different versions (e.g., "V4's dragon with V7's color palette")
- Persist version history in localStorage with 90-day retention

### Artist Match Integration (Persistent Sidebar)

**Match Pulse Widget:**
- Display persistent sidebar on right side of canvas (collapsible on mobile)
- Show real-time match count (e.g., "14 Artists found for this style")
- Update match count on significant canvas changes (debounced 2 seconds)
- Display top 3 matched artists with thumbnails, names, and match scores
- Provide "View All Artists" button to navigate to full match results

**Semantic Re-ranking:**
- Trigger Neo4j/Supabase hybrid search on canvas changes
- Calculate match score based on:
  - Style similarity (from design analysis)
  - Element complexity (from layer count)
  - Body part specialization (from artist profiles)
  - Geographic proximity (if location provided)
- Update sidebar with new matches and scores

## Technical Requirements

### Frontend Architecture

- **Framework**: React with Vite (existing stack)
- **Canvas Library**: Fabric.js or Konva.js for layer management and transforms
- **State Management**: React Context for canvas state, localStorage for persistence
- **Image Processing**: Client-side image manipulation for preview generation

### API Integration

**Replicate API (via Proxy):**
- Use existing proxy server for AI image generation
- Support layered RGBA output format for decomposed elements
- Implement inpainting/masking with maskMargin of 32-64px for seamless blending
- Handle multiple concurrent generation requests for element refinement

**LLM Council API (via Proxy):**
- Enhance user prompts with style-specific guidance
- Generate "Vibe Chips" suggestions based on text input
- Validate prompt suitability for tattoo generation

**Neo4j + Supabase Hybrid Search:**
- Implement throttled debounce search (2-second delay) on canvas changes
- Query Neo4j for relationship/lore data and geospatial filtering
- Query Supabase pgvector for visual similarity matching
- Combine results using Reciprocal Rank Fusion (RRF) algorithm

### Data Model

**Design Session:**
- session_id (string): Unique identifier
- body_part (string): Selected placement location
- canvas_aspect_ratio (string): Derived from body part
- created_at (timestamp): Session start time
- last_modified (timestamp): Last edit time

**Design Version:**
- version_id (string): Unique identifier
- session_id (string): Parent session reference
- version_number (integer): Sequential version number
- layers (array): Array of layer objects
- prompt (string): Original user prompt
- enhanced_prompt (string): AI Council enhanced prompt
- parameters (object): Generation parameters (model, size, style)
- image_url (string): Generated image URL
- ar_asset_url (string): Transparent PNG for AR preview
- stencil_url (string): Binary line-art stencil
- created_at (timestamp): Version creation time

**Layer:**
- layer_id (string): Unique identifier
- name (string): User-defined or auto-generated name
- type (string): "subject", "background", "effect"
- image_url (string): Layer image URL
- transform (object): Position, scale, rotation data
- blend_mode (string): Blend mode for compositing
- visible (boolean): Layer visibility state
- z_index (integer): Layer stacking order

### Performance Requirements

- Initial page load: < 2 seconds
- Low-res preview generation: < 500ms
- High-res generation: < 30 seconds (with progress indicator)
- Canvas transform operations: 60 FPS
- Match Pulse update: < 1 second after debounce
- Version history load: < 500ms

### Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 10+)

## User Experience Design

### Layout Structure

**Desktop (1920x1080):**
```
┌─────────────────────────────────────────────────────────────┐
│ Header: TatT Logo | Generate | Visualize | Artists | Library│
├──────────────────────────────────────┬──────────────────────┤
│                                      │  Match Pulse Sidebar │
│                                      │  ┌────────────────┐  │
│                                      │  │ 14 Artists     │  │
│                                      │  │ Found          │  │
│          Canvas Area                 │  ├────────────────┤  │
│      (Aspect Ratio Based on          │  │ [Artist 1]     │  │
│       Selected Body Part)            │  │ Match: 94%     │  │
│                                      │  ├────────────────┤  │
│                                      │  │ [Artist 2]     │  │
│                                      │  │ Match: 89%     │  │
│                                      │  ├────────────────┤  │
│                                      │  │ [Artist 3]     │  │
│                                      │  │ Match: 85%     │  │
│                                      │  ├────────────────┤  │
│                                      │  │ [View All]     │  │
│                                      │  └────────────────┘  │
├──────────────────────────────────────┴──────────────────────┤
│ Bottom Panel:                                                │
│ [Prompt Input] [Vibe Chips] [Generate] [Stencil View]       │
│ [Version Timeline: V1 V2 V3 V4 V5 V6...]                    │
│ [Layer Stack: Layer 1 | Layer 2 | Layer 3]                  │
└─────────────────────────────────────────────────────────────┘
```

**Mobile (375x812):**
```
┌─────────────────────────┐
│ Header (Collapsed)      │
├─────────────────────────┤
│                         │
│     Canvas Area         │
│   (Full Width)          │
│                         │
│                         │
├─────────────────────────┤
│ [Prompt Input]          │
│ [Vibe Chips]            │
│ [Generate]              │
├─────────────────────────┤
│ [Version Timeline]      │
│ [Layer Stack]           │
├─────────────────────────┤
│ [Match Pulse: 14 ▼]     │
│ (Expandable)            │
└─────────────────────────┘
```

### Interaction Patterns

**Initial Load:**
1. Display "Trending Now" gallery with 6-8 examples
2. Show "Start from Scratch" button prominently
3. Animate gallery cards with subtle hover effects
4. On example click: Load design into canvas, show edit controls

**Design Creation Flow:**
1. Select body part from dropdown or visual selector
2. Canvas adjusts to appropriate aspect ratio
3. Enter prompt in text box
4. Vibe Chips appear dynamically based on text
5. Click "Generate" to create base composition
6. Low-res preview appears within 500ms
7. High-res generation completes, replaces preview
8. Version automatically saved to timeline

**Element Refinement Flow:**
1. Click on element in canvas to select
2. Layer highlights in layer stack panel
3. Transform handles appear for move/resize/rotate
4. Right-click or toolbar button for "Regenerate This Element"
5. Prompt modal appears with element-specific context
6. Generate new version of element only
7. New version saved to timeline

**Version Management Flow:**
1. Scroll version timeline horizontally
2. Click version thumbnail to load that version
3. Current version highlighted with border
4. Click "Branch from Here" to continue editing from selected version
5. Click "Compare" to view two versions side-by-side

### Visual Design Principles

- **Canva-Inspired**: Clean, minimal interface with focus on canvas
- **High Contrast**: Dark mode default with light mode option
- **Tactile Controls**: Large, touch-friendly buttons and controls
- **Visual Hierarchy**: Canvas is primary focus, controls are secondary
- **Progressive Disclosure**: Advanced options hidden until needed
- **Instant Feedback**: All interactions provide immediate visual response

### Responsive Behavior

**Desktop (1920x1080):**
- Match Pulse sidebar persistent on right (300px width)
- Canvas centered with maximum 1200px width
- Bottom panel full width with horizontal layout

**Tablet (768x1024):**
- Match Pulse sidebar collapsible, overlays canvas when open
- Canvas full width minus margins
- Bottom panel stacked vertically

**Mobile (375x812):**
- Match Pulse collapsed to expandable bottom sheet
- Canvas full width
- Bottom panel stacked with scrollable sections
- Version timeline horizontal scroll
- Layer stack vertical scroll

### Accessibility Requirements

- Keyboard navigation for all canvas operations (arrow keys for move, +/- for scale)
- Screen reader labels for all interactive elements
- Focus indicators with 3px outline
- Color contrast ratio ≥ 4.5:1 for all text
- Alt text for all generated images
- ARIA labels for dynamic content updates (Match Pulse count)

## Error Handling

### Generation Failures

**Scenario**: Replicate API returns error or timeout
- Display user-friendly error message: "Generation failed. Please try again."
- Preserve user's prompt and parameters
- Offer "Retry" button with same parameters
- Log error details for debugging
- Do not create version entry for failed generation

**Scenario**: AI Council API unavailable
- Fall back to user's original prompt without enhancement
- Display notice: "Using simplified prompt. Advanced features temporarily unavailable."
- Continue with generation using basic prompt

### Canvas Operation Errors

**Scenario**: Layer manipulation fails (e.g., image load error)
- Display error toast: "Unable to load layer. Please refresh."
- Disable affected layer in layer stack
- Allow user to delete problematic layer
- Preserve other layers and continue editing

**Scenario**: Version history load fails
- Display error message: "Unable to load version history."
- Offer "Retry" button
- Allow user to continue with current version
- Preserve current canvas state

### Match Pulse Errors

**Scenario**: Neo4j/Supabase query fails
- Display "Match data temporarily unavailable" in sidebar
- Show last successful match count if available
- Retry query automatically after 30 seconds
- Allow user to manually refresh with button

### Data Persistence Errors

**Scenario**: localStorage quota exceeded
- Display warning: "Storage limit reached. Older versions will be removed."
- Auto-purge oldest non-favorite versions
- Preserve current session and recent versions
- Offer option to export versions before purging

**Scenario**: IndexedDB unavailable
- Fall back to in-memory storage for session
- Display notice: "Changes will not persist after page refresh."
- Offer immediate export/download of current design

## Integration Points

### Existing Services

**Replicate Service** (`src/services/replicateService.js`):
- Use existing proxy integration for AI generation
- Extend to support layered RGBA output format
- Add inpainting/masking endpoint calls
- Implement request queuing for multiple concurrent generations

**Design Library Service** (`src/services/designLibraryService.js`):
- Extend to store version history (max 50 versions per design)
- Add version metadata (prompt, parameters, timestamp)
- Implement version branching and comparison logic
- Maintain 90-day auto-purge for non-favorite versions

**Neo4j Service** (`src/services/neo4jService.js`):
- Add real-time match query with debouncing
- Implement Reciprocal Rank Fusion algorithm
- Support geospatial filtering by body part and location

**Image Processing Service** (`src/services/imageProcessingService.js`):
- Add stencil generation (300 DPI binary conversion)
- Implement AR-ready transparent PNG export
- Add layer composition and blending operations

### New Services Required

**Canvas Service** (`src/services/canvasService.js`):
- Layer management (add, remove, reorder, visibility)
- Transform operations (move, resize, rotate, flip)
- Blend mode application
- Canvas state serialization/deserialization

**Version Service** (`src/services/versionService.js`):
- Version creation and storage
- Version comparison logic
- Branching and merging operations
- Timeline rendering and navigation

**Match Service** (`src/services/matchService.js`):
- Debounced match query triggering
- Match score calculation and ranking
- Sidebar state management
- Artist profile preview rendering

## Out of Scope

**Features Deferred to Phase 2:**
- **Collaborative Editing**: Real-time multi-user editing of designs
  - **Why**: Requires WebSocket infrastructure and conflict resolution
  - **Trigger**: When user feedback indicates demand for shared design sessions

- **AI-Suggested Compositions**: Proactive AI recommendations for element placement
  - **Why**: Requires training custom composition model
  - **Trigger**: After collecting 10,000+ user-generated designs for training data

- **3D Body Preview**: Full 3D body model for tattoo placement visualization
  - **Why**: Requires WebGL/Three.js integration and 3D asset pipeline
  - **Trigger**: When AR preview adoption reaches 40%+ of users

- **Video Export**: Animated tattoo design reveals or process videos
  - **Why**: Requires video encoding infrastructure and storage
  - **Trigger**: When social sharing feature is implemented

**Technical Complexity Deferred:**
- **Real-Time Collaborative Canvas**: Operational Transform or CRDT implementation
  - **Why**: Adds significant complexity to canvas state management
  - **Trigger**: When 5+ users request collaborative features per week

- **Custom AI Model Training**: Fine-tuning models on user-generated designs
  - **Why**: Requires ML infrastructure and data pipeline
  - **Trigger**: When design library reaches 50,000+ saved designs

- **Advanced Stencil Optimization**: AI-powered line weight adjustment for printability
  - **Why**: Requires custom image processing algorithms
  - **Trigger**: When artist feedback indicates stencil quality issues

## Acceptance Criteria

**Initial Landing Experience:**
- Given a user visits the Generate page, when the page loads, then they see a "Trending Now" gallery with 6-8 example designs and a "Start from Scratch" button
- Given a user clicks an example design, when the design loads, then it appears in the canvas with all layers editable and version history initialized

**Body Placement Selection:**
- Given a user selects a body part, when the selection is made, then the canvas aspect ratio adjusts to match the body part proportions (e.g., 1:3 for forearm)
- Given a user changes body part after designing, when the change is confirmed, then a warning modal appears explaining aspect ratio impact

**Prompt Interface:**
- Given a user types in the prompt text box, when they type keywords like "dragon", then relevant Vibe Chips appear below the box (e.g., "Irezumi", "Fine-line")
- Given a user clicks a Vibe Chip, when the chip is selected, then it is added to the prompt context and visually highlighted
- Given a user clicks "Advanced Options", when the panel expands, then size, model, negative prompt, and enhancement level controls are visible

**Base Generation:**
- Given a user enters a prompt and clicks "Generate", when the request is sent, then a low-res preview appears within 500ms
- Given the AI generation completes, when the high-res image is ready, then it replaces the preview and is automatically saved as Version 1 in the timeline
- Given a complex prompt with multiple subjects, when the generation completes, then subjects are separated into distinct layers in the layer stack

**Layer Management:**
- Given a user clicks a layer in the layer stack, when the layer is selected, then it is highlighted in the canvas with transform handles
- Given a user drags a layer in the stack, when the drag completes, then the z-index updates and the canvas reflects the new layer order
- Given a user toggles layer visibility, when the toggle is clicked, then the layer is hidden/shown in the canvas immediately

**Transform Operations:**
- Given a user drags a selected layer, when the drag completes, then the layer position updates and the change is reflected in the canvas state
- Given a user resizes a layer using handles, when the resize completes, then the layer scale updates proportionally (or freely if Shift is held)
- Given a user rotates a layer using the rotation handle, when the rotation completes, then the layer rotation angle updates

**Element Refinement:**
- Given a user right-clicks a layer, when "Regenerate This Element" is selected, then a prompt modal appears with the original element prompt pre-filled
- Given a user submits a regeneration prompt, when the generation completes, then only the selected layer is replaced with the new image
- Given a user adds a new element, when the generation completes, then a new layer is created and added to the layer stack

**Inpainting/Masking:**
- Given a user selects the masking tool, when they draw a mask region on the canvas, then the masked area is highlighted with a semi-transparent overlay
- Given a user submits an inpainting prompt, when the generation completes, then only the masked region is replaced with seamless blending (32-64px margin)

**Blend Modes:**
- Given a user selects a layer and chooses a blend mode, when the blend mode is applied, then the layer composites with underlying layers using the selected mode (Multiply, Overlay, Screen)

**Stencil View:**
- Given a user toggles "Stencil View", when the toggle is activated, then the canvas displays a binary line-art version with all colors and grays removed
- Given the user is in Stencil View, when they make edits, then the stencil preview updates in real-time

**Smart Preview:**
- Given a user adjusts a parameter (style, size), when the parameter changes, then a low-res preview updates within 500ms with a "Preview" watermark
- Given a user clicks "Refine", when the high-res generation completes, then the preview is replaced with the 300 DPI final image

**Version Management:**
- Given a user generates a design, when the generation completes, then a new version is automatically saved to the timeline with a thumbnail, version number, and timestamp
- Given a user clicks a version in the timeline, when the version is selected, then the canvas loads that version's state with all layers and parameters
- Given a user clicks "Branch from Here" on a previous version, when the branch is created, then subsequent edits create new versions from that point without affecting the main timeline
- Given a user selects two versions and clicks "Compare", when the comparison view opens, then both versions are displayed side-by-side with differences highlighted

**Match Pulse Sidebar:**
- Given a user generates or edits a design, when the canvas changes significantly, then the Match Pulse sidebar updates within 1 second (after 2-second debounce) showing the new match count
- Given the Match Pulse updates, when new matches are found, then the top 3 artists are displayed with thumbnails, names, and match scores
- Given a user clicks "View All Artists", when the button is clicked, then the user is navigated to the full artist match results page with the current design context

**Performance:**
- Given a user loads the Generate page, when the page loads, then the initial render completes in < 2 seconds
- Given a user performs a canvas transform operation, when the operation is executed, then the canvas updates at 60 FPS without lag
- Given a user loads version history, when the timeline is rendered, then all version thumbnails load in < 500ms

**Error Handling:**
- Given the Replicate API fails, when the error occurs, then a user-friendly error message is displayed with a "Retry" button that preserves the user's prompt
- Given the Match Pulse query fails, when the error occurs, then the sidebar displays "Match data temporarily unavailable" and retries automatically after 30 seconds
- Given localStorage quota is exceeded, when the limit is reached, then a warning is displayed and the oldest non-favorite versions are auto-purged

**Responsive Design:**
- Given a user accesses the page on desktop (1920x1080), when the page loads, then the Match Pulse sidebar is persistent on the right at 300px width
- Given a user accesses the page on tablet (768x1024), when the page loads, then the Match Pulse sidebar is collapsible and overlays the canvas when open
- Given a user accesses the page on mobile (375x812), when the page loads, then the Match Pulse is collapsed to an expandable bottom sheet

**Accessibility:**
- Given a user navigates with keyboard, when they press Tab, then focus moves through all interactive elements with visible 3px outline indicators
- Given a user uses a screen reader, when they navigate the page, then all interactive elements have descriptive ARIA labels and alt text
- Given a user checks color contrast, when the page is analyzed, then all text meets WCAG AA standard with ≥ 4.5:1 contrast ratio
# TatTester Testing Guide

Comprehensive testing instructions for the AI tattoo design generator.

## Pre-Launch Checklist

Before testing the app, verify:

- [ ] Node.js 18+ installed (`node --version`)
- [ ] Dependencies installed (`npm install` completed)
- [ ] `.env` file configured with valid Replicate token
- [ ] Dev server starts without errors (`npm run dev`)

## Manual Testing Protocol

### Test 1: Environment Setup

**Objective**: Verify all dependencies and configuration are correct

1. Run `npm install`
   - Should complete without errors
   - Should install ~500MB of dependencies

2. Check `.env` file
   - File exists in project root
   - Contains `VITE_REPLICATE_API_TOKEN=r8_...`
   - Token is not the placeholder value

3. Start dev server
   - Run `npm run dev`
   - Server should start on `localhost:3000`
   - No console errors on startup
   - App should auto-open in browser

**Expected Result**: Clean startup, no errors, app loads

---

### Test 2: Home Page

**Objective**: Verify landing page renders correctly

1. Navigate to `http://localhost:3000/`
2. Verify header displays "TatTester"
3. Check for "Start Creating Your Design" button
4. Verify 3 feature cards display
5. Check bottom navigation has 3 tabs: Home, Generate, Library

**Expected Result**: Clean, professional landing page with all elements visible

---

### Test 3: Design Generation - Traditional Style

**Objective**: Generate tattoo design with Traditional style

1. Click "Generate" tab in bottom navigation
2. Verify form displays with all fields
3. Fill out form:
   - **Style**: Traditional
   - **Subject**: "wolf howling at moon"
   - **Body Part**: Forearm
   - **Size**: Medium
4. Click "Generate Design"
5. Observe loading state:
   - Button should show spinner
   - Text: "Consulting with AI tattoo artist..."
   - Button should be disabled
6. Wait for completion (10-30 seconds)
7. Verify results:
   - 4 images display in grid
   - Images are tattoo-style (not photorealistic)
   - Images have bold outlines (Traditional style)
   - Metadata shows correct style, subject, placement
   - Each image has variation number (#1, #2, #3, #4)
   - "Save to Library" button on each image

**Expected Result**: 4 unique Traditional-style wolf and moon tattoo designs

**Budget Impact**: ~$0.022

---

### Test 4: Design Generation - Minimalist Style

**Objective**: Verify different styles produce different aesthetics

1. Generate new design:
   - **Style**: Minimalist
   - **Subject**: "mountain peaks"
   - **Body Part**: Wrist
   - **Size**: Small
2. Verify results look minimalist:
   - Fine lines
   - No bold outlines
   - Black ink only
   - Simple composition

**Expected Result**: Clean, minimalist design distinctly different from Traditional

**Budget Impact**: ~$0.022

---

### Test 5: Design Generation - Japanese Style

**Objective**: Test complex style with rich details

1. Generate:
   - **Style**: Japanese
   - **Subject**: "koi fish and lotus flower"
   - **Body Part**: Back
   - **Size**: Large
2. Verify Japanese characteristics:
   - Bold black lines
   - Rich colors
   - Flowing composition
   - Traditional Japanese art aesthetic

**Expected Result**: Authentic Japanese irezumi-style design

**Budget Impact**: ~$0.022

---

### Test 6: Save to Library

**Objective**: Verify designs save correctly

1. From previous generations, click "Save to Library" on variation #1
2. Verify:
   - Alert: "Design saved to your library!"
   - Button changes to "✓ Saved" (green)
   - Button becomes disabled
3. Click on different variation, save it too
4. Repeat for 2-3 more designs

**Expected Result**: Designs save with visual confirmation

---

### Test 7: Library View

**Objective**: Verify saved designs display correctly

1. Click "Library" tab
2. Verify:
   - Header shows "Design Library"
   - Stats show correct count (e.g., "4 designs | 0 favorites | 46 slots remaining")
   - All saved designs display in grid
   - Each card shows image, subject, and style
   - Heart icon appears on each card

**Expected Result**: Clean gallery view of all saved designs

---

### Test 8: Favorite Functionality

**Objective**: Test favorite toggle

1. In Library, click heart icon on first design
2. Verify:
   - Heart turns red and fills
   - Stats update ("1 favorites")
3. Click "Favorites" filter button
4. Verify:
   - Only favorited design shows
5. Toggle favorite off
6. Verify:
   - Heart returns to outline
   - Stats update ("0 favorites")

**Expected Result**: Smooth favorite toggle with live updates

---

### Test 9: Design Detail View

**Objective**: Test enlarged view and actions

1. In Library, click on any design image
2. Verify modal opens with:
   - Large image display
   - Subject as title
   - Metadata (Style, Body Part, Size, Created date)
   - Action buttons
3. Test "Add to Favorites" button
4. Click "Download Design"
5. Verify:
   - File downloads as PNG
   - Filename: `tattoo-design-{id}.png`
6. Close modal by clicking X or outside

**Expected Result**: Smooth modal interaction, successful download

---

### Test 10: Search Functionality

**Objective**: Test design search

1. In Library (with 4+ designs), type "wolf" in search box
2. Verify:
   - Only designs with "wolf" in subject show
3. Clear search
4. Verify all designs return

**Expected Result**: Real-time search filtering

---

### Test 11: Budget Tracking

**Objective**: Verify budget tracking accuracy

1. Navigate to Home page
2. Check stats card shows budget usage
3. Expected values after 3 generations:
   - Total Designs: 12 (3 requests × 4 variations)
   - Budget Used: ~$0.066 (3 × $0.022)
4. Navigate to Generate page
5. Verify budget tracker at top shows same values
6. Generate one more design
7. Verify budget updates to ~$0.088

**Expected Result**: Accurate, real-time budget tracking

---

### Test 12: Rate Limiting

**Objective**: Verify rate limiter prevents spam

1. On Generate page, fill out form
2. Click "Generate Design" rapidly 11 times
3. On 11th click, verify error message:
   - "Rate limit reached. Please wait X seconds..."
4. Wait indicated time
5. Try again - should work

**Expected Result**: Rate limiter prevents >10 requests/minute

---

### Test 13: Input Validation

**Objective**: Test form validation

1. On Generate page, leave subject empty
2. Click "Generate Design"
3. Verify error: "Please describe what you want in your tattoo"
4. Fill subject with just spaces "   "
5. Verify same error

**Expected Result**: Proper input validation

---

### Test 14: Error Handling - Invalid Token

**Objective**: Test graceful error handling

1. Edit `.env`, set token to "invalid_token"
2. Restart dev server
3. Try to generate design
4. Verify error message:
   - "Invalid Replicate API token. Please check your .env configuration."
5. Restore valid token
6. Restart server

**Expected Result**: Clear error message, no crash

---

### Test 15: Mobile Responsiveness

**Objective**: Verify mobile-first design

**Using Chrome DevTools:**

1. Open DevTools (F12)
2. Toggle device toolbar (Cmd+Shift+M / Ctrl+Shift+M)
3. Select "iPhone 12 Pro"
4. Test all pages:
   - Home: Should be readable, CTA accessible
   - Generate: Form fields should be touch-friendly
   - Library: Grid should stack appropriately
5. Test interactions:
   - Tap targets at least 44×44px
   - Scrolling smooth
   - Modals full-screen on mobile
6. Test bottom navigation:
   - Always visible
   - Icons clear
   - Active state visible

**On Actual Device (Recommended):**

1. Get your local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. On phone, navigate to `http://[YOUR_IP]:3000`
3. Test full user flow
4. Check for any layout issues
5. Verify touch interactions feel natural

**Expected Result**: Fully functional mobile experience

---

### Test 16: Library Capacity

**Objective**: Test 50-design limit

1. Generate designs until library has ~48 designs
2. Generate 2 more (should reach 50)
3. Verify stats show "0 slots remaining"
4. Try to save one more design
5. Verify:
   - Oldest non-favorite design is removed
   - New design saves successfully
6. Favorite all designs
7. Try to save one more
8. Verify error: "Library is full (50 designs). Please remove some favorites..."

**Expected Result**: Graceful handling of capacity limit

**Budget Impact**: ~$1.10 for 50 requests (expensive test, skip if on tight budget)

---

### Test 17: Export/Import Library

**Objective**: Test data portability

1. With several designs saved, click "Export" in Library
2. Verify:
   - JSON file downloads
   - Filename: `tattester-library-{timestamp}.json`
3. Open file, verify structure:
   ```json
   {
     "version": "1.0",
     "exportedAt": "...",
     "designs": [...]
   }
   ```
4. Delete some designs from library
5. Import the JSON file (future feature - note if not implemented)

**Expected Result**: Clean JSON export with all design data

---

### Test 18: Persistence

**Objective**: Verify localStorage persistence

1. Save 3-4 designs
2. Close browser completely
3. Reopen to `localhost:3000`
4. Navigate to Library
5. Verify all designs still present
6. Check Home page stats are accurate

**Expected Result**: Data persists across sessions

---

### Test 19: Image Quality

**Objective**: Verify generated images are tattoo-appropriate

1. Generate design with Realism style
2. Save image from variations
3. Open downloaded PNG
4. Verify:
   - Resolution: Should be 1024×1024 or higher
   - Quality: No obvious compression artifacts
   - Composition: Suitable for tattoo stencil
   - Background: Should be clean/neutral

**Expected Result**: High-quality, stencil-ready images

---

### Test 20: Cross-Browser Compatibility

**Objective**: Verify app works in major browsers

**Chrome** (Primary)
- Run full test suite
- Expected: Perfect functionality

**Safari** (Important for iOS)
- Test basic flow: Generate → Save → Library
- Check image loading
- Verify localStorage works

**Firefox**
- Test generation and library
- Check for any layout issues

**Mobile Safari (iOS)**
- Test on actual iPhone if possible
- Verify touch interactions
- Check for any iOS-specific issues

**Chrome Mobile (Android)**
- Test on actual Android if possible

**Expected Result**: Consistent experience across browsers

---

## Performance Testing

### Load Time
- **Home page**: Should load in <1 second
- **Generate page**: <1 second
- **Library with 20 designs**: <2 seconds

### Generation Time
- **SDXL generation**: 10-30 seconds (Replicate-dependent)
- **Timeout**: Should not exceed 2 minutes

### Image Loading
- **Single image**: <500ms on good connection
- **4 variations**: <2 seconds total

---

## Bug Tracking

If you find issues, note:

1. **Steps to reproduce**
2. **Expected behavior**
3. **Actual behavior**
4. **Browser/device**
5. **Console errors** (F12 → Console)
6. **Screenshot** if visual bug

---

## Post-Testing Cleanup

After testing:

1. Check total budget used (Home page)
2. Export library as backup
3. Consider clearing localStorage if on tight budget:
   - Browser DevTools → Application → Local Storage
   - Delete `tattester_design_library` and `tattester_api_usage`

---

## Success Criteria

App is ready for MVP launch if:

- [ ] All 20 tests pass
- [ ] No critical bugs
- [ ] Mobile experience is smooth
- [ ] Budget tracking is accurate
- [ ] Designs save and load correctly
- [ ] Error handling is graceful
- [ ] Performance is acceptable (<2s page loads)

---

## Known Issues to Document

Track any issues you find during testing:

1. [Issue description]
   - Severity: Critical/High/Medium/Low
   - Steps to reproduce
   - Workaround (if any)

---

## Next Steps After Testing

1. **Fix critical bugs** found during testing
2. **Document edge cases** in README
3. **Add A/B testing** for prompt variations
4. **User testing** with actual first-time tattoo seekers
5. **Deploy to staging** environment
6. **Prepare for production** launch

---

**Happy Testing!** 🧪

# 🔧 Troubleshooting Council UI Issues

## Issue: "Some models aren't visible"

### Step 1: Identify What's Missing

**Check which elements you CAN see:**

- [ ] Purple "✨ Enhance with AI Council" button
- [ ] AI model selector (Tattoo Flash Art, Anime XL, etc.)
- [ ] Council loading animation (4 colored circles)
- [ ] Prompt selection cards (Simple, Detailed, Ultra)
- [ ] "AI Enhanced" badges on generated images

**Which ones are you NOT seeing?** _______________

---

### Step 2: Check Browser Console

1. Open DevTools: Press **F12**
2. Go to **Console** tab
3. Look for any red error messages

**Common errors:**

```
❌ Failed to fetch module
❌ Cannot read property 'X' of undefined
❌ Module not found
```

**Copy any errors you see here:** _______________

---

### Step 3: Verify Environment

```bash
cd ~/tatt-tester
cat .env | grep COUNCIL
```

**Should show:**
```
VITE_COUNCIL_API_URL=http://localhost:8001/api
VITE_COUNCIL_DEMO_MODE=true
VITE_USE_COUNCIL=true
```

**Does it match?** [ ] Yes [ ] No

---

### Step 4: Hard Refresh

1. Clear browser cache
2. Press **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows)
3. Wait for page to fully reload

**Did this help?** [ ] Yes [ ] No

---

### Step 5: Check Page Source

Right-click on page → "Inspect" → Check if these components are in the DOM:

**Look for:**
- `class="from-purple-600 to-blue-600"` (Enhance button)
- `PromptEnhancer` component
- `CouncilLoadingState` component

**Are they present?** [ ] Yes [ ] No

---

### Step 6: Restart Dev Server

```bash
# Stop server (Ctrl+C)
cd ~/tatt-tester
rm -rf node_modules/.vite
npm run dev
```

---

## Specific Issues & Fixes

### Issue: Council Button Not Showing

**Possible causes:**
1. `VITE_USE_COUNCIL` not set to `true`
2. Browser cache not cleared
3. Component import error

**Fix:**
```bash
# 1. Verify .env
echo "VITE_USE_COUNCIL=true" >> .env

# 2. Restart server
npm run dev
```

---

### Issue: Loading Animation Not Showing

**Possible causes:**
1. CSS not loading (Tailwind issue)
2. Component state not updating
3. Demo mode not enabled

**Fix:**
Check if Tailwind gradient classes are working:
- Open DevTools → Elements
- Find the button
- Check if `bg-gradient-to-r` class is applied

---

### Issue: Prompt Cards Cut Off / Overlapping

**Possible causes:**
1. Container width issue
2. Mobile viewport issue
3. Z-index conflicts

**Fix:**
Try zooming out browser (Cmd/Ctrl + Minus key)

---

### Issue: No Enhanced Prompt Showing

**Possible causes:**
1. councilService not importing correctly
2. Demo mode not generating prompts
3. State not updating

**Fix:**
Check browser console for:
```
[CouncilService] Enhancing prompt: {...}
[CouncilService] Enhancement complete: {...}
```

---

## Quick Diagnostic Commands

```bash
# Check if files exist
ls -la ~/tatt-tester/src/components/PromptEnhancer.jsx
ls -la ~/tatt-tester/src/components/CouncilLoadingState.jsx
ls -la ~/tatt-tester/src/services/councilService.js

# Check if properly imported in App.jsx
grep -n "DesignGeneratorWithCouncil" ~/tatt-tester/src/App.jsx

# Check environment variables
cat ~/tatt-tester/.env | grep VITE_

# Check for syntax errors
cd ~/tatt-tester
npm run build --dry-run
```

---

## Still Not Working?

### Take Screenshots

1. Full page screenshot
2. Browser console (errors)
3. Network tab (failed requests)
4. Element inspector (missing components)

### Share These Details

- Browser: Chrome / Firefox / Safari
- Version: _______
- OS: Mac / Windows / Linux
- Error messages: _______
- What you see vs. what's expected: _______

---

## Expected vs. Actual

### Expected: You Should See

1. **On Load:**
   - Normal design generator form
   - Purple gradient "Enhance" button below subject input

2. **After Clicking Enhance:**
   - Animated loading state (4 circles)
   - Progress steps
   - "Analyzing your idea..." message

3. **After Enhancement:**
   - 3 prompt cards (Simple, Detailed, Ultra)
   - Radio button selection
   - "Use Prompt" button

4. **After Selecting Prompt:**
   - Enhanced prompt visible in form
   - "✨ AI Enhanced" badge in header
   - Purple badge next to generate button

### Actual: What You See

Describe what you're seeing: _______________

---

## Common "Not Visible" Issues

### 1. Elements Behind Other Elements

**Check:** Z-index conflicts
**Fix:** Open DevTools → Elements → Check computed z-index values

### 2. White Text on White Background

**Check:** Color contrast
**Fix:** Inspect element → Check text color vs. background

### 3. Overflow Hidden

**Check:** Parent container has `overflow: hidden`
**Fix:** Inspect container → Check CSS overflow property

### 4. Display None

**Check:** Element has `display: none`
**Fix:** Inspect element → Check if conditionally hidden

### 5. Off-Screen

**Check:** Element positioned outside viewport
**Fix:** Inspect element → Check top/left/right/bottom values

---

## Next Steps

1. Identify which specific elements are missing
2. Check browser console for errors
3. Verify environment variables
4. Try hard refresh
5. Share screenshots/errors for more specific help

---

**Need immediate help?** Share:
- Screenshot of the page
- Screenshot of console errors
- Output of `cat .env | grep VITE_`

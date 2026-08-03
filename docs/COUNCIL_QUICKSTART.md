> **⚠️ Not a current entry point.** This file is not listed in
> `docs/status/document-classification.md`'s "Current entry points" and may be
> stale. Last touched 2026-02-06 — env vars, setup steps, and model lists
> below may have drifted. The Council feature still exists per
> `docs/architecture/current-architecture.md` (`src/services/council/`), so
> cross-check any setup instructions here against that file and the actual
> source before following them.

# 🚀 LLM Council Integration - Quick Start

## Try It Right Now (5 Minutes)

### Step 1: Add Environment Variables

Add to `.env`:
```bash
VITE_COUNCIL_API_URL=http://localhost:8001/api
VITE_COUNCIL_DEMO_MODE=true
VITE_USE_COUNCIL=true
```

### Step 2: Update App.jsx

Replace the DesignGenerator import:

```jsx
// src/App.jsx
import DesignGeneratorWithCouncil from './components/DesignGeneratorWithCouncil';

// ... rest of your App.jsx

// In your JSX, replace:
// <DesignGenerator />
// with:
<DesignGeneratorWithCouncil />
```

### Step 3: Run It!

```bash
npm run dev
```

### Step 4: Test the Flow

1. Navigate to the design generator page
2. Enter a simple tattoo idea: **"dragon"**
3. Select style: **Traditional**
4. Click: **"✨ Enhance with AI Council"**
5. Watch the animated council discussion (3 seconds)
6. See 3 prompt levels appear
7. Select **"Detailed"** (middle option)
8. Click **"Use Detailed Prompt"**
9. Click **"Generate Design (Enhanced)"**
10. See your tattoo with **"✨ AI Enhanced"** badge!

---

## What You Should See

### Before Enhancement
```
┌─────────────────────────────────┐
│ What do you want in your tattoo?│
│ ┌─────────────────────────────┐ │
│ │ dragon                      │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ ✨ Enhance with AI Council │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### During Enhancement
```
┌─────────────────────────────────┐
│   AI Council Enhancing...       │
│                                 │
│      🎨  ⚙️  ✨  📐           │
│         (animated)              │
│                                 │
│  Analyzing your idea...         │
│  ━━━●━━━━━━━━                  │
└─────────────────────────────────┘
```

### After Enhancement
```
┌─────────────────────────────────┐
│ Select prompt detail level:     │
│                                 │
│ ○ Simple (125 chars)            │
│   A traditional dragon tattoo...│
│                                 │
│ ● Detailed (287 chars)          │
│   A fierce Eastern dragon with  │
│   flowing scales, intricate...  │
│                                 │
│ ○ Ultra (512 chars)             │
│   A photorealistic Japanese...  │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Use Detailed Prompt         │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

---

## 🎯 Quick Examples to Try

### Example 1: Bio-Mechanical Dragon
```
Idea: bio-mechanical dragon
Style: Cyberpunk
Placement: Full sleeve
```

**Enhanced Result:**
> "An intricate bio-mechanical dragon tattoo, seamlessly integrated with cyberpunk aesthetics. Features glowing conduits, metallic exoskeleton, gears interwoven with reptilian scales. Dark color palette with electric blue accents."

### Example 2: Geometric Wolf
```
Idea: geometric wolf
Style: Minimalist
Placement: Shoulder
```

**Enhanced Result:**
> "A minimalist geometric wolf tattoo composed of clean angular lines and sacred geometry patterns. Sharp triangular forms create the wolf's silhouette with precise symmetry and negative space."

### Example 3: Floral Mandala
```
Idea: flower mandala
Style: Dotwork
Placement: Upper back
```

**Enhanced Result:**
> "An intricate dotwork mandala tattoo featuring blooming lotus petals radiating from a sacred center. Thousands of precisely placed dots create dimensional shading and hypnotic symmetrical patterns."

---

## ✅ Testing Checklist

Test these features to make sure everything works:

### Basic Flow
- [ ] Enter tattoo idea
- [ ] Click "Enhance with AI Council"
- [ ] See animated loading state
- [ ] Receive 3 prompt levels
- [ ] Select a prompt
- [ ] See enhanced prompt in form
- [ ] Generate designs
- [ ] See "AI Enhanced" badge on images

### UI Features
- [ ] Council members animate during loading
- [ ] Progress steps advance
- [ ] Radio buttons work for prompt selection
- [ ] Character counts show correctly
- [ ] Negative prompt displays
- [ ] "Edit Custom" button works
- [ ] Can clear enhanced prompt

### Edge Cases
- [ ] Empty input → button disabled
- [ ] Close enhancer panel works
- [ ] Can use original prompt (skip enhancement)
- [ ] Changing subject resets enhancement
- [ ] Multiple enhancements in a row work

---

## 🐛 Common Issues & Fixes

### "Enhance" Button Won't Click
**Problem:** Button is gray and disabled
**Fix:** Make sure you've entered something in the tattoo idea field

### No Animation Showing
**Problem:** Loading state not visible
**Fix:** Check that `VITE_COUNCIL_DEMO_MODE=true` in `.env`

### App Won't Load
**Problem:** Build errors in console
**Fix:**
1. Stop dev server (Ctrl+C)
2. Delete `node_modules/.vite`
3. Restart: `npm run dev`

### Changes Not Appearing
**Problem:** Code changes not visible
**Fix:** Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)

---

## 🔄 Switch Back to Original

Want to go back to the original DesignGenerator?

**Option 1: Change App.jsx**
```jsx
import DesignGenerator from './components/DesignGenerator';
// Use DesignGenerator instead of DesignGeneratorWithCouncil
```

**Option 2: Feature Flag**
Set in `.env`:
```bash
VITE_USE_COUNCIL=false
```

Then in App.jsx:
```jsx
const USE_COUNCIL = import.meta.env.VITE_USE_COUNCIL === 'true';

return USE_COUNCIL ? <DesignGeneratorWithCouncil /> : <DesignGenerator />;
```

---

## 📊 What's Happening Behind the Scenes

### Demo Mode Flow

1. **User clicks "Enhance"**
   ```
   Button click → councilService.enhancePrompt()
   ```

2. **Service starts timer**
   ```javascript
   setTimeout(() => {
     // Simulate 3-second council discussion
   }, 3000);
   ```

3. **Mock discussion messages**
   ```javascript
   onDiscussionUpdate('Creative Director: Analyzing...')  // 500ms
   onDiscussionUpdate('Technical Expert: Refining...')    // 1200ms
   onDiscussionUpdate('Style Specialist: Enhancing...')   // 2000ms
   ```

4. **Generate mock prompts**
   ```javascript
   prompts: {
     simple: template1(userIdea, style),
     detailed: template2(userIdea, style),
     ultra: template3(userIdea, style, bodyPart)
   }
   ```

5. **Return to UI**
   ```
   PromptEnhancer receives prompts → displays cards
   ```

---

## 🎨 Customization Ideas

### Change Council Members

In `CouncilLoadingState.jsx`:
```javascript
const COUNCIL_MEMBERS = [
  { name: 'Your Expert', color: 'from-purple-500 to-pink-500', icon: '🎨' },
  { name: 'Another Expert', color: 'from-blue-500 to-cyan-500', icon: '⚙️' },
  // Add your own!
];
```

### Adjust Prompt Templates

In `councilService.js`:
```javascript
const MOCK_RESPONSES = {
  simple: (userIdea, style) =>
    `Your custom template for ${userIdea}`,

  detailed: (userIdea, style) =>
    `More detailed template...`,

  ultra: (userIdea, style, bodyPart) =>
    `Ultra detailed template...`
};
```

### Change Discussion Duration

In `councilService.js`:
```javascript
setTimeout(() => {
  resolve({...});
}, 5000); // Change from 3200 to 5000 for 5 seconds
```

---

## 🚀 Next: Connect Real Council API

Once your LLM Council backend is ready:

### Step 1: Start Council Backend
```bash
cd llm-council/backend
python -m uvicorn app.main:app --reload --port 8001
```

### Step 2: Update TatTester .env
```bash
VITE_COUNCIL_DEMO_MODE=false  # Switch to real API
VITE_COUNCIL_API_URL=http://localhost:8001/api
```

### Step 3: Test Real Integration
1. Restart TatTester dev server
2. Try enhancing a prompt
3. Watch for real council discussion
4. Get AI-generated prompts!

---

## 📖 Learn More

- **Full Documentation:** [LLM_COUNCIL_INTEGRATION.md](LLM_COUNCIL_INTEGRATION.md)
- **TatTester Context:** [TATT_TESTER_CONTEXT.md](TATT_TESTER_CONTEXT.md)
- **Design System:** [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)

---

## ✨ What Makes This Cool

### For Users
- ✅ Turn "dragon" into professional prompt
- ✅ 3 detail levels to choose from
- ✅ Beautiful animated experience
- ✅ Better tattoo designs!

### For You (Developer)
- ✅ Works in demo mode without backend
- ✅ Drop-in replacement component
- ✅ Backward compatible
- ✅ Extensible architecture
- ✅ Comprehensive error handling

### For Business
- ✅ Unique selling point ("AI creative assistant")
- ✅ Better user satisfaction
- ✅ Fewer retries = lower API costs
- ✅ Professional-quality results

---

**That's it! You're ready to test the LLM Council integration.** 🎉

**Try it now and see the magic happen!**

Questions? Check the [full documentation](LLM_COUNCIL_INTEGRATION.md) or review the code in `src/components/`.

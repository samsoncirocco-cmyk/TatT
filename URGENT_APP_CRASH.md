# 🚨 URGENT: App Crash Issue

**Time**: 2026-01-15 11:55 PST  
**Status**: App is crashing due to Zustand infinite loop

---

## 🔴 Problem

The Generate page is crashing with:

```
Warning: The result of getSnapshot should be cached to avoid an infinite loop
```

**Root cause**: The `useLayerManagement` hook returns `sortedLayers` which is a new array reference on every render, causing infinite re-renders.

---

## 🔧 Quick Fix Options

### Option 1: Disable Match Pulse Temporarily (FASTEST)

Comment out Match Pulse in Generate.jsx to get the app working:

```jsx
// Line ~1378 in Generate.jsx
{/* Temporarily disabled - causing infinite loop
<MatchPulseSidebar
    matches={matches}
    totalMatches={totalMatches}
    isLoading={isMatching}
    error={matchError}
    context={matchContext}
/>
*/}
```

### Option 2: Fix useLayerManagement Hook (PROPER FIX)

The issue is that `sortedLayers` creates a new array reference every render. Need to memoize the entire return object:

```typescript
// In useLayerManagement.ts
return useMemo(() => ({
    layers,
    sortedLayers,
    selectedLayerId,
    ...actions
}), [layers, sortedLayers, selectedLayerId, actions]);
```

### Option 3: Use layers.length everywhere

Replace all uses of `sortedLayers` in dependencies with `layers.length`:

- Line 682 in Generate.jsx ✅ (already done)
- Check for other usages

---

## 📋 Recommendation

**Do Option 1 NOW** to get the app working for testing.  
**Then do Option 2** to properly fix the issue.

---

## 🎯 Next Steps

1. Comment out MatchPulseSidebar in Generate.jsx
2. Test that app loads
3. Fix useLayerManagement hook properly
4. Re-enable MatchPulseSidebar
5. Test full flow

---

**Status**: BLOCKED - App won't load until this is fixed!

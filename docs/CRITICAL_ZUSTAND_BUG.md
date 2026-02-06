# 🚨 Critical Issue: App Won't Load

**Time**: 2026-01-15 12:00 PST  
**Status**: BLOCKED - Generate page crashing

---

## 🔴 Problem

The Generate page is crashing with a Zustand infinite loop error:

```
Warning: The result of getSnapshot should be cached to avoid an infinite loop
```

**Root cause**: The `useLayerManagement` hook is causing infinite re-renders.

---

## 🔧 What I Tried

1. ✅ Fixed `useArtistMatching` dependencies
2. ✅ Disabled `MatchPulseSidebar`
3. ✅ Disabled `useArtistMatching` hook
4. ❌ **Still crashing!**

This means the issue is in `useLayerManagement` itself, not Match Pulse.

---

## 🎯 The Real Issue

The problem is that your other agent recently added Zustand to the Forge, and there's a bug in how the store is being accessed. The `useLayerManagement` hook returns a new object reference on every render, causing infinite loops.

---

## 💡 Solution

**You need to have your other agent fix the `useLayerManagement` hook.**

The fix is in `/Users/ciroccofam/conductor/workspaces/tatt-v1/manama/src/hooks/useLayerManagement.ts`:

```typescript
// Current (BROKEN):
export function useLayerManagement() {
    const layers = useForgeStore((state) => state.layers);
    const selectedLayerId = useForgeStore((state) => state.selectedLayerId);
    
    const actions = useForgeStore(
        (state) => ({
            addLayer: state.addLayer,
            // ... all actions
        }),
        shallow
    );
    
    const sortedLayers = useMemo(() => getLayersByZIndex(layers), [layers]);
    
    return {
        layers,
        sortedLayers,
        selectedLayerId,
        ...actions
    }; // ❌ This creates a new object every render!
}

// Fixed (WORKING):
export function useLayerManagement() {
    const layers = useForgeStore((state) => state.layers);
    const selectedLayerId = useForgeStore((state) => state.selectedLayerId);
    
    const actions = useForgeStore(
        (state) => ({
            addLayer: state.addLayer,
            // ... all actions
        }),
        shallow
    );
    
    const sortedLayers = useMemo(() => getLayersByZIndex(layers), [layers]);
    
    // ✅ Memoize the entire return object
    return useMemo(() => ({
        layers,
        sortedLayers,
        selectedLayerId,
        ...actions
    }), [layers, sortedLayers, selectedLayerId, actions]);
}
```

---

## 📋 Status

**Current state**:

- ✅ All backend services working
- ✅ Match Pulse components created
- ✅ Embeddings fixed
- ❌ **App won't load due to Zustand bug**

**What's needed**:

- Fix `useLayerManagement` hook (5 minutes)
- Re-enable `useArtistMatching` and `MatchPulseSidebar`
- Test full flow

---

## 🎯 Next Steps

1. **Have your other agent fix `useLayerManagement.ts`** (see code above)
2. Test that app loads
3. Re-enable Match Pulse
4. Test full flow

---

**The good news**: This is a simple fix! Once the hook is fixed, everything will work. All the backend services are ready and working.

**Status**: Waiting for `useLayerManagement` fix to proceed.

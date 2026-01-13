# Multi-Model Routing System - Visual Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  DesignGeneratorWithCouncil.jsx                           │  │
│  │  • User enters: "Goku and Vegeta fighting"                │  │
│  │  • Selects style: "Anime"                                 │  │
│  │  • Clicks: "Enhance with AI Council"                      │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      PROMPT ENHANCER UI                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  PromptEnhancer.jsx                                       │  │
│  │  • Calls councilService.enhancePrompt()                   │  │
│  │  • Displays council discussion                            │  │
│  │  • Shows model selection with reasoning                   │  │
│  │  • Returns: enhanced prompt + model selection             │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      COUNCIL SERVICE                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  councilService.js                                        │  │
│  │                                                           │  │
│  │  START: Performance timer                                │  │
│  │    ↓                                                      │  │
│  │  PARALLEL EXECUTION:                                      │  │
│  │  ┌─────────────────────┐  ┌──────────────────────────┐   │  │
│  │  │ Model Selection     │  │ Prompt Enhancement       │   │  │
│  │  │ (async)             │  │ (async)                  │   │  │
│  │  │                     │  │                          │   │  │
│  │  │ • selectModelWith   │  │ • Character lookup       │   │  │
│  │  │   Fallback()        │  │ • Multi-character logic  │   │  │
│  │  │ • Check cache       │  │ • Style optimization     │   │  │
│  │  │ • Select optimal    │  │ • Generate 3 levels      │   │  │
│  │  └─────────────────────┘  └──────────────────────────┘   │  │
│  │           ↓                         ↓                     │  │
│  │  MERGE: Apply model-specific enhancements                │  │
│  │    ↓                                                      │  │
│  │  RETURN: {prompts, negativePrompt, modelSelection}       │  │
│  │  END: Log enhancement time (<3s)                          │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   MODEL SELECTION UTILITY                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  styleModelMapping.js                                     │  │
│  │                                                           │  │
│  │  INPUT: style="anime", prompt="Goku and Vegeta fighting" │  │
│  │         bodyPart="back"                                   │  │
│  │    ↓                                                      │  │
│  │  STEP 1: Determine complexity                            │  │
│  │    • Analyze prompt length (>500 chars = complex)        │  │
│  │    • Check for multi-character indicators                │  │
│  │    • Result: "complex"                                   │  │
│  │    ↓                                                      │  │
│  │  STEP 2: Check style mapping                             │  │
│  │    • STYLE_MODEL_MAPPING["anime"]                        │  │
│  │    • Primary: "anime_xl"                                 │  │
│  │    • Fallback: "dreamshaper_turbo"                       │  │
│  │    ↓                                                      │  │
│  │  STEP 3: Apply complexity adjustments                    │  │
│  │    • Complex prompts prefer detailed models              │  │
│  │    • anime_xl is in preferred list ✓                     │  │
│  │    ↓                                                      │  │
│  │  STEP 4: Apply body part considerations                  │  │
│  │    • "back" = large area                                 │  │
│  │    • Can handle detailed model ✓                         │  │
│  │    ↓                                                      │  │
│  │  STEP 5: Validate availability (with cache)             │  │
│  │    • Check MODEL_AVAILABILITY_CACHE                      │  │
│  │    • Cache miss → validate model                         │  │
│  │    • Cache result for 60 seconds                         │  │
│  │    • Result: available ✓                                 │  │
│  │    ↓                                                      │  │
│  │  OUTPUT: {                                               │  │
│  │    modelId: "anime_xl",                                  │  │
│  │    modelName: "Anime XL (Niji SE)",                      │  │
│  │    reasoning: "Specialized anime model...",              │  │
│  │    estimatedTime: "10-15 seconds",                       │  │
│  │    cost: 0.03,                                           │  │
│  │    isFallback: false                                     │  │
│  │  }                                                        │  │
│  │                                                           │  │
│  │  TIME: 3.75ms average                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    GENERATION SERVICE                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  replicateService.js                                      │  │
│  │                                                           │  │
│  │  generateWithRateLimit(userInput, "anime_xl")            │  │
│  │    ↓                                                      │  │
│  │  generateWithRetry(userInput, "anime_xl")                │  │
│  │    ↓                                                      │  │
│  │  generateTattooDesign(userInput, "anime_xl")             │  │
│  │    ↓                                                      │  │
│  │  • Get AI_MODELS["anime_xl"] config                      │  │
│  │  • Use enhanced prompt from council                      │  │
│  │  • Apply model-specific parameters                       │  │
│  │  • Call Replicate API                                    │  │
│  │  • Poll for completion                                   │  │
│  │    ↓                                                      │  │
│  │  RETURN: 4 generated images                              │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Model Selection Decision Tree

```
                    User Input
                        │
                        ↓
              ┌─────────────────┐
              │  Analyze Style  │
              └─────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ↓               ↓               ↓
   Traditional      Realism         Anime
        │               │               │
        ↓               ↓               ↓
  Tattoo Flash    Imagen 3         Anime XL
      Art                              │
        │                              │
        ↓                              ↓
   Check Body                    Check Complexity
      Part                             │
        │                    ┌─────────┼─────────┐
        ↓                    ↓         ↓         ↓
   Small Area           Simple    Moderate   Complex
        │                    │         │         │
        ↓                    ↓         ↓         ↓
  Keep Flash Art      DreamShaper  Anime XL  Anime XL
                         Turbo
                           │
                           ↓
                    Check Availability
                           │
                    ┌──────┴──────┐
                    ↓             ↓
               Available     Unavailable
                    │             │
                    ↓             ↓
               Use Model    Use Fallback
```

## Data Flow Diagram

```
┌──────────────┐
│   User UI    │
└──────┬───────┘
       │ 1. User enters idea + style
       ↓
┌──────────────────────┐
│  PromptEnhancer.jsx  │
└──────┬───────────────┘
       │ 2. Call enhancePrompt()
       ↓
┌──────────────────────────────────────────────────────┐
│              councilService.js                       │
│                                                      │
│  ┌─────────────────────┐  ┌────────────────────┐   │
│  │ Model Selection     │  │ Prompt Enhancement │   │
│  │ (3.75ms)            │  │ (2.8s)             │   │
│  └──────┬──────────────┘  └────────┬───────────┘   │
│         │                          │               │
│         ↓                          ↓               │
│  ┌──────────────────────────────────────────────┐  │
│  │  Merge: Apply model-specific enhancements    │  │
│  └──────┬───────────────────────────────────────┘  │
└─────────┼──────────────────────────────────────────┘
          │ 3. Return enhanced prompts + model selection
          ↓
┌──────────────────────┐
│  PromptEnhancer.jsx  │
└──────┬───────────────┘
       │ 4. Display model selection
       │ 5. User clicks "Use Prompt"
       ↓
┌──────────────────────────────┐
│ DesignGeneratorWithCouncil   │
└──────┬───────────────────────┘
       │ 6. Store modelId + enhanced prompt
       │ 7. User clicks "Generate"
       ↓
┌──────────────────────────────┐
│   replicateService.js        │
└──────┬───────────────────────┘
       │ 8. Generate with selected model
       ↓
┌──────────────────────┐
│   Replicate API      │
└──────┬───────────────┘
       │ 9. Return 4 images
       ↓
┌──────────────────────┐
│   Display Results    │
└──────────────────────┘
```

## Model Configuration Structure

```
MODEL_CONFIGS = {
  imagen3: {
    id: "imagen3",
    name: "Imagen 3 (Google)",
    description: "Best for photorealism...",
    provider: "vertex-ai",
    strengths: [
      "Photorealistic rendering",
      "Complex compositions",
      "Fine detail preservation"
    ],
    limitations: [
      "Higher cost per generation",
      "Slower generation time"
    ],
    bestFor: ["realism", "portrait"],
    estimatedTime: "15-25 seconds",
    cost: 0.02
  },
  // ... 4 more models
}

STYLE_MODEL_MAPPING = {
  traditional: {
    primary: "tattoo_flash_art",
    fallback: "blackwork_specialist",
    reasoning: "Traditional flash art model..."
  },
  // ... 20+ style mappings
}

MODEL_FALLBACK_CHAIN = {
  imagen3: [
    "blackwork_specialist",
    "dreamshaper_turbo"
  ],
  // ... fallback chains for all models
}
```

## Cache Architecture

```
MODEL_AVAILABILITY_CACHE = {
  cache: Map {
    "anime_xl" => {
      available: true,
      timestamp: 1704485678000
    },
    "imagen3" => {
      available: true,
      timestamp: 1704485679000
    }
  },
  TTL: 60000 (1 minute)
}

Cache Lifecycle:
1. First request → Cache MISS → Validate model → Store result
2. Subsequent requests (within 60s) → Cache HIT → Return cached result
3. After 60s → Cache EXPIRED → Re-validate → Update cache
```

## Performance Timeline

```
Time (ms)    Event
─────────────────────────────────────────────────────────
0            User clicks "Enhance with AI Council"
             │
1            councilService.enhancePrompt() called
             │
2            ├─ Start model selection (async)
             │  └─ selectModelWithFallback()
             │
5            │  ├─ Determine complexity (1ms)
             │  ├─ Check style mapping (1ms)
             │  ├─ Apply adjustments (1ms)
             │  └─ Validate availability (0.75ms)
             │
6            ├─ Model selection complete (3.75ms)
             │
10           ├─ Start prompt enhancement
             │  └─ Character database lookup
             │
500          │  └─ Council discussion update 1
             │
1200         │  └─ Council discussion update 2
             │
2000         │  └─ Council discussion update 3
             │
2400         │  └─ Council discussion update 4
             │
2800         ├─ Prompt enhancement complete
             │
2805         ├─ Apply model-specific enhancements (5ms)
             │
2810         └─ Return result to UI
             │
2850         UI displays model selection + enhanced prompts
─────────────────────────────────────────────────────────
Total: 2.85 seconds (target: <3 seconds) ✓
```

## Error Handling Flow

```
                 Model Selection
                        │
                        ↓
              ┌─────────────────┐
              │ Primary Model   │
              │  Available?     │
              └────────┬────────┘
                       │
              ┌────────┴────────┐
              ↓                 ↓
           YES                 NO
              │                 │
              ↓                 ↓
        Use Primary      Try Fallback #1
              │                 │
              │          ┌──────┴──────┐
              │          ↓             ↓
              │      Available    Unavailable
              │          │             │
              │          ↓             ↓
              │    Use Fallback   Try Fallback #2
              │                        │
              │                 ┌──────┴──────┐
              │                 ↓             ↓
              │            Available    Unavailable
              │                 │             │
              │                 ↓             ↓
              │           Use Fallback   Use Default
              │                              (SDXL)
              │
              ↓
        Set isFallback flag
              │
              ↓
        Log selection
              │
              ↓
        Return to user
```

## Integration Points Summary

```
┌─────────────────────────────────────────────────────────┐
│                    INTEGRATION MAP                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  UI Layer:                                              │
│  • DesignGeneratorWithCouncil.jsx                       │
│    └─ Stores modelId from council                      │
│    └─ Passes to generateWithRateLimit()                │
│                                                         │
│  • PromptEnhancer.jsx                                   │
│    └─ Displays model selection                         │
│    └─ Returns modelSelection to parent                 │
│                                                         │
│  Service Layer:                                         │
│  • councilService.js                                    │
│    └─ Imports styleModelMapping                        │
│    └─ Calls selectModelWithFallback()                  │
│    └─ Applies model-specific enhancements              │
│                                                         │
│  • replicateService.js                                  │
│    └─ Accepts modelId parameter                        │
│    └─ Uses AI_MODELS[modelId] config                   │
│                                                         │
│  Utility Layer:                                         │
│  • styleModelMapping.js                                 │
│    └─ Imports modelRoutingRules                        │
│    └─ Implements selection algorithm                   │
│    └─ Manages availability cache                       │
│                                                         │
│  Configuration Layer:                                   │
│  • modelRoutingRules.js                                 │
│    └─ Defines MODEL_CONFIGS                            │
│    └─ Defines STYLE_MODEL_MAPPING                      │
│    └─ Defines MODEL_FALLBACK_CHAIN                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

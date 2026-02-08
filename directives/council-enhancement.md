# Council Enhancement

## Goal
Enhance a user's raw tattoo idea into optimized, multi-tier generation prompts using a "Council" of AI models with tattoo-specific skill packs.

## When to Use
- Before image generation, when `NEXT_PUBLIC_USE_COUNCIL=true`
- API call to `/api/v1/council/enhance`

## Prerequisites
- At least one provider configured:
  - **Primary**: GCP credentials for Vertex AI Gemini 2.0 Flash
  - **Fallback 1**: `OPENROUTER_API_KEY` for multi-model council
  - **Fallback 2**: `NEXT_PUBLIC_COUNCIL_DEMO_MODE=true` for mock responses
- Character database loaded (`src/config/characterDatabase.js`)

## Steps

1. **Request arrives** at `/api/v1/council/enhance`:
   ```json
   {
     "user_prompt": "dragon fighting a samurai",
     "style": "Japanese",
     "body_part": "sleeve",
     "complexity": "medium",
     "isStencilMode": false
   }
   ```

2. **Character detection** — `detectCharacters()` scans the prompt against `characterDatabase.js` names. If found, `enhanceCharacterDescription()` replaces names with detailed visual descriptions.

3. **Stencil detection** — `detectStencilMode()` checks for stencil keywords (from `councilSkillPack.js`). If detected, adds negative shields against gradients/shading.

4. **Model selection** — `selectModelWithFallback()` from `styleModelMapping.js` picks the optimal image generation model for the style.

5. **Provider cascade** — `enhancePrompt()` tries providers in order:

   **a. Vertex AI Gemini** (`enhancePromptWithVertexAI`):
   - Calls `gemini-2.0-flash-exp` via Vertex AI REST endpoint.
   - Single-call: system prompt instructs JSON output with `simple`, `detailed`, `ultra`, `negativePrompt`.
   - Uses `responseMimeType: 'application/json'` for structured output.
   - Cost: ~$0.00 (Flash is free-tier eligible).

   **b. OpenRouter Multi-Model Council** (`enhancePromptWithOpenRouter`):
   - **Creative Director** (Claude 3.5 Sonnet): Generates three prompt tiers as JSON.
   - **Technical Expert** (GPT-4 Turbo): Refines the detailed prompt for tattoo feasibility.
   - **Style Specialist** (Gemini Pro 1.5): Enhances the ultra prompt for style authenticity.
   - **Technical Expert** again: Generates negative prompt.
   - Cost: ~$0.08 total (4 API calls).

   **c. Mock fallback** (demo mode):
   - Uses `MOCK_RESPONSES` templates with style/body part interpolation.
   - Simulates Council discussion updates with timed callbacks.

6. **Council Skill Pack application** (`applyCouncilSkillPack`):
   - **Anatomical flow**: Adds body-part-specific flow tokens (e.g., "following the natural curve of the forearm").
   - **Aesthetic anchors**: Appends quality tokens from `councilSkillPack.js`.
   - **Positional anchoring**: For multi-character scenes (≥2 characters), forces "Character A on the left, Character B on the right" if no spatial keywords detected.
   - **Negative shield** (stencil mode): Prepends "no shading, no gradients, no soft edges" to negative prompt.

7. **Response** — Returns enhanced prompts, negative prompt, model selection, and metadata.

## Expected Output
```json
{
  "success": true,
  "enhanced_prompts": [
    "A Japanese style tattoo of a dragon fighting a samurai...",
    "A Japanese style tattoo featuring a serpentine dragon engaged in combat...",
    "A photorealistic Japanese style tattoo masterfully composed for sleeve placement..."
  ],
  "model_selections": {
    "primary": "gemini-2.0-flash-exp",
    "reasoning": "Council enhancement via Vertex AI"
  },
  "metadata": {
    "council_members": ["Creative Director", "Technical Expert", "Style Specialist"],
    "enhancement_version": "3.0"
  }
}
```

## Edge Cases
- **All providers fail**: Falls back to mock responses with `fallback: true` in metadata.
- **Character name collisions**: Sorted by name length (longest first) to prevent partial matches.
- **Gemini returns non-JSON**: `parseJsonFromText()` extracts first valid JSON object from response text.
- **OpenRouter rate limit**: Caught and cascaded to next provider.
- **Empty prompt**: Rejected with 400 `INVALID_REQUEST` if < 3 characters.

## Cost
| Provider | Cost per Enhancement |
|----------|---------------------|
| Vertex AI Gemini Flash | ~$0.00 |
| OpenRouter (3 models) | ~$0.08 |
| Mock/Demo | $0 |

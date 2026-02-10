# Council Enhancement

## Goal
Use a simulated multi-agent "council" of AI experts (Creative Director, Technical Expert, Style Specialist) to enhance user prompts for higher-quality tattoo generation.

## When to Use
- User submits a basic or vague prompt (e.g., "dragon")
- Before sending prompt to image generation model
- API endpoint: `POST /api/v1/council/enhance`
- Trigger: Automatically called during generation workflow (optional flag to disable)

## Prerequisites
- Valid Google Cloud credentials (Vertex AI access)
- Vertex AI Gemini 2.0 Flash model enabled
- (Fallback) OpenRouter API key for Claude/GPT-4
- User prompt (raw text)
- Optional context: style, body part, user preferences

## Steps

### 1. Detect Prompt Type
**Location:** `src/services/councilService.ts` → `detectStencilMode()`, `detectCharacters()`

**Stencil Mode Detection:**
- Check for keywords: `outline`, `stencil`, `linework`, `black and white`, `line art`
- If detected → Enable stencil-specific enhancements (remove color, add line weight)

**Character Detection:**
- Check against character database (Spider-Man, Batman, Goku, etc.)
- If detected → Load character-specific context (costume details, signature poses)

### 2. Build Council Prompt
**Location:** `src/services/councilService.ts` → `buildCouncilPrompt()`

**Prompt Structure:**
```
You are a council of three tattoo design experts collaborating on a client's idea.

CLIENT IDEA: {userPrompt}
STYLE: {style or "any"}
BODY PART: {bodyPart or "any"}

COUNCIL MEMBERS:
1. Creative Director - Focus on artistic vision, composition, aesthetic appeal
2. Technical Expert - Focus on tattoo-specific technical details, feasibility, skin aging
3. Style Specialist - Focus on style authenticity, cultural accuracy, color theory

TASK: Enhance this prompt for an AI tattoo generator. Output JSON:
{
  "enhancedPrompt": "Detailed, technical prompt for SDXL model",
  "styleAdvice": "Brief style guidance for the artist",
  "placementAdvice": "Placement recommendations for this design",
  "colorPalette": ["#hex1", "#hex2", ...],
  "estimatedSessionTime": "2-4 hours",
  "technicalNotes": "Line weight, shading advice, aging considerations"
}

RULES:
- enhancedPrompt must be 1-2 sentences, highly descriptive
- Include texture, lighting, composition details
- If stencil mode: emphasize clean lines, no gradients
- If character: reference iconic elements without copyright concerns
- Avoid vague terms like "beautiful" or "nice"
```

### 3. Call Vertex AI Gemini
**Location:** `src/services/councilService.ts` → `callVertexCouncil()`

**API Call:**
```typescript
const response = await fetch(
  `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${GEMINI_MODEL}:generateContent`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{ text: councilPrompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
        topP: 0.9
      }
    })
  }
);
```

**Parse Response:**
- Extract JSON from response (may be wrapped in markdown code block)
- Validate required fields: `enhancedPrompt` at minimum
- If parsing fails → Retry with simpler prompt or fallback

### 4. Fallback to OpenRouter (if Vertex fails)
**Location:** `src/services/councilService.ts` → `callOpenRouterCouncil()`

**Model Selection:**
- **Creative Director:** Claude 3.5 Sonnet (best for creative reasoning)
- **Technical Expert:** GPT-4 Turbo (best for technical accuracy)
- **Style Specialist:** Gemini Pro 1.5 (best for cultural context)

**Sequential Calls:**
1. Call Creative Director with user prompt
2. Call Technical Expert with Creative's output
3. Call Style Specialist with both outputs
4. Merge responses into final JSON

**Cost vs Quality:**
- OpenRouter more expensive (~$0.05 vs $0.02 for Vertex)
- Higher quality outputs (especially for complex prompts)
- Use Vertex first, OpenRouter as premium fallback

### 5. Apply Character-Specific Enhancements
**Location:** `src/services/councilService.ts` → `applyCharacterContext()`

**If Character Detected:**
- Load from character database (e.g., `characterDatabase.js`)
- Add character-specific details:
  - **Spider-Man:** Web patterns, dynamic pose, mask details
  - **Batman:** Cape flow, cowl shadows, gotham noir aesthetic
  - **Goku:** Super Saiyan aura, battle stance, energy effects
- Inject into `enhancedPrompt` without violating copyright (use generic descriptors)

### 6. Post-Process and Validate
**Location:** `src/services/councilService.ts` → `validateCouncilOutput()`

**Validation Checks:**
- `enhancedPrompt` length: 50-500 characters (too short = vague, too long = confusing)
- `colorPalette` format: Valid hex codes or color names
- `estimatedSessionTime` format: "X-Y hours" or "X hours"
- No forbidden words (profanity, illegal content)

**Safety Filter:**
- Check enhanced prompt against content policy
- Remove explicit content, violence, hate speech
- If flagged → Return original prompt with warning

### 7. Cache Results (Optional)
**Location:** `src/services/councilService.ts` → cache layer (in-memory or Redis)
- Cache key: Hash of `userPrompt + style + bodyPart`
- TTL: 7 days (prompts may be reused by multiple users)
- Savings: Avoid duplicate API calls for popular prompts

### 8. Return to Caller
**Response Format:**
```json
{
  "success": true,
  "enhancedPrompt": "A fierce dragon in traditional Japanese Irezumi style, scales rendered with bold black outlines and vibrant crimson gradients, coiled dynamically around cherry blossoms, smoke effects, high contrast composition",
  "styleAdvice": "Use bold outlines (3-5px) for scales, blend red-to-orange gradient for depth, add blue-green background for contrast",
  "placementAdvice": "Best on large canvas (back, thigh, full sleeve) to showcase detail and flow",
  "colorPalette": ["#000000", "#DC143C", "#FF4500", "#228B22", "#4682B4"],
  "estimatedSessionTime": "6-8 hours",
  "technicalNotes": "Heavy blackwork foundation, color saturation will age well, consider line weight variation for scale depth",
  "councilUsed": true,
  "cost": 0.02,
  "processingTime": 2.8
}
```

## Expected Output
- **Enhanced prompt:** 2-5x more detailed than original
- **Processing time:** 2-5 seconds (Vertex), 5-10 seconds (OpenRouter)
- **Cost:** ~$0.02 per enhancement (Vertex), ~$0.05 (OpenRouter)
- **Success rate:** >95% (with fallbacks)

## Edge Cases

### Vertex AI Quota Exceeded
- **Detection:** 429 error from Vertex API
- **Fallback:** Queue request with exponential backoff (max 3 retries)
- **Alternative:** Switch to OpenRouter immediately

### Gemini Returns Non-JSON Response
- **Detection:** JSON parsing fails
- **Solution:** Use regex to extract JSON object from markdown code block
- **Fallback:** Use text response as `enhancedPrompt` directly

### Character Not in Database
- **Detection:** Character name detected but no entry in `characterDatabase.js`
- **Solution:** Use generic "character-style" enhancements (dynamic pose, bold colors)
- **Log:** Record missing character for future database update

### Prompt Too Short (e.g., "dragon")
- **Council Task:** Add context from defaults:
  - Style: Traditional (if not specified)
  - Colors: Bold primary colors
  - Composition: Dynamic, centered
- **Enhanced Output:** "A fierce dragon in traditional style..." (council fills gaps)

### Prompt Too Long (>1000 characters)
- **Detection:** User prompt exceeds token limit
- **Solution:** Truncate to 500 characters, add "..." marker
- **UI Warning:** "Long prompts may be truncated. Keep it concise for best results."

### Inappropriate Content Detected
- **Detection:** Content policy violation in original or enhanced prompt
- **Solution:** Return error with code `CONTENT_POLICY_VIOLATION`
- **User Message:** "Prompt violates content policy. Please revise."

## Performance Optimization

### Caching Strategy
- Cache frequent prompts (e.g., "dragon", "rose", "skull")
- Precompute enhancements for top 100 prompt templates
- Store in Redis or in-memory (LRU cache, max 1000 entries)

### Batch Processing
- If multiple users submit similar prompts simultaneously, batch into single Council call
- Use Vertex AI batch prediction API for non-real-time use cases

### Prompt Compression
- Use shorter council prompt for simpler user inputs
- Full council only for complex/vague prompts (detected via heuristic)

## Cost Monitoring

| Scenario | Vertex Cost | OpenRouter Cost | Recommendation |
|----------|-------------|-----------------|----------------|
| Simple prompt ("dragon") | $0.02 | $0.05 | Vertex |
| Complex prompt (paragraph) | $0.03 | $0.08 | Vertex |
| Character-specific | $0.02 | $0.06 | Vertex |
| Stencil mode | $0.02 | $0.05 | Vertex |

**Monthly Budget:**
- 1,000 enhancements/month = ~$20 (Vertex) or ~$50 (OpenRouter)
- Cache hit rate 30% = ~$14 (Vertex) or ~$35 (OpenRouter)

## Related Directives
- `generate-tattoo.md` — Full generation workflow (calls council as step 2)
- `api-endpoints.md` — API reference for `/api/v1/council/enhance`

## Future Enhancements
- **User Feedback Loop:** Learn from user edits to council prompts
- **Style-Specific Councils:** Separate councils for traditional, realism, watercolor, etc.
- **Multi-Language Support:** Detect user language, respond in same language
- **Visual References:** Analyze uploaded reference images, incorporate into prompt

# Multi-Model Routing - Quick Reference Guide

## For Developers

### Basic Usage

#### 1. Automatic Model Selection (Recommended)

```javascript
import { enhancePrompt } from './services/councilService.js';

const result = await enhancePrompt({
  userIdea: 'Dragon and Phoenix',
  style: 'traditional',
  bodyPart: 'back'
});

// Result includes model selection
console.log(result.modelSelection.modelName);  // "Tattoo Flash Art"
console.log(result.modelSelection.reasoning);  // "Traditional flash art model..."
```

#### 2. Manual Model Override

```javascript
import { generateTattooDesign } from './services/replicateService.js';

const design = await generateTattooDesign(
  userInput,
  'imagen3',  // Force use of Imagen 3
  signal
);
```

#### 3. Get Model Capabilities

```javascript
import { getModelCapabilities } from './utils/styleModelMapping.js';

const caps = getModelCapabilities('anime_xl');
console.log(caps.strengths);     // Array of strengths
console.log(caps.bestFor);       // Optimal styles
console.log(caps.estimatedTime); // "10-15 seconds"
```

## Model IDs Reference

| Model ID | Use When |
|----------|----------|
| `imagen3` | Photorealism, portraits, complex detail |
| `dreamshaper_turbo` | Fast generation, anime, illustrative |
| `tattoo_flash_art` | Traditional, neo-traditional, americana |
| `anime_xl` | Anime characters, manga style, Japanese |
| `blackwork_specialist` | Blackwork, tribal, geometric, high contrast |

## Style Mappings

```javascript
// These styles automatically select the best model:
'traditional'      → tattoo_flash_art
'neoTraditional'   → tattoo_flash_art
'realism'          → imagen3
'portrait'         → imagen3
'anime'            → anime_xl
'manga'            → anime_xl
'illustrative'     → dreamshaper_turbo
'blackwork'        → blackwork_specialist
'tribal'           → blackwork_specialist
'geometric'        → blackwork_specialist
```

## API Reference

### `selectOptimalModel(style, complexity, bodyPart)`

Selects the best model for given parameters.

**Parameters:**
- `style` (string): Tattoo style (e.g., 'traditional', 'anime')
- `complexity` (string): 'simple', 'moderate', or 'complex'
- `bodyPart` (string): Body placement (e.g., 'forearm', 'back')

**Returns:**
```javascript
{
  modelId: 'tattoo_flash_art',
  modelName: 'Tattoo Flash Art',
  modelConfig: {...},
  reasoning: 'Traditional flash art model...',
  fallbackChain: ['blackwork_specialist', 'dreamshaper_turbo'],
  estimatedTime: '10-15 seconds',
  cost: 0.003
}
```

### `selectModelWithFallback(style, prompt, bodyPart)`

Async version with automatic fallback handling.

**Parameters:**
- `style` (string): Tattoo style
- `prompt` (string): User prompt (for complexity detection)
- `bodyPart` (string): Body placement

**Returns:** Promise<ModelSelection> with `isFallback` flag

### `getModelCapabilities(modelId)`

Get detailed model information.

**Returns:**
```javascript
{
  id: 'imagen3',
  name: 'Imagen 3 (Google)',
  description: 'Google\'s latest model...',
  provider: 'vertex-ai',
  strengths: [...],
  limitations: [...],
  bestFor: ['realism', 'portrait'],
  estimatedTime: '15-25 seconds',
  cost: 0.02,
  promptModifiers: {...},
  negativePrompt: '...'
}
```

### `validateModelAvailability(modelId)`

Check if model is accessible (with 1-minute caching).

**Returns:** Promise<boolean>

### `getModelFallback(modelId)`

Get fallback model for a given model ID.

**Returns:** Promise<string> (fallback model ID)

## Configuration

### Adding a New Model

1. Add to `AI_MODELS` in `replicateService.js`:
```javascript
newModel: {
  id: 'newModel',
  name: 'New Model Name',
  version: 'owner/model:version',
  description: 'Model description',
  cost: 0.01,
  params: {...}
}
```

2. Add to `MODEL_CONFIGS` in `modelRoutingRules.js`:
```javascript
newModel: {
  id: 'newModel',
  name: 'New Model Name',
  description: 'Best for...',
  provider: 'replicate',
  strengths: [...],
  limitations: [...],
  bestFor: ['style1', 'style2'],
  estimatedTime: '10-15 seconds',
  cost: 0.01
}
```

3. Add style mapping in `STYLE_MODEL_MAPPING`:
```javascript
newStyle: {
  primary: 'newModel',
  fallback: 'blackwork_specialist',
  reasoning: 'Optimized for...'
}
```

4. Add fallback chain in `MODEL_FALLBACK_CHAIN`:
```javascript
newModel: ['fallback1', 'fallback2']
```

### Customizing Prompt Modifiers

Edit `MODEL_PROMPT_MODIFIERS` in `modelRoutingRules.js`:

```javascript
newModel: {
  positive: 'keywords to add to prompt',
  negative: 'keywords to avoid'
}
```

## Performance Tips

1. **Use caching**: Model availability is cached for 1 minute
2. **Parallel execution**: Model selection runs during prompt enhancement
3. **Clear cache**: Call `clearModelCache()` if models change
4. **Batch operations**: Selection is very fast (3-4ms average)

## Debugging

### Enable verbose logging

Model selection automatically logs to console:

```
[StyleModelMapping] Selecting model for: { style: 'anime', complexity: 'complex', bodyPart: 'back' }
[StyleModelMapping] Model anime_xl availability: true
```

### Check enhancement time

```javascript
const result = await enhancePrompt({...});
console.log(`Enhancement took ${result.metadata.enhancementTime}ms`);
```

### Verify model selection

```javascript
const result = await enhancePrompt({...});
console.log('Selected:', result.modelSelection.modelName);
console.log('Reasoning:', result.modelSelection.reasoning);
console.log('Is Fallback:', result.modelSelection.isFallback);
```

## Common Issues

### Issue: Wrong model selected

**Solution:** Check style mapping in `STYLE_MODEL_MAPPING`. Ensure style name matches exactly.

### Issue: Fallback always used

**Solution:** Check model availability. Verify model ID exists in both `AI_MODELS` and `MODEL_CONFIGS`.

### Issue: Slow performance

**Solution:** Ensure caching is working. Check `MODEL_AVAILABILITY_CACHE.TTL` is set to 60000ms.

### Issue: Model not found error

**Solution:** Verify model ID matches across all configuration files. Check for typos.

## Testing

### Run tests

```bash
node tests/modelRouting.test.js
```

### Manual testing

```javascript
import { selectOptimalModel } from './src/utils/styleModelMapping.js';

// Test different styles
const styles = ['traditional', 'anime', 'realism', 'blackwork'];
styles.forEach(style => {
  const result = selectOptimalModel(style, 'moderate', 'forearm');
  console.log(`${style} → ${result.modelName}`);
});
```

## Best Practices

1. **Let the system choose**: Use automatic selection unless you have a specific reason to override
2. **Trust the reasoning**: The system considers style, complexity, and body part
3. **Monitor costs**: Different models have different costs (check `result.modelSelection.cost`)
4. **Handle fallbacks gracefully**: Display fallback indicator to users
5. **Cache wisely**: 1-minute TTL balances freshness and performance

## Support

For issues or questions:
1. Check this guide first
2. Review `MULTI_MODEL_ROUTING_SUMMARY.md` for detailed architecture
3. Check console logs for debugging information
4. Verify configuration in `modelRoutingRules.js`

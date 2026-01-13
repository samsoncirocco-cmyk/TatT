# OpenRouter Council Setup Guide

## Quick Start

1. **Get an OpenRouter API Key**
   - Visit: https://openrouter.ai/keys
   - Sign up and create an API key
   - Add credits to your account (recommended: $5-10 to start)

2. **Configure Environment**
   Add to your `.env` file:
   ```bash
   VITE_USE_OPENROUTER=true
   VITE_OPENROUTER_API_KEY=your_actual_key_here
   VITE_COUNCIL_DEMO_MODE=false
   ```

3. **Restart Dev Server**
   ```bash
   npm run dev
   ```

## How It Works

The OpenRouter council uses **3 different AI models** to enhance your prompts:

### Council Members

1. **Creative Director** (Claude 3.5 Sonnet)
   - Generates base enhanced prompts at 3 levels (Simple, Detailed, Ultra)
   - Focuses on artistic vision and composition
   - Best for creative interpretation

2. **Technical Expert** (GPT-4 Turbo)
   - Refines prompts for tattoo feasibility
   - Considers placement, line weight, and aging
   - Ensures technical accuracy

3. **Style Specialist** (Gemini Pro 1.5)
   - Ensures style authenticity
   - Adds cultural context when relevant
   - Enhances with style-specific techniques

### Enhancement Flow

```
User Input: "dragon with lightning"
    ↓
Creative Director → Generates 3 prompt levels
    ↓
Technical Expert → Refines for tattoo execution
    ↓
Style Specialist → Ensures style authenticity
    ↓
Result: Professional-quality prompts at 3 detail levels
```

## Cost Estimation

- **Per Enhancement**: $0.01 - $0.03 USD
- **100 Enhancements**: ~$1-3 USD
- **Pricing varies** by model and prompt length

OpenRouter shows exact costs in their dashboard.

## Advantages Over Demo Mode

| Feature | Demo Mode | OpenRouter Council |
|---------|-----------|-------------------|
| Quality | Template-based | Real AI reasoning |
| Customization | Limited | Fully adaptive |
| Style Accuracy | Generic | Style-specific |
| Cultural Context | None | Authentic |
| Cost | Free | ~$0.02/enhancement |

## Fallback Behavior

The system automatically falls back in this order:

1. **OpenRouter** (if `VITE_USE_OPENROUTER=true` and key configured)
2. **Custom Council Backend** (if `VITE_COUNCIL_API_URL` configured)
3. **Demo Mode** (if `VITE_COUNCIL_DEMO_MODE=true`)
4. **Basic Enhancement** (fallback if all fail)

## Testing

Test the OpenRouter integration:

```bash
# 1. Set environment variables
export VITE_USE_OPENROUTER=true
export VITE_OPENROUTER_API_KEY=your_key

# 2. Start dev server
npm run dev

# 3. Navigate to /generate
# 4. Enter a prompt like "cyberpunk dragon"
# 5. Click "Enhance with AI Council"
# 6. Watch the console for "Using OpenRouter council"
```

## Troubleshooting

### "OpenRouter not configured"
- Check that `VITE_OPENROUTER_API_KEY` is set in `.env`
- Restart dev server after adding the key

### "OpenRouter API error: 401"
- Invalid API key
- Check key at https://openrouter.ai/keys

### "OpenRouter API error: 402"
- Insufficient credits
- Add credits at https://openrouter.ai/credits

### Enhancement takes too long
- OpenRouter calls 3 models sequentially (~5-10 seconds total)
- This is normal for quality results
- Consider caching common prompts in future

## Model Selection

You can customize which models the council uses by editing `src/services/openRouterCouncil.js`:

```javascript
const COUNCIL_MEMBERS = {
  creative: {
    model: 'anthropic/claude-3.5-sonnet',  // Change to any OpenRouter model
    role: 'Creative Director',
    focus: 'Artistic vision'
  },
  // ... etc
};
```

Available models: https://openrouter.ai/models

## Next Steps

- **Monitor costs** in OpenRouter dashboard
- **Adjust models** based on quality/cost preferences
- **Add caching** for common prompts (future enhancement)
- **A/B test** OpenRouter vs demo mode for user satisfaction

# TatTester Quick Start Guide

Get TatTester running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- Replicate API account

## Step 1: Install Dependencies

```bash
npm install
```

This will install:
- React + Vite
- React Router DOM
- Replicate SDK
- Sharp.js (image processing)
- Tailwind CSS
- All dev dependencies

## Step 2: Get Your Replicate API Token

1. Go to [replicate.com](https://replicate.com)
2. Sign up or log in
3. Navigate to [Account > API Tokens](https://replicate.com/account/api-tokens)
4. Click "Create token"
5. Copy your token (starts with `r8_...`)

**Note**: Replicate offers $0.50 in free credits to start!

## Step 3: Configure Environment

Open `.env` file and replace the placeholder:

```bash
VITE_REPLICATE_API_TOKEN=r8_your_actual_token_here
```

**Important**: Keep this file private! It's already in `.gitignore`.

## Step 4: Start Development Server

```bash
npm run dev
```

The app will open automatically at `http://localhost:3000`

## Step 5: Generate Your First Design

1. Click the **Generate** tab in the bottom navigation
2. Select a tattoo style (try "Traditional" first)
3. Enter a subject like "wolf and moon"
4. Choose body part (e.g., "Forearm")
5. Select size (try "Medium")
6. Click "Generate Design"
7. Wait 10-30 seconds
8. View your 4 variations!
9. Save favorites to your library

## Testing the Features

### Test 1: Traditional Style
- Style: Traditional
- Subject: "eagle with American flag"
- Body Part: Upper Arm
- Size: Large

### Test 2: Minimalist Style
- Style: Minimalist
- Subject: "mountain peaks and pine trees"
- Body Part: Forearm
- Size: Small

### Test 3: Japanese Style
- Style: Japanese
- Subject: "koi fish swimming through waves"
- Body Part: Back
- Size: Large

## Understanding Costs

- Each generation: ~$0.022
- Generates: 4 variations
- Your free $0.50 credit: ~22 requests (~88 variations)

## Budget Tracking

The app automatically tracks your spending:
- View on Home page
- Top of Generate page shows budget usage
- Tracks daily and total spend

## Library Management

- **Save designs**: Click "Save to Library" on any variation
- **View library**: Click Library tab
- **Favorites**: Click heart icon on any design
- **Download**: Open design detail, click "Download Design"
- **Export backup**: Click "Export" button in Library
- **Maximum**: 50 designs (localStorage limit)

## Troubleshooting

### "API token not configured"
→ Check `.env` file, restart dev server

### "Insufficient credits"
→ Add credits to Replicate account at replicate.com/account

### Designs taking too long
→ Normal! SDXL takes 10-30 seconds per generation

### Images not loading
→ Check network tab, Replicate URLs expire after ~1 hour

### Library not saving
→ Check localStorage is enabled in browser settings

## Next Steps

1. **Generate multiple styles** to see the difference
2. **Save your favorites** to build your library
3. **Test on mobile** for the full experience
4. **Export your library** as backup
5. **Monitor your budget** to stay on track

## Production Deployment

When ready to deploy:

```bash
npm run build
```

Deploy the `dist/` folder to:
- Vercel (recommended)
- Netlify
- AWS S3 + CloudFront
- Any static hosting

**Remember**: Add `VITE_REPLICATE_API_TOKEN` to your hosting platform's environment variables!

## Development Tips

### Hot Module Replacement
Vite provides instant updates. Just save your files and see changes immediately.

### Mobile Testing
Use Chrome DevTools device emulation or test on your actual phone via local network.

### Code Quality
```bash
npm run lint    # Check for issues
```

### Debugging
- Open browser DevTools console
- Look for `[Replicate]`, `[DesignLibrary]`, `[ImageProcessing]` log prefixes
- Budget tracking logs API usage

## Common Issues

**Slow generations**
- SDXL is a large model, 10-30s is normal
- Consider switching to a faster model post-MVP

**Token visible in client**
- Acceptable for MVP
- Move to server-side in production

**50 design limit**
- localStorage constraint
- Upgrade to database post-funding

**Images disappear**
- Replicate URLs are temporary
- Download important designs
- Future: permanent storage

## Files You'll Edit Most

```
src/
├── components/
│   ├── DesignGenerator.jsx    # Main UI
│   ├── DesignLibrary.jsx      # Library view
│   └── Home.jsx               # Landing page
├── config/
│   └── promptTemplates.js     # Tweak prompts here
└── services/
    └── replicateService.js    # API logic
```

## Getting Help

1. Check browser console for errors
2. Review README.md for detailed docs
3. Verify Replicate API status at status.replicate.com
4. Check Replicate docs: docs.replicate.com

## Success Checklist

- [ ] Dependencies installed
- [ ] Replicate API token configured
- [ ] Dev server running
- [ ] First design generated successfully
- [ ] Design saved to library
- [ ] Budget tracker visible
- [ ] Tested on mobile (or DevTools)

## You're Ready!

You now have a fully functional AI tattoo design generator. Start creating and building your MVP!

**Budget tip**: With $500 budget, you can generate ~5,675 requests. That's plenty for MVP validation!

---

Happy designing! 🎨

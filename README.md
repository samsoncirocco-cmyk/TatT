# TatTester - AI Tattoo Design Generator

AI-powered tattoo visualization platform that transforms first-time tattoo seekers' commitment anxiety into confidence through custom design generation, AR preview, and artist matching.


## Features

### Phase 1 MVP (Current)
- **AI Design Generation**: Create custom tattoo designs using multiple AI models (SDXL, Anime XL, DreamShaper XL, Tattoo Flash Art)
- **Design Inpainting**: Edit specific parts of generated designs with AI-powered brush tool
- **Stencil Export**: Export designs as high-quality 300 DPI stencils for professional use
- **7 Tattoo Styles**: Traditional, Neo-Traditional, Japanese, Minimalist, Watercolor, Blackwork, Realism
- **Prompt Engineering**: Optimized templates for each style to ensure tattoo-quality results
- **Design Library**: Save and manage up to 50 designs locally
- **Budget Tracking**: Monitor API usage to stay within bootstrap budget
- **Mobile-First UI**: Clean, gallery-like interface optimized for touch interactions

### Coming Soon
- AR Preview functionality
- Artist discovery and matching
- Social sharing features

## Technology Stack

- **Frontend**: React 19 + Vite 5
- **Routing**: React Router DOM v7
- **Styling**: Tailwind CSS 3.4
- **AI Generation**: Replicate.com (SDXL, Anime XL, DreamShaper XL, Tattoo Flash Art models)
- **AI Inpainting**: Stable Diffusion Inpainting for design customization
- **Image Processing**: Canvas API (browser) + Sharp.js (stencil export)
- **Backend**: Express.js proxy server for Replicate API
- **Storage**: localStorage + IndexedDB (Phase 1), Database (Phase 2)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Replicate API account ([Sign up here](https://replicate.com))

### Installation

1. **Clone the repository**
   ```bash
   cd /Users/ciroccofam/tatt-tester
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the project root:
   ```bash
   # Server-side API token (never exposed to client)
   REPLICATE_API_TOKEN=your_actual_replicate_api_token
   
   # Frontend auth token (change in production)
   FRONTEND_AUTH_TOKEN=dev-token-change-in-production
   VITE_FRONTEND_AUTH_TOKEN=dev-token-change-in-production
   
   # Proxy URL for frontend
   VITE_PROXY_URL=http://localhost:3001/api
   ```

   Get your Replicate token from: https://replicate.com/account/api-tokens

4. **Start development servers**
   ```bash
   # Terminal 1: Frontend dev server
   npm run dev

   # Terminal 2: Backend proxy server
   npm run server
   ```

   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:3001`

## Usage

### Generating Your First Design

1. Navigate to the **Generate** tab
2. Select an AI model (SDXL recommended for tattoos)
3. Choose a tattoo style (Traditional, Japanese, etc.)
4. Describe what you want (e.g., "wolf and moon")
5. Select body placement and size
6. Click "Generate Design"
7. Wait ~10-30 seconds for 4 variations
8. Hover over designs to reveal action buttons

### Editing a Design with Inpainting

1. After generating designs, hover over any variation
2. Click "✏️ Edit Design" button
3. Use the brush to paint over areas you want to change (shown in red)
4. Adjust brush size as needed
5. Describe what you want in the painted area
6. Click "Generate Edited Design"
7. Wait ~10-20 seconds for the AI to regenerate only the masked area
8. Your edited design replaces the original in the gallery

### Exporting as Stencil

1. Hover over a generated design
2. Click "Export as Stencil"
3. Review the 300 DPI processed version
4. Click "Download Stencil" to save as PNG
5. Design is optimized for professional tattoo transfer

### Managing Your Library

- View all saved designs in the **Library** tab
- Toggle favorites by clicking the heart icon
- Search and filter designs
- Export your library as JSON backup
- Download designs as high-quality PNGs

## Budget Management

### Cost Structure
- **SDXL Generation**: ~$0.022 per request (4 variations)
- **Anime XL**: ~$0.12 per request (4 variations)
- **DreamShaper XL Turbo**: ~$0.004 per request (4 variations, fastest)
- **Tattoo Flash Art**: ~$0.012 per request (4 variations)
- **Inpainting**: ~$0.0014 per second (~$0.014 typical edit)
- **Phase 1 Budget**: $500
- **Estimated Capacity**: ~5,000-20,000 requests depending on model mix

### Budget Tracking
The app automatically tracks:
- Total API spend
- Requests per day
- Remaining budget
- View stats on the Home page and in the Generate interface

### Rate Limiting
- Maximum 10 requests per minute
- Prevents accidental budget overruns
- Displays wait time if limit reached

## Architecture

### Project Structure
```
tatt-tester/
├── src/
│   ├── components/          # React components
│   │   ├── DesignGenerator.jsx   # Main generation UI
│   │   ├── InpaintingEditor.jsx  # Design editing with brush tool
│   │   ├── StencilExport.jsx     # 300 DPI stencil processor
│   │   ├── DesignLibrary.jsx     # Saved designs gallery
│   │   └── Home.jsx              # Landing page
│   ├── services/            # Business logic
│   │   ├── replicateService.js   # AI generation API
│   │   ├── inpaintingService.js  # AI inpainting API
│   │   ├── imageProcessingService.js  # Canvas + Sharp.js
│   │   └── designLibraryService.js    # localStorage management
│   ├── config/              # Configuration
│   │   └── promptTemplates.js    # Style-specific prompts
│   ├── App.jsx              # Root component + routing
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles + Tailwind
├── server.js                # Express proxy for Replicate API
├── .env                     # Environment variables
├── package.json
├── vite.config.js
└── tailwind.config.js
```

### Key Services

**replicateService.js**
- Handles Replicate API calls for design generation
- Supports 4 AI models (SDXL, Anime XL, DreamShaper XL, Tattoo Flash Art)
- Implements retry logic with exponential backoff
- Provides rate limiting (10 requests/minute)
- Tracks budget usage per model
- Error handling for auth, rate limits, credits
- Demo mode for testing without API calls

**inpaintingService.js**
- AI-powered design editing
- Stable Diffusion Inpainting model integration
- Canvas-based brush tool for masking
- Prompt-guided regeneration of masked areas
- Cost estimation and tracking

**imageProcessingService.js**
- Browser-based image processing (Canvas API)
- Sharp.js pipeline for Node.js environment
- Contrast enhancement for stencil quality
- 300 DPI resizing
- IndexedDB storage for large images
- Download and export utilities

**designLibraryService.js**
- localStorage-based design management
- CRUD operations for designs
- Search and filtering
- Favorites system
- Export/import functionality
- Max 50 designs (localStorage limit)

**promptTemplates.js**
- Style-specific prompt engineering
- Body part specifications
- Size modifiers
- Negative prompts for quality
- Validation utilities

## Prompt Engineering

Each tattoo style has carefully optimized prompts:

### Traditional
"american traditional tattoo, bold black outlines, limited color palette, classic sailor jerry style..."

### Japanese
"japanese irezumi tattoo, traditional japanese art style, bold black lines, rich colors..."

### Minimalist
"minimalist tattoo design, simple clean lines, black ink only, delicate fine line work..."

### And 4 more styles

Prompts are automatically enhanced with:
- Body part orientation (vertical, horizontal, wrap)
- Size modifiers (small delicate vs. large statement piece)
- Quality enhancers (stencil ready, professional tattoo art)
- Negative prompts (prevents blurry, distorted results)

## Development

### Available Scripts

```bash
npm run dev      # Start frontend dev server (port 3000)
npm run server   # Start backend proxy server (port 3001)
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `REPLICATE_API_TOKEN` | Server-side Replicate API token (never exposed to client) | Yes |
| `FRONTEND_AUTH_TOKEN` | Server-side auth token for proxy protection | Yes |
| `VITE_FRONTEND_AUTH_TOKEN` | Client-side auth token (must match FRONTEND_AUTH_TOKEN) | Yes |
| `VITE_PROXY_URL` | Backend proxy URL (default: http://localhost:3001/api) | No |
| `ALLOWED_ORIGINS` | Comma-separated CORS whitelist | No |
| `VITE_DEMO_MODE` | Enable demo mode (true/false) | No |

## Scaling Considerations

### Current (Bootstrap Phase)
- localStorage (50 designs max)
- Client-side processing
- No authentication
- Budget tracking in browser

### Post-Funding (Phase 2)
- Database storage (PostgreSQL/MongoDB)
- Server-side image processing
- User authentication
- Cloud storage for images
- Analytics and tracking
- AR preview integration
- Artist matching system

## Known Limitations

1. **localStorage Limit**: Maximum 50 designs
2. **Image Processing**: Browser-based, not as powerful as Sharp.js server-side
3. **No Authentication**: Designs stored per-device only
4. **API Token Client-Side**: Token visible in browser (okay for MVP, fix in production)
5. **Rate Limiting**: Client-side only, can be bypassed (server-side in production)

## Troubleshooting

### "API token not configured"
- Check `.env` file exists
- Verify token is set: `VITE_REPLICATE_API_TOKEN=r8_...`
- Restart dev server after changing `.env`

### "Failed to generate design"
- Check Replicate account has credits
- Verify API token is valid
- Check network connection
- Look for rate limiting message

### "Library is full"
- Delete old designs or remove favorites
- Export library as backup before deleting
- Consider upgrading to database storage

### Designs not saving
- Check browser localStorage is enabled
- Try different browser
- Clear localStorage and try again
- Check browser console for errors

## Performance Optimization

### Image Loading
- Lazy loading for library grid
- Skeleton loading states
- Progressive image loading
- IndexedDB for large files

### API Optimization
- Rate limiting prevents abuse
- Retry logic with backoff
- Batch processing for multiple images
- Caching (future enhancement)

### Mobile Performance
- Touch-optimized interactions
- Minimal re-renders
- Debounced search
- Virtual scrolling (future)

## Security Notes

### Current (MVP)
- API token in client-side code (acceptable for MVP)
- No user authentication
- No server-side validation

### Production TODO
- Move API key to server-side
- Implement user authentication
- Add server-side validation
- Rate limiting on server
- CORS configuration
- Input sanitization

## Contributing

This is a solo-founder bootstrap project in MVP phase. Contributions welcome post-seed funding.

## Budget & Costs

### Replicate Pricing
- SDXL: ~$0.0055 per image
- 4 variations per request: ~$0.022
- Phase 1 budget: $500
- Estimated: ~5,675 generation requests

### Cost Optimization Strategies
1. **Prompt Optimization**: Better prompts = fewer regenerations
2. **Rate Limiting**: Prevents accidental over-use
3. **Budget Tracking**: Real-time monitoring
4. **Caching**: (Future) Avoid duplicate generations

## Roadmap

### Phase 1: AI Design Generation (Current)
- [x] Replicate API integration with 4 AI models
- [x] 7 tattoo styles with optimized prompts
- [x] AI-powered design inpainting/editing
- [x] 300 DPI stencil export
- [x] Design library with localStorage
- [x] Budget tracking
- [x] Mobile-first UI
- [x] Express.js proxy server

### Phase 2: AR Preview (Post-Seed)
- [ ] AR.js or 8th Wall integration
- [ ] Body part detection
- [ ] Real-time overlay
- [ ] Photo capture and sharing

### Phase 3: Artist Matching (Post-Seed)
- [ ] Artist database
- [ ] Style matching algorithm
- [ ] Swipe-based discovery
- [ ] Booking system

## License

Proprietary - TatTester

## Contact

For questions or support, contact the founder.

---

**Built with focus on:**
- First-timer commitment anxiety reduction
- Bootstrap budget efficiency
- Mobile-first experience
- Scalable architecture
- Clean, gallery-like aesthetic

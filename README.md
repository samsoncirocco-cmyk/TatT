# TatTester - AI Tattoo Design Generator

AI-powered tattoo visualization platform that transforms first-time tattoo seekers' commitment anxiety into confidence through custom design generation, AR preview, and artist matching.

## Features

### Phase 1 MVP (Current)
- **AI Design Generation**: Create custom tattoo designs using Replicate's SDXL model
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

- **Frontend**: React 18 + Vite
- **Routing**: React Router DOM
- **Styling**: Tailwind CSS
- **AI Generation**: Replicate.com (SDXL model)
- **Image Processing**: Sharp.js (for stencil-quality output)
- **Storage**: localStorage (Phase 1), Database (Phase 2)

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

   Create or update `.env` file:
   ```bash
   VITE_REPLICATE_API_TOKEN=your_actual_replicate_api_token
   ```

   Get your token from: https://replicate.com/account/api-tokens

4. **Start development server**
   ```bash
   npm run dev
   ```

   App will open at `http://localhost:3000`

## Usage

### Generating Your First Design

1. Navigate to the **Generate** tab
2. Select a tattoo style (Traditional, Japanese, etc.)
3. Describe what you want (e.g., "wolf and moon")
4. Choose body placement and size
5. Click "Generate Design"
6. Wait ~10-30 seconds for 4 variations
7. Save your favorites to the library

### Managing Your Library

- View all saved designs in the **Library** tab
- Toggle favorites by clicking the heart icon
- Search and filter designs
- Export your library as JSON backup
- Download designs as high-quality PNGs

## Budget Management

### Cost Structure
- **Per Request**: ~$0.022 (generates 4 variations)
- **Phase 1 Budget**: $500
- **Estimated Capacity**: ~22,700 variations or ~5,675 requests

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
│   │   ├── DesignLibrary.jsx     # Saved designs gallery
│   │   └── Home.jsx              # Landing page
│   ├── services/            # Business logic
│   │   ├── replicateService.js   # API integration
│   │   ├── imageProcessingService.js  # Sharp.js processing
│   │   └── designLibraryService.js    # localStorage management
│   ├── config/              # Configuration
│   │   └── promptTemplates.js    # Style-specific prompts
│   ├── App.jsx              # Root component + routing
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles + Tailwind
├── .env                     # Environment variables
├── package.json
├── vite.config.js
└── tailwind.config.js
```

### Key Services

**replicateService.js**
- Handles Replicate API calls
- Implements retry logic with exponential backoff
- Provides rate limiting
- Tracks budget usage
- Error handling for auth, rate limits, credits

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
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_REPLICATE_API_TOKEN` | Your Replicate API token | Yes |

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
- [x] Replicate API integration
- [x] 7 tattoo styles with optimized prompts
- [x] Design library with localStorage
- [x] Budget tracking
- [x] Mobile-first UI

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

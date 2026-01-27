# TatTester - Next.js Version

This is the Next.js migration of the TatTester platform - an AI-powered tattoo design generator and visualization platform.

**Live Production:** https://manama-next.vercel.app/

## Getting Started

### Prerequisites

**Option 1: Native (Recommended for single computer)**
- Node.js 20+
- npm (with `--legacy-peer-deps` support)

**Option 2: Docker (Recommended for multi-computer setup)**
- Docker Desktop
- Docker Compose

### Installation

**Option 1: Native Setup**

```bash
# Navigate to the Next.js workspace
cd manama-next

# Install dependencies (required for first-time setup)
npm install --legacy-peer-deps
```

**Option 2: Docker Setup**

```bash
# Navigate to the Next.js workspace
cd manama-next

# Build and start Docker container
docker-compose up dev
```

See [DOCKER_SETUP.md](./DOCKER_SETUP.md) for detailed Docker instructions.

### Development

**Native:**
```bash
# Start the development server
npm run dev
```

**Docker:**
```bash
# Start the development container
docker-compose up dev

# Or run in background
docker-compose up -d dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

**Note:** The `/generate` page may show errors in local development due to Google Cloud service imports. This does NOT affect production - the page works perfectly on Vercel.

### Production Build

```bash
# Build for production
npm run build

# Start production server locally
npm start
```

### Environment Setup

Create a `.env.local` file with the required environment variables:

```bash
# See .env.example for full list of required variables
# Critical variables:
NEXT_PUBLIC_PROXY_URL=http://127.0.0.1:3002/api
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_SUPABASE_URL=your_url
# ... (see MIGRATION_STATUS.md for complete list)
```

## Tech Stack

- **Framework:** Next.js 16 with App Router & Turbopack
- **React:** 19.2.3
- **Styling:** Tailwind CSS v3.4.17
- **State Management:** Zustand
- **Backend Services:**
  - Firebase (Auth, Storage)
  - Vertex AI (Image Generation)
  - Neo4j (Graph Database)
  - Supabase (Vector Database)

## Project Structure

```
src/
├── app/              # Next.js App Router pages & API routes
│   ├── api/v1/       # API endpoints
│   ├── generate/     # The Forge design studio
│   └── page.tsx      # Homepage
├── components/       # React components
├── services/         # Business logic & API clients
├── hooks/            # Custom React hooks
└── lib/              # Utilities & configurations
```

## Key Features

- **AI Design Generation**: Vertex AI-powered tattoo design creation
- **Layer Management**: Multi-layer canvas with transforms & blend modes
- **Version History**: Git-like versioning with branching
- **Artist Matching**: Hybrid vector-graph matching algorithm
- **Match Pulse UI**: Swipeable artist discovery interface

## Documentation

- [MIGRATION_STATUS.md](./MIGRATION_STATUS.md) - Migration details & known issues
- [LOCAL_DEV_SETUP.md](./LOCAL_DEV_SETUP.md) - Native local development guide
- [DOCKER_SETUP.md](./DOCKER_SETUP.md) - Docker setup for multi-computer development
- [SERVER_INSTRUCTIONS.md](./SERVER_INSTRUCTIONS.md) - API server configuration
- [CHANGELOG_2026-01-25.md](./CHANGELOG_2026-01-25.md) - Recent fixes & updates

## Deployment

The app is automatically deployed to Vercel on every push to the `manama/next` branch.

**Production URL:** https://manama-next.vercel.app/

## Known Issues

### Local Development

- **`/generate` page:** Shows 500 error locally due to client-side imports of Google Cloud services
  - **Workaround:** These services work via API routes in production
  - **Status:** Does NOT affect Vercel deployment

## Recent Updates (Jan 25, 2026)

**Local Development Environment Fixed:**
- ✅ Downgraded Tailwind CSS from v4 to v3.4.17 for compatibility
- ✅ Updated PostCSS configuration
- ✅ Added Turbopack config to Next.js
- ✅ Production build verified working
- ✅ Dev server operational

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS v3 Docs](https://v3.tailwindcss.com/docs)
- [Zustand State Management](https://github.com/pmndrs/zustand)

## Support

For issues or questions about this migration, see [MIGRATION_STATUS.md](./MIGRATION_STATUS.md) or contact the development team.

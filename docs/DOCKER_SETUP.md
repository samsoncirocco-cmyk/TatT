# Docker Setup Guide

**For Multi-Computer Development**

## Prerequisites

- Docker Desktop installed ([download](https://www.docker.com/products/docker-desktop))
- Docker Compose (included with Docker Desktop)

## Quick Start

### First Time Setup (Any Computer)

```bash
# 1. Navigate to project
cd manama-next

# 2. Make sure .env.local exists
cp .env.example .env.local
# Edit .env.local with your values

# 3. Build and start the development container
docker-compose up dev
```

Open http://localhost:3000 - you should see the app running!

### Daily Development Workflow

```bash
# Start dev container (builds automatically if needed)
docker-compose up dev

# Or run in background
docker-compose up -d dev

# View logs
docker-compose logs -f dev

# Stop container
docker-compose down
```

## Docker Commands Reference

### Development

```bash
# Start development server
docker-compose up dev

# Rebuild if dependencies changed
docker-compose up --build dev

# Run commands inside container
docker-compose exec dev npm install <package>
docker-compose exec dev npm run lint

# Shell access
docker-compose exec dev sh
```

### Production Build (for testing)

```bash
# Build and run production container
docker-compose --profile production up prod

# Access at http://localhost:3001
```

### Maintenance

```bash
# Stop all containers
docker-compose down

# Remove volumes (clean slate)
docker-compose down -v

# Rebuild from scratch
docker-compose build --no-cache dev

# Clean up Docker system
docker system prune -a
```

## How It Works

### Multi-Stage Dockerfile

1. **deps stage**: Installs dependencies
2. **development stage**: Dev server with hot-reload
3. **builder stage**: Production build
4. **production stage**: Optimized production image

### Volume Mounts

- **Source code**: Mounted with `:delegated` for better performance
- **node_modules**: Separate named volume to avoid conflicts
- **.env.local**: Read-only mount for environment variables

### File Watching

The dev container uses polling for file watching, which works reliably across all platforms:

```yaml
environment:
  - WATCHPACK_POLLING=true
  - CHOKIDAR_USEPOLLING=true
```

This may use slightly more CPU but ensures hot-reload works on macOS/Windows.

## Multi-Computer Workflow

### Setup on New Computer

```bash
# 1. Clone repository
git clone <repo-url>
cd manama-next

# 2. Copy your .env.local (from secure storage)
# Or create new .env.local with your values

# 3. Start Docker container
docker-compose up dev
```

That's it! No Node.js, npm, or dependency installation needed.

### Switching Between Computers

**Computer A:**
```bash
# Commit your code
git add .
git commit -m "Working on feature X"
git push

# Stop container
docker-compose down
```

**Computer B:**
```bash
# Pull latest changes
git pull

# Start container (automatically picks up changes)
docker-compose up dev
```

## Performance Optimization

### macOS/Windows Performance Tips

1. **Enable VirtioFS** (Docker Desktop Settings > Resources > VirtioFS)
   - Significantly improves file system performance

2. **Allocate More Resources** (Docker Desktop Settings > Resources)
   - CPU: 4+ cores
   - Memory: 4-6 GB
   - Swap: 1 GB

3. **Use Docker Desktop 4.6+**
   - Includes Turbopack optimizations

### File Watching Performance

If hot-reload is slow:

```yaml
# In docker-compose.yml, adjust polling interval
environment:
  - WATCHPACK_POLLING=1000  # Lower = faster but more CPU
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs dev

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache dev
docker-compose up dev
```

### Port Already in Use

```bash
# Change port in docker-compose.yml
ports:
  - "3010:3000"  # Use 3010 instead of 3000
```

### Hot Reload Not Working

```bash
# Ensure polling is enabled
docker-compose exec dev env | grep POLLING

# Should see:
# WATCHPACK_POLLING=true
# CHOKIDAR_USEPOLLING=true
```

### Dependencies Not Updating

```bash
# Rebuild after package.json changes
docker-compose down
docker-compose build --no-cache dev
docker-compose up dev
```

### .env.local Changes Not Picked Up

```bash
# Restart container
docker-compose restart dev
```

## Pros & Cons

### Advantages ✅

- **Consistency**: Same environment across all computers
- **Portability**: Only need Docker installed
- **Isolation**: No Node version conflicts
- **Clean**: No polluting host system
- **Team Collaboration**: Everyone uses same setup

### Trade-offs ⚠️

- **File Watching Performance**: Slightly slower on macOS/Windows
- **Initial Build**: Takes ~2-3 minutes first time
- **Docker Learning Curve**: Need basic Docker knowledge
- **Resource Usage**: Docker Desktop uses ~2-4 GB RAM

## Performance Comparison

| Metric | Native | Docker |
|--------|--------|--------|
| Build Time | ~45s | ~60s |
| Hot Reload | <1s | 1-2s |
| Memory Usage | ~800MB | ~1.5GB |
| Disk Space | ~500MB | ~1.2GB |

## Best Practices

### 1. Keep .env.local Secure

Never commit `.env.local` to git. Use secure storage like:
- 1Password
- LastPass
- Encrypted cloud storage

### 2. Use .dockerignore

Already configured to exclude:
- `node_modules`
- `.next`
- `.env*.local`
- IDE files

### 3. Regular Cleanup

```bash
# Weekly cleanup
docker system prune

# Remove unused images
docker image prune -a
```

### 4. Update Docker Regularly

Keep Docker Desktop updated for performance improvements.

## Alternative: Native Development

If Docker performance is an issue, you can still use native development:

```bash
# Native (no Docker)
npm install --legacy-peer-deps
npm run dev
```

Both approaches work - choose based on your needs:
- **Docker**: Consistency > Performance
- **Native**: Performance > Consistency

## VS Code Integration

### Dev Containers Extension

Install "Dev Containers" extension for VS Code:

1. Install extension
2. `Cmd/Ctrl + Shift + P` → "Dev Containers: Reopen in Container"
3. Work inside container with full IntelliSense

### Create .devcontainer/devcontainer.json

```json
{
  "name": "TatTester Next.js",
  "dockerComposeFile": "../docker-compose.yml",
  "service": "dev",
  "workspaceFolder": "/app",
  "extensions": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss"
  ]
}
```

## Next Steps

1. **Test on current computer**: `docker-compose up dev`
2. **Verify hot-reload**: Edit a file, check browser
3. **Setup on second computer**: Clone repo, start Docker
4. **Compare performance**: Docker vs native

Need help? See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) or ask the team!

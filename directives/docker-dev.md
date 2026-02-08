# Docker Development Environment

> Directive for running TatTester in Docker containers for local development and production testing

## Goal

Run the Next.js application inside Docker using the multi-stage Dockerfile and docker-compose configuration, enabling consistent development environments and production build testing without installing Node.js locally.

## When to Use

- When you want an isolated, reproducible dev environment
- When testing the production Docker image before deploying to Railway
- When working on a machine without Node.js 20 installed
- When debugging environment-specific issues (Linux vs macOS)

## Prerequisites

- **Docker Desktop** installed and running (`docker --version`)
- **Docker Compose** v2+ (`docker compose version`)
- `.env.local` file with valid credentials (same as `setup-local-dev.md`)

## Steps

### Development Mode

1. **Create `.env.local`** if it does not already exist

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

2. **Build and start the development container**

   ```bash
   docker compose up dev
   ```

   This runs the `development` target from the multi-stage Dockerfile:
   - Base image: `node:20-alpine`
   - Installs dependencies with `--legacy-peer-deps`
   - Mounts source code as a volume (changes reflect immediately)
   - Uses a named volume for `node_modules` to avoid host/container conflicts
   - Mounts `.env.local` as read-only
   - Enables file polling (`WATCHPACK_POLLING=true`, `CHOKIDAR_USEPOLLING=true`) for Docker file watching
   - Exposes port 3000

3. **Open the app**

   Navigate to `http://localhost:3000`.

4. **Edit code normally** -- source files are mounted from the host. Hot reload works via polling.

5. **Stop the container**

   ```bash
   docker compose down
   ```

### Production Mode (Testing)

1. **Build and start the production container**

   ```bash
   docker compose --profile production up prod
   ```

   This runs the `production` target:
   - Builds the Next.js app with `npm run build`
   - Creates a minimal production image with standalone output
   - Runs as non-root user `nextjs` (UID 1001)
   - Reads env vars from `.env.local`
   - Exposes on port 3001 (to avoid conflict with dev on 3000)

2. **Verify the production build**

   ```bash
   curl http://localhost:3001
   ```

3. **Stop the container**

   ```bash
   docker compose --profile production down
   ```

### Rebuilding After Dependency Changes

If `package.json` or `package-lock.json` changes:

```bash
docker compose build --no-cache dev
docker compose up dev
```

## Expected Output

- **Dev mode**: Container starts, Next.js dev server runs on port 3000, hot reload works when editing source files on the host
- **Prod mode**: Container builds the app, starts the standalone server on port 3001, serves the production bundle
- `docker compose ps` shows the running container(s) as healthy

## Edge Cases

- **Slow file watching on macOS**: The `:delegated` volume flag and polling env vars are already configured to mitigate this. If still slow, increase Docker Desktop resource allocation (CPU/RAM)
- **`node_modules` mismatch**: If you see module errors after switching between native and Docker development, remove the named volume: `docker volume rm manama-next_node_modules` and rebuild
- **Port conflict**: If port 3000 or 3001 is in use, edit the port mapping in `docker-compose.yml` (e.g., `"3002:3000"`)
- **`.env.local` not found**: The dev service mounts `.env.local` as read-only; the file must exist before starting the container
- **Production build fails**: Run `npm run build` locally first to identify TypeScript or build errors before building the Docker image
- **Alpine-specific issues**: The image uses `node:20-alpine` with `libc6-compat` for native module compatibility. If a dependency requires glibc, switch to `node:20-slim`

## Cost

- No direct monetary cost
- Docker Desktop is free for personal use; requires a subscription for commercial use in organizations with 250+ employees
- Disk usage: ~500MB for the dev image, ~200MB for the production image

## Related Directives

- [setup-local-dev.md](./setup-local-dev.md) -- Alternative: run natively without Docker
- [deploy.md](./deploy.md) -- Use production Docker mode to validate before deploying to Railway
- [database-setup.md](./database-setup.md) -- Database infrastructure is external to Docker; must be set up separately

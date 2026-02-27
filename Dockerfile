FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Next 16 + next-firebase-auth-edge currently has a peer-dep mismatch; match local installs.
RUN npm ci --legacy-peer-deps

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .

# NEXT_PUBLIC_* are statically inlined into the client bundle at build time.
# Provide them via Cloud Build substitutions -> docker build args.
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID

RUN npm run build

FROM python:3.12-slim AS python-builder
WORKDIR /app
COPY execution/requirements.txt ./execution/
RUN python -m venv /venv && \
    /venv/bin/pip install --no-cache-dir -r execution/requirements.txt

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Add Python runtime for execution scripts
RUN apk add --no-cache python3 py3-pip

# Create non-root user to run the app on Cloud Run
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Python venv and execution scripts
COPY --from=python-builder --chown=nextjs:nodejs /venv /venv
COPY --chown=nextjs:nodejs execution/ ./execution/
COPY --chown=nextjs:nodejs directives/ ./directives/

# Add Python venv to PATH
ENV PATH="/venv/bin:$PATH"

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Add healthcheck using startup endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health/startup || exit 1

CMD ["node", "server.js"]

# SignalRoom API — multi-stage production build
# Usage: docker build -f apps/api/Dockerfile -t signalroom-api .

# ── Stage 1: install production deps only ──────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# ── Stage 2: production runtime ─────────────────────────────────────
FROM node:22-alpine AS runtime

RUN apk add --no-cache curl tini && \
    addgroup -g 1001 -S signalroom && \
    adduser -S signalroom -u 1001 -G signalroom && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

# Source files needed by API (relative imports reach into root workspace)
COPY src/data/ ./src/data/
COPY services/event-gateway/src/ ./services/event-gateway/src/
COPY packages/observability/src/ ./packages/observability/src/
COPY apps/api/src/ ./apps/api/src/
COPY package.json ./

RUN mkdir -p /app/data && chown -R signalroom:signalroom /app

USER signalroom

EXPOSE 8787

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8787/health/live || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/api/src/server.js"]

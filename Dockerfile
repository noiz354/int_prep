# SignalRoom — Root multi-stage Dockerfile
# Builds frontend (Vite) and API in a single image for lightweight deploys.
# Usage: docker build -t signalroom .

# ── Stage 1: install all deps ──────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && npm cache clean --force

# ── Stage 2: build frontend ────────────────────────────────────────
FROM deps AS frontend-build
COPY . .
RUN npm run build

# ── Stage 3: production runtime ─────────────────────────────────────
FROM node:22-alpine AS runtime

RUN apk add --no-cache curl tini && \
    addgroup -g 1001 -S signalroom && \
    adduser -S signalroom -u 1001 -G signalroom && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=frontend-build /app/dist ./dist

# Source files needed by API
COPY src/data/ ./src/data/
COPY services/event-gateway/src/ ./services/event-gateway/src/
COPY packages/observability/src/ ./packages/observability/src/
COPY apps/api/src/ ./apps/api/src/
COPY vite.config.js ./
COPY index.html ./

RUN mkdir -p /app/data && chown -R signalroom:signalroom /app

RUN mkdir -p /app/data && chown -R signalroom:signalroom /app

USER signalroom

EXPOSE 8787

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8787/health/live || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/api/src/server.js"]

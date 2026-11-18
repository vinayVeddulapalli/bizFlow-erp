# Multi-stage Dockerfile for BizFlow ERP Next.js Web Frontend
FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat curl
RUN npm install -g pnpm@12.21.0 turbo

WORKDIR /app

# Stage 1: Build stage
FROM base AS builder
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/web ./apps/web

# Install all monorepo dependencies
RUN pnpm install --frozen-lockfile

# Build shared packages
RUN pnpm --filter @bizflow/shared-types run build
RUN pnpm --filter @bizflow/shared-utils run build
RUN pnpm --filter @bizflow/validation run build

# Build Next.js web application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN pnpm --filter @bizflow/web run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3002

RUN apk add --no-cache curl
RUN npm install -g pnpm@12.21.0

# Create dedicated non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/apps/web/next.config.mjs ./apps/web/next.config.mjs
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3002

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3002/ || exit 1

WORKDIR /app/apps/web
CMD ["node_modules/.bin/next", "start", "-p", "3002"]

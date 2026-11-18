# Multi-stage Dockerfile for BizFlow ERP NestJS Backend API
FROM node:20-alpine AS base

# Install required system tools
RUN apk add --no-cache libc6-compat openssl
RUN npm install -g pnpm@12.21.0 turbo

WORKDIR /app

# Stage 1: Install dependencies and build shared packages
FROM base AS builder
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY database ./database
COPY apps/api ./apps/api

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
RUN pnpm exec prisma generate --schema=./database/prisma/schema.prisma

# Build shared libraries and API
RUN pnpm --filter @bizflow/shared-types run build
RUN pnpm --filter @bizflow/shared-utils run build
RUN pnpm --filter @bizflow/validation run build
RUN pnpm --filter @bizflow/api run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install openssl for prisma engine
RUN apk add --no-cache openssl curl

# Create dedicated non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/database ./database
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

USER nestjs

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/api/v1/health || exit 1

WORKDIR /app/apps/api
CMD ["node", "dist/main"]

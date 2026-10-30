# =============================================================================
# MULTI-STAGE DOCKERFILE FOR DELIVERY HUB MANAGEMENT SYSTEM
# Base: Node.js 20 Alpine Linux (Lightweight, Secure, Non-root)
# Target: Next.js App Router Standalone Production Build
# =============================================================================

# --- Stage 1: Dependencies ---
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy dependency specifications and Prisma schema for post-install generation
COPY package.json package-lock.json ./
COPY src/infrastructure/database/prisma/schema.prisma ./src/infrastructure/database/prisma/schema.prisma

RUN npm ci

# --- Stage 2: Builder ---
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client with linux-musl target
RUN npx prisma generate --schema=src/infrastructure/database/prisma/schema.prisma

ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Build standalone Next.js bundle
RUN npm run build

# --- Stage 3: Production Runner ---
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat curl

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Security: Create and run under non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install Prisma CLI and tsx globally in runner for automated migrations and seeding
RUN npm install -g prisma@5.22.0 tsx

# Pre-create directory tree
RUN mkdir -p .next public src/infrastructure/database/prisma node_modules && chown -R nextjs:nodejs /app

# Copy standalone build artifacts
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/src/infrastructure/database/prisma ./src/infrastructure/database/prisma
COPY --from=deps /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/deploy/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Healthcheck probe against the internal health route
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]

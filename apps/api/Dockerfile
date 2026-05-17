# --- Stage 1: Dependencies ---
FROM node:20-alpine AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile --prod=false

# --- Stage 2: Build ---
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages ./packages

COPY apps/api/ ./apps/api/
COPY packages/ ./packages/
COPY package.json pnpm-workspace.yaml turbo.json ./

RUN cd apps/api && pnpm exec prisma generate
RUN pnpm --filter @pavelo/api build

# --- Stage 3: Production Runtime ---
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 fastify

ENV NODE_ENV=production
ENV API_PORT=4000

COPY --from=builder --chown=fastify:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=fastify:nodejs /app/apps/api/node_modules ./node_modules
COPY --from=builder --chown=fastify:nodejs /app/apps/api/prisma ./prisma
COPY --from=builder --chown=fastify:nodejs /app/apps/api/package.json ./

USER fastify

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --spider -q http://localhost:4000/health || exit 1

CMD ["node", "dist/index.js"]

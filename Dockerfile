# ─── Stage 1: pnpm + node base ────────────────────────────────────────────────
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ─── Stage 2: Install all dependencies ────────────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copy manifest files only (better layer caching)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/db/package.json      ./packages/db/
COPY packages/shared/package.json  ./packages/shared/
COPY packages/queue/package.json   ./packages/queue/
COPY apps/api/package.json         ./apps/api/
COPY apps/bot/package.json         ./apps/bot/

RUN pnpm install --frozen-lockfile

# ─── Stage 3: Copy source + generate Prisma client ────────────────────────────
FROM deps AS builder
WORKDIR /app
COPY . .
RUN pnpm --filter @taxi/db generate

# ─── Stage 4a: API ────────────────────────────────────────────────────────────
FROM builder AS api
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node_modules/.bin/tsx", "apps/api/src/index.ts"]

# ─── Stage 4b: Bot ────────────────────────────────────────────────────────────
FROM builder AS bot
ENV NODE_ENV=production
CMD ["node_modules/.bin/tsx", "apps/bot/src/bot.ts"]

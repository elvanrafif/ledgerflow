# LedgerFlow API — production image.
#
# Bun runs TypeScript directly, so there is no compile step; the image installs
# workspace deps, generates the Prisma client, applies migrations, then starts.
# Build from the repo root:
#   docker build -f apps/api/Dockerfile -t ledgerflow-api .
FROM oven/bun:1-alpine AS base
WORKDIR /app

# --- deps: install with the lockfile for reproducible builds ---
FROM base AS deps
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN bun install --frozen-lockfile

# --- runtime ---
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY package.json bun.lock ./
COPY apps/api ./apps/api
COPY apps/web/package.json ./apps/web/package.json
WORKDIR /app/apps/api

# Use the workspace-pinned Prisma binary directly. `bunx prisma` can re-resolve
# from the registry and drift from the locked version.
RUN ./node_modules/.bin/prisma generate

# Migrations run on start (idempotent). Seed is intentionally NOT run here — a
# demo dataset is seeded manually so production never fabricates data.
EXPOSE 4000
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && bun src/server.ts"]

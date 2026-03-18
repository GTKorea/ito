# ── Build stage ──
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

# Install ALL dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/

# Build shared package
RUN pnpm --filter @ito/shared build

# Generate Prisma client + Build API
RUN cd apps/api && npx prisma generate
RUN pnpm --filter @ito/api build

# Prune to production dependencies only
RUN pnpm prune --prod

# ── Production stage ──
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

# Copy everything needed from builder (with pruned node_modules)
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/apps/api/node_modules apps/api/node_modules
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/apps/api/prisma apps/api/prisma
COPY --from=builder /app/apps/api/package.json apps/api/
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/packages/shared/package.json packages/shared/
COPY --from=builder /app/package.json ./

# Create uploads directory
RUN mkdir -p apps/api/uploads

WORKDIR /app/apps/api

EXPOSE 3011

CMD ["node", "dist/main"]

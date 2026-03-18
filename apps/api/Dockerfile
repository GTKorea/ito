# ── Build stage ──
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/

# Build shared package
RUN pnpm --filter @ito/shared build

# Generate Prisma client
RUN cd apps/api && npx prisma generate

# Build API
RUN pnpm --filter @ito/api build

# ── Production stage ──
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/api/package.json apps/api/
COPY --from=builder /app/packages/shared/package.json packages/shared/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/apps/api/prisma apps/api/prisma
COPY --from=builder /app/apps/api/node_modules/.prisma apps/api/node_modules/.prisma
COPY --from=builder /app/packages/shared/dist packages/shared/dist

# Create uploads directory
RUN mkdir -p apps/api/uploads

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["node", "dist/main"]

# ── Stage 1: Install dependencies ──
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@10.25.0 --activate
WORKDIR /app

# Copy root files needed for pnpm workspace / prisma
COPY .npmrc package.json pnpm-lock.yaml ./
COPY prisma ./prisma
COPY web/package.json web/pnpm-lock.yaml ./web/

# Install all deps (including devDependencies for prisma generate & build)
RUN cd web && pnpm install --frozen-lockfile
# Generate Prisma client here where pnpm store is available (avoids auto-install issue in builder)
RUN cd web && pnpm run prisma:generate

# ── Stage 2: Build the Next.js app ──
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.25.0 --activate
WORKDIR /app

COPY --from=deps /app/web/node_modules ./web/node_modules
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps /app/web/src/generated ./web/src/generated
COPY . .

# Skip prebuild hook (prisma generate already done in deps stage)
RUN cd web && sed -i '/"prebuild"/d' package.json

# Build Next.js (standalone output)
RUN cd web && pnpm run build

# ── Stage 3: Production runner ──
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/web/.next/standalone ./
# Copy static assets & public
COPY --from=builder /app/web/.next/static ./.next/static
COPY --from=builder /app/web/public ./public
# Copy prisma schema (needed at runtime for migrations)
COPY --from=builder /app/prisma ./prisma
# Install prisma CLI with all transitive deps for running migrations at startup
RUN npm install --no-save prisma@6.19.2

RUN mkdir -p .next/cache && \
    chown -R nextjs:nodejs .next

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node server.js"]

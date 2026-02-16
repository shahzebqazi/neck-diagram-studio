# =============================================================================
# Neck Diagrams - Next.js Frontend Dockerfile
# =============================================================================
# Multi-stage build for production static export
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# -----------------------------------------------------------------------------
# Stage 2: Build
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for environment
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build static export
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Production (serve static files)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy static export
COPY --from=builder /app/out ./out
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Install serve for static file serving
RUN npm install -g serve

USER nextjs

EXPOSE 3000

# Serve static files
CMD ["serve", "-s", "out", "-l", "3000"]

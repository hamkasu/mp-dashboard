# Multi-stage build for faster builds and smaller images

# Stage 1: Builder - Install dependencies and build
FROM node:20-bullseye-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./

# Install ALL dependencies (including dev) needed for building
RUN npm ci --prefer-offline --no-audit

# Copy all source files (dockerignore will exclude unnecessary files)
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production --no-audit

# Stage 2: Production - Copy only necessary files
FROM node:20-bullseye-slim AS production

# Install only runtime dependencies (no build tools)
RUN apt-get update && apt-get install -y \
    libcairo2 \
    libpango-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy production node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy database schema
COPY --from=builder /app/shared ./shared

# Railway injects PORT environment variable automatically
ENV PORT=5000
ENV NODE_ENV=production

EXPOSE 5000

# Start the application
CMD ["npm", "start"]

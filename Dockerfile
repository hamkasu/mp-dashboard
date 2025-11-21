# Use Node 20 (canvas has prebuilt binaries for this version)
FROM node:20-bullseye-slim

# Install native dependencies required for pdf-parse/canvas
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

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev) needed for building
RUN npm ci

# Copy application files
COPY . .

# Build TypeScript - fail if build fails
RUN npm run build

# Remove dev dependencies after build to reduce image size
RUN npm prune --production

# Railway injects PORT environment variable automatically
# Default to 5000 for local testing
ENV PORT=5000

EXPOSE 5000

# Start the application
CMD ["npm", "start"]

# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (better-sqlite3)
# build-base includes make, g++, and other build essentials
# python3 is required for node-gyp to compile native addons
RUN apk add --no-cache build-base python3

# Install dependencies (including devDependencies for building native modules)
COPY package.json package-lock.json* ./
RUN npm ci --include=dev || npm install --no-audit --no-fund

# Remove devDependencies after build to keep only production dependencies with compiled binaries
RUN npm prune --production

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy production node_modules from builder (includes compiled native modules, excludes devDependencies)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json /app/package-lock.json* ./

# Copy app code
COPY src ./src
COPY index.js ./index.js

ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/data/app.db

EXPOSE 3000

# Create data dir for SQLite and ensure perms
RUN mkdir -p /data && chown -R node:node /data && chown -R node:node /app
VOLUME ["/data"]

USER node
CMD ["npm","start"]


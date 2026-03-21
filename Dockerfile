FROM node:24-bookworm-slim AS deps

WORKDIR /app

# Install build tooling only in the dependencies stage for native modules.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

FROM node:24-bookworm-slim

WORKDIR /app

COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src

ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/data/app.db

EXPOSE 3000

RUN mkdir -p /data \
  && chown -R node:node /data \
  && chown -R node:node /app
VOLUME ["/data"]

USER node
CMD ["npm", "start"]

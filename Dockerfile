ARG NODE_IMAGE=node:22.22.3-alpine3.22@sha256:cd7807368cf24826297cbad5dca1a44972ccfd770647db52a8c7589eb4599ac8

FROM ${NODE_IMAGE} AS deps

WORKDIR /app

# Native build deps live only in this transient stage.
# hadolint ignore=DL3018
RUN apk upgrade --no-cache \
  && apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

FROM ${NODE_IMAGE}

LABEL org.opencontainers.image.title="Pew Pew Collection" \
      org.opencontainers.image.description="Self-hosted, offline-first firearm inventory" \
      org.opencontainers.image.source="https://github.com/Gogorichielab/PPCollection" \
      org.opencontainers.image.licenses="BUSL-1.1" \
      org.opencontainers.image.vendor="Pew Pew Collection"

WORKDIR /app

COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src

ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data \
    DATABASE_PATH=/data/app.db

EXPOSE 3000

RUN apk upgrade --no-cache \
  && mkdir -p /data \
  && chown -R node:node /data \
  && chown -R node:node /app
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

USER node
CMD ["npm", "start"]

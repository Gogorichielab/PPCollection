ARG NODE_IMAGE=node:24.14.0-alpine3.22

FROM ${NODE_IMAGE} AS deps

WORKDIR /app

# Keep native build dependencies in this stage only.
# DL3018 (pin apk versions) is suppressed because Alpine doesn't retain old
# patch versions in its repo — pinning would break the build the next time
# upstream rolls. This stage is transient (multi-stage build), so no apk
# packages reach the runtime image.
# hadolint ignore=DL3018
RUN apk upgrade --no-cache \
  && apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

FROM ${NODE_IMAGE}

WORKDIR /app

COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src

ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/data/app.db

EXPOSE 3000

RUN apk upgrade --no-cache \
  && mkdir -p /data \
  && chown -R node:node /data \
  && chown -R node:node /app
VOLUME ["/data"]

USER node
CMD ["npm", "start"]

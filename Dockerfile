ARG NODE_IMAGE=node:24.14.0-alpine3.22

FROM ${NODE_IMAGE} AS deps

WORKDIR /app

# Native build deps live only in this transient stage.
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

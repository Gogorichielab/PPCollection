ARG NODE_IMAGE=node:24.14.0-alpine3.22@sha256:71d2bb73adbfdabb08f205087a3c03fef0e504075ba1029ed191b4bc9923ef26

FROM ${NODE_IMAGE} AS deps

WORKDIR /app

# Keep native build dependencies in this stage only.
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

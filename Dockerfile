FROM node:25-alpine

WORKDIR /app

# Install dependencies first
COPY package.json package-lock.json* ./
RUN npm ci || npm install --no-audit --no-fund

# Copy app code
COPY src ./src

ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/data/app.db

EXPOSE 3000

# Create data dir for SQLite and ensure perms
RUN mkdir -p /data && chown -R node:node /data && chown -R node:node /app
VOLUME ["/data"]

USER node
CMD ["npm","start"]

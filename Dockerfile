FROM oven/bun:1-alpine AS deps
WORKDIR /build
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM node:lts-alpine AS prod
LABEL org.opencontainers.image.description "Fixes Meta's Threads metadata for sites like Discord, Telegram, etc."
LABEL org.opencontainers.image.source "https://github.com/seriaati/fixthreads"

WORKDIR /app
COPY --from=deps /build/node_modules ./node_modules
COPY . .

CMD ["node_modules/.bin/tsx", "./src/index.ts"]

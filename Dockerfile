FROM node:lts-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /build
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS prod
LABEL org.opencontainers.image.description "Fixes Meta's Threads metadata for sites like Discord, Telegram, etc."
LABEL org.opencontainers.image.source "https://github.com/seriaati/fixthreads"

WORKDIR /app
COPY --from=deps /build/node_modules ./node_modules
COPY . .

CMD ["node_modules/.bin/tsx", "./src/index.ts"]
# syntax=docker/dockerfile:1
ARG NODE_IMAGE=node:24-alpine

FROM ${NODE_IMAGE} AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# Prisma CLI minimal untuk migrasi, terpisah dari node_modules hasil trace Next.js.
# Versinya diambil dari package-lock supaya selalu sama dengan @prisma/client aplikasi.
FROM base AS migrator
WORKDIR /migrate
COPY package-lock.json /tmp/package-lock.json
RUN --mount=type=cache,target=/root/.npm \
    PRISMA_VERSION=$(node -p "require('/tmp/package-lock.json').packages['node_modules/prisma'].version") && \
    DOTENV_VERSION=$(node -p "require('/tmp/package-lock.json').packages['node_modules/dotenv'].version") && \
    echo '{"name":"suara-mipa-migrate","private":true}' > package.json && \
    npm install --no-audit --no-fund --omit=dev "prisma@${PRISMA_VERSION}" "dotenv@${DOTENV_VERSION}"
COPY prisma.config.ts ./
COPY prisma/schema.prisma ./prisma/schema.prisma
COPY prisma/migrations ./prisma/migrations

# Stage terakhir = image yang di-build & di-deploy pipeline Unpad (Auto DevOps).
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    PRISMA_HIDE_UPDATE_MESSAGE=1
# npm/npx tidak dipakai saat runtime (DB_MIGRATE memanggil binary prisma langsung);
# dibuang supaya dependensi bawaannya tidak ikut terdeteksi Trivy.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
      /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack && \
    addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Dipakai DB_MIGRATE di .gitlab-ci.yml (pre-deploy job) & docker compose lokal:
#   cd /app/migrate && ./node_modules/.bin/prisma migrate deploy
COPY --from=migrator --chown=nextjs:nodejs /migrate ./migrate
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
ARG GIT_SHA=dev
ENV APP_VERSION=$GIT_SHA
CMD ["node", "server.js"]

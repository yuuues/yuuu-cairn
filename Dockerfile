# ---- Kettlewright (Node.js) — imagen multi-stage ----
# El server se bundlea con tsup (inlina @kw/core y @kw/shared); Prisma Client
# queda externo y se genera en build. El SPA de web se compila y se sirve desde
# Fastify (@fastify/static) en la misma imagen.

FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
# openssl: requerido por el engine de Prisma en debian-slim
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- build ----
FROM base AS build
COPY . /app
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @kw/server exec prisma generate
RUN pnpm --filter @kw/web build
RUN pnpm --filter @kw/server build
# Directorio desplegable autocontenido para el server (incluye node_modules + prisma CLI)
RUN pnpm --filter @kw/server deploy --legacy /app/deploy

# ---- runtime ----
FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Dependencias de ejecución (incluye @prisma/client generado y la CLI de prisma)
COPY --from=build /app/deploy/node_modules ./node_modules
# Bundle del server
COPY --from=build /app/packages/server/dist ./dist
# Esquema y migraciones de Prisma
COPY --from=build /app/packages/server/prisma ./prisma
# SPA compilado y datos de juego
COPY --from=build /app/packages/web/dist ./web
COPY --from=build /app/data ./data

# Config (paridad con .env del origen). SECRET_KEY debe tener >=32 chars.
ENV DATA_DIR=/app/data \
    WEB_DIST=/app/web \
    DATABASE_URL=file:/app/db/prod.db \
    PORT=8000

# Volumen para la base SQLite persistente
VOLUME ["/app/db"]
EXPOSE 8000

# Aplica migraciones y arranca el server (un único binario)
CMD ["sh", "-c", "mkdir -p /app/db && ./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma && node dist/main.js"]

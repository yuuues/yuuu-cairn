# Kettlewright (Node.js)

Migración a Node.js de Kettlewright (gestor de personajes/partidas de Cairn), con arquitectura hexagonal.

## Paquetes
- `packages/core` — dominio + casos de uso + puertos (TS puro)
- `packages/shared` — esquemas Zod / tipos
- `packages/server` — Fastify + Prisma + Socket.IO (adaptadores)
- `packages/web` — React + Vite (SPA)

## Desarrollo
```
pnpm install
pnpm --filter @kw/server exec prisma generate
pnpm dev
```

## Tests
```
pnpm test
```

## Build de producción
El server se bundlea con **tsup** (inlina `@kw/core` y `@kw/shared`; Prisma Client queda externo) y el SPA de `web` se sirve desde Fastify con `@fastify/static`.

```
pnpm --filter @kw/web build      # genera packages/web/dist
pnpm --filter @kw/server build   # genera packages/server/dist/main.js (bundle)

# arranque del binario único (sirviendo API + SPA):
DATABASE_URL="file:./dev.db" \
DATA_DIR="../../data" \
WEB_DIST="../../web/dist"  # o ruta absoluta al dist de web
SECRET_KEY="<min 32 chars>" \
node packages/server/dist/main.js
```

Variables relevantes: `SECRET_KEY` (≥32 chars, requerido por la sesión), `DATA_DIR` (datos de juego), `WEB_DIST` (sirve el SPA si apunta a un dist existente; vacío en dev), `DATABASE_URL`, `PORT`, además de las de mail/captcha/signup (paridad con el `.env` del origen).

## Docker

### Opción A — docker compose (recomendado)
```
cp .env.example .env     # edita SECRET_KEY (>=32 chars) y lo que necesites
docker compose up -d
```
Abrir http://127.0.0.1:8000. Compose construye la imagen, aplica migraciones al arrancar, persiste la base SQLite en el volumen `kettlewright_db` e incluye healthcheck. Parar con `docker compose down` (los datos se conservan en el volumen).

### Opción B — docker build/run manual
```
docker build -t kettlewright .
docker run -d --name kettlewright \
  -e SECRET_KEY="<min 32 chars>" \
  -v kettlewright_db:/app/db \
  -p 8000:8000 kettlewright
```

La base SQLite persiste en el volumen `/app/db`.

{"detail":[{"type":"json_invalid","loc":["body",44],"msg":"JSON decode error","input":{},"ctx":{"error":"Extra data"}}]}root@homero:/var/www/vhosts/api-elsa.yuuu.es/ai# 


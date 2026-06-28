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

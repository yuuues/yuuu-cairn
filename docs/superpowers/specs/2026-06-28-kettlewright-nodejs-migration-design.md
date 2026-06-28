# Migración de Kettlewright a Node.js — Documento de diseño

**Fecha:** 2026-06-28
**Estado:** Aprobado (pendiente de revisión final del usuario)
**Objetivo:** Modernizar Kettlewright (gestor de personajes/partidas para el juego de rol Cairn) reescribiéndolo desde Flask/Python a Node.js con arquitectura hexagonal, frontend SPA y paridad funcional completa.

---

## 1. Contexto y objetivo

### 1.1 Qué es Kettlewright

Aplicación web para crear y gestionar personajes y partidas del juego de rol **Cairn**. Funcionalidad destacada:

- Creación de personaje multi-paso (trasfondos, tirada de atributos, vínculos, rasgos, retrato).
- Gestión de inventario con contenedores, slots, armadura, oro y transferencia de objetos.
- Partidas multijugador con código de unión, subdueños e inventario de grupo.
- Tiempo real: tiradas de dados compartidas en la sala de la partida y notificaciones de cambios.
- Generadores y herramientas (tablas aleatorias, generador de PNJ/personajes).
- Marketplace para comprar objetos.
- Import/export de personajes en JSON, impresión.
- Internacionalización: en, de, es, pl, pt_BR.

### 1.2 Aplicación de origen (Flask / Python)

| Capa | Tecnología actual |
|------|-------------------|
| Web framework | Flask 3 (app factory, 7 blueprints, ~2.700 líneas de rutas) |
| Auth/sesión | Flask-Login + Werkzeug (scrypt); tokens con `itsdangerous` |
| Email | Flask-Mail |
| ORM/DB | SQLAlchemy + Alembic, **SQLite** por defecto |
| Tiempo real | Flask-SocketIO (+ Redis opcional) |
| Frontend | Jinja2 + HTMX + JS vanilla (21 ficheros) |
| Estilos | SASS vía Flask-Assets/libsass (Bulma marcado obsoleto) |
| i18n | Flask-Babel (gettext .po/.mo) |
| Datos de juego | JSON (backgrounds, generators) consolidados al arrancar |
| Deploy | Docker + gunicorn/eventlet |

**Detalle del modelo de datos de origen:** campos complejos (`items`, `containers`, `members`, `events`...) se almacenan como **strings JSON dentro de columnas**, no como tablas relacionales. La lógica de negocio (cálculo de slots, armadura, HP, sobrecarga) vive en métodos del modelo `Character` y en `lib/char_utils.py` (402 líneas) e `lib/inventory.py` (553 líneas).

### 1.3 Decisiones tomadas en brainstorming

| Decisión | Elección |
|----------|----------|
| Tipo de migración | Modernizar a **SPA + API** |
| Arquitectura | **Hexagonal** (puertos y adaptadores) |
| Frontend | **React** + Vite + TypeScript |
| Backend | **Fastify** + TypeScript |
| DB / ORM | **SQLite + Prisma** |
| Forma de los datos | **JSON en columnas** (no normalizar), validado con Zod |
| Auth | **Cookie de sesión httpOnly** |
| Migración de datos | **No** — base de datos nueva, empezar de cero |
| Alcance | **Paridad funcional completa**, entregada en fases |
| i18n | **i18next**, convirtiendo los `.po` existentes a JSON |
| Estado servidor en front | **TanStack Query** |
| Inyección de dependencias | **Composition root manual** (sin contenedor DI) |
| Email | **Nodemailer** |

---

## 2. Arquitectura objetivo (hexagonal)

### 2.1 Principio

Arquitectura de **puertos y adaptadores**: el núcleo de negocio (dominio + casos de uso) no conoce frameworks ni infraestructura. Se comunica con el exterior a través de **puertos** (interfaces). Las implementaciones concretas (Prisma, Fastify, Socket.IO, Nodemailer) son **adaptadores** que dependen del núcleo, nunca al revés.

### 2.2 Reglas de dependencia

- `core` **no importa** Prisma, Fastify, Socket.IO ni APIs de Node. Solo TypeScript + Zod.
- Las dependencias apuntan **hacia dentro**: `web`/`server` → `core`. Nunca `core` → `server`.
- Los casos de uso reciben sus puertos **por constructor**. `server/main.ts` (composition root) instancia los adaptadores reales y los inyecta a mano.
- El dominio publica **eventos de dominio** a través del puerto `EventPublisher`; el adaptador Socket.IO los traduce a mensajes WebSocket. El dominio no sabe que existe el tiempo real.

### 2.3 Estructura de paquetes (monorepo)

```
yuuu-cairn/
├─ package.json                 # workspaces (pnpm)
├─ packages/
│  ├─ core/                     # EL HEXÁGONO — TS puro, cero deps de infra
│  │  ├─ domain/
│  │  │  ├─ character/          Character, Inventory, Container, Item
│  │  │  │                      reglas: slots, armadura, HP, sobrecarga
│  │  │  ├─ party/              Party, JoinCode, Membership
│  │  │  └─ user/               User, Password (value object)
│  │  ├─ application/           # casos de uso
│  │  │  ├─ character/          CreateCharacter, UpdateInventory, TransferItem, ...
│  │  │  ├─ party/              CreateParty, JoinParty, RollDice, ...
│  │  │  └─ auth/               Register, Login, ConfirmEmail, ResetPassword, ...
│  │  └─ ports/
│  │     └─ driven/             CharacterRepository, PartyRepository, UserRepository,
│  │                            Mailer, PasswordHasher, EventPublisher, Clock, IdGenerator
│  ├─ shared/                   # esquemas Zod + DTOs/tipos (los usan core y web)
│  ├─ server/                   # ADAPTADORES + composition root
│  │  ├─ infrastructure/
│  │  │  ├─ persistence/prisma/ PrismaCharacterRepository, PrismaPartyRepository, ...
│  │  │  ├─ mail/nodemailer/    NodemailerMailer
│  │  │  ├─ realtime/socketio/  SocketEventPublisher
│  │  │  ├─ auth/               ScryptHasher, SessionStore
│  │  │  └─ config/             carga de env
│  │  ├─ interfaces/            # adaptadores de ENTRADA
│  │  │  ├─ http/               rutas Fastify → invocan casos de uso
│  │  │  └─ socket/             handlers Socket.IO → invocan casos de uso
│  │  └─ main.ts                # composition root: cablea adaptadores + casos de uso
│  └─ web/                      # React SPA (Vite) — adaptador de entrada externo
└─ data/                        # JSON de juego (backgrounds, generators)
```

### 2.4 Beneficio

- Casos de uso testeables con repositorios en memoria (sin BD ni HTTP).
- Cambiar SQLite→Postgres o Socket.IO→otro transporte toca **solo un adaptador**.
- Frontera clara entre reglas de Cairn y detalles técnicos.

---

## 3. Modelo de dominio

### 3.1 Entidades

- **User**: id, email, username, passwordHash, confirmed, createdAt, lastLogin.
- **Character**: id, owner, nombre, trasfondo, atributos (str/dex/wil + max), hp/hp_max, deprived, panicked, oro, descripción, rasgos, notas, vínculos, cicatrices, presagios, retrato, armadura, party. Campos `items` y `containers` como colecciones tipadas.
- **Party**: id, owner, nombre, descripción, notas, members, subowners, joinCode, items, containers, events, version.

### 3.2 Reglas de negocio portadas a `core/domain`

Port directo de la lógica hoy dispersa en el modelo `Character` y en `lib/`:

- `occupiedMainSlots()` — slots ocupados en el contenedor principal (objetos *bulky* cuentan 2, *petty* no cuentan).
- `armorValue()` — suma de armadura por tags ("1/2/3 Armor"), tope 3.
- `overburdened()` — comparación de slots ocupados vs capacidad del contenedor.
- `hpValue()` — HP efectivo (0 si sobrecargado o en pánico).
- Lógica de inventario y contenedores (`lib/inventory.py`): añadir/mover/transferir objetos, capacidad de contenedores.
- Lógica de marketplace (`lib/market.py`): compra y coste.

Estas reglas son **funciones/métodos puros**, cubiertas por tests unitarios en `core`.

### 3.3 Persistencia de campos JSON

Los campos `items`, `containers`, `members`, `subowners`, `events` se guardan como columnas de texto JSON en SQLite. Al cruzar la frontera de persistencia:

- **Lectura:** el adaptador Prisma parsea el JSON y lo **valida con el esquema Zod** de `shared` antes de construir la entidad de dominio.
- **Escritura:** la entidad se serializa a JSON validado.

Esto preserva el modelo de datos original (decisión: no normalizar) manteniendo seguridad de tipos en el núcleo.

---

## 4. Puertos (interfaces del núcleo)

Puertos *driven* (el núcleo los necesita, los implementa la infraestructura):

| Puerto | Responsabilidad | Adaptador |
|--------|-----------------|-----------|
| `UserRepository` | persistir/buscar usuarios | Prisma |
| `CharacterRepository` | persistir/buscar personajes | Prisma |
| `PartyRepository` | persistir/buscar partidas | Prisma |
| `PasswordHasher` | hash/verify de contraseñas | scrypt (Node) |
| `Mailer` | enviar emails (confirmación, reset, cambio) | Nodemailer |
| `EventPublisher` | publicar eventos de dominio (dados, cambios) | Socket.IO |
| `Clock` | hora actual (testeable) | reloj del sistema |
| `IdGenerator` | generar ids/códigos de unión | crypto |

Puertos *driving* (entradas): los **casos de uso** son la API de entrada del núcleo; los invocan los adaptadores HTTP y Socket.IO.

---

## 5. Backend (server)

- **Framework:** Fastify + TypeScript.
- **Validación:** Zod en el borde HTTP, compartido con el front vía `shared`.
- **Rutas REST por dominio:** `/api/auth`, `/api/characters`, `/api/parties`, `/api/marketplace`, `/api/generators`, `/api/data`.
- **Auth:** `@fastify/cookie` + sesión en servidor (cookie httpOnly, SameSite). Hash con `scrypt` nativo de Node. Tokens de confirmación/reset firmados (equivalente a `itsdangerous`).
- **Email:** Nodemailer (confirmar cuenta, reset de contraseña, cambio de email).
- **Captcha:** reCAPTCHA opcional vía variables de entorno (paridad con el actual `USE_CAPTCHA`).
- **Config:** variables de entorno equivalentes a `.env.template` actual (BASE_URL, SECRET_KEY, mail, signup code, captcha).

---

## 6. Tiempo real (Socket.IO)

- Servidor Socket.IO montado sobre el servidor HTTP de Fastify.
- Autenticación con la **misma cookie de sesión** (handshake comparte la sesión).
- Salas `party_{id}`. Al conectar/registrarse, el usuario se une a las salas de sus partidas.
- Evento `roll_dice` → caso de uso `RollDice` valida pertenencia y publica `dice_rolled` a la sala vía `EventPublisher`.
- Notificaciones de cambios de partida/inventario en vivo siguiendo el mismo patrón.
- El cliente socket.io del frontend actual es reutilizable casi sin cambios (mismo protocolo).

---

## 7. Frontend (web)

- **React + Vite + TypeScript.**
- **Routing:** React Router.
- **Estado servidor:** TanStack Query (fetch, caché, invalidación, mutaciones).
- **Estado UI local:** Zustand o context para el editor de personaje/inventario.
- **i18n:** i18next + react-i18next. Conversión única de los `.po` (en/de/es/pl/pt_BR) a JSON. Selector de idioma con cookie `kw_lang`.
- **Estilos:** migrar el SASS propio del proyecto (descartando Bulma, ya obsoleto), conservando el look & feel actual.
- **Lógica de juego en vivo:** el front reutiliza las funciones puras de cálculo (slots, armadura) desde `core`/`shared` para previsualización inmediata sin ir al servidor.

### 7.1 Vistas (paridad)

Auth (login, signup con código opcional, confirmación, reset, cambio de email/contraseña, cuenta, borrado) · lista de personajes · **creación de personaje multi-paso** · vista de personaje · edición (stats, inventario, cicatrices, presagios, partida, retrato) · inventario + contenedores (transferencia de objetos) · marketplace · impresión · import/export JSON · lista/creación/edición/vista de partidas · unión por código · subdueños e inventario de grupo · herramientas y generadores (tablas, pcgen) · modal de dados.

---

## 8. Internacionalización

- Conversión de los catálogos gettext `.po` actuales a recursos JSON de i18next (en, de, es, pl, pt_BR).
- Cookie `kw_lang` para persistir el idioma, con fallback a `en`.
- Las cadenas del backend (emails) se traducen con i18next del lado servidor o plantillas por idioma.

---

## 9. Estrategia de testing

- **`core` (dominio + casos de uso):** Vitest unitario con repositorios y puertos **en memoria**. Cobertura prioritaria de la lógica de Cairn (slots, armadura, sobrecarga, HP, inventario, marketplace, unión a partidas).
- **`server` (adaptadores):** tests de integración con `fastify.inject()` y Prisma sobre SQLite en memoria/temporal. Verifican rutas, auth y serialización JSON↔Zod.
- **`web`:** Vitest + Testing Library en componentes clave (editor de inventario, creación de personaje). Playwright opcional para flujos e2e críticos.

---

## 10. Build, desarrollo y despliegue

- **Monorepo** con workspaces (pnpm).
- **Dev:** Vite dev server (web) + Fastify en watch (server); proxy de `/api` y WebSocket.
- **Build:** `core`/`shared` compilados a JS; `web` build estático servido por Fastify o CDN; `server` empaquetado.
- **Deploy:** imagen Docker única (paridad con el flujo actual), SQLite en volumen persistente.
- **Migraciones:** Prisma Migrate (sustituye a Alembic).

---

## 11. Secuencia de construcción (fases)

Paridad completa entregada de forma ordenada. Cada fase es funcional y testeada antes de pasar a la siguiente.

1. **Andamiaje:** monorepo, `core`/`shared`/`server`/`web` arrancando, Prisma + esquema BD, esqueleto hexagonal (puertos vacíos + composition root), CI de tests. Port de las **reglas de juego puras** a `core/domain` con tests.
2. **Auth completa:** registro (código de signup opcional), login/logout, sesión por cookie, confirmación de email, reset y cambio de contraseña/email, captcha opcional.
3. **Personajes:** CRUD + creación multi-paso + carga de datos de juego (backgrounds JSON).
4. **Inventario + marketplace:** contenedores, slots, armadura, transferencias, compra.
5. **Partidas:** CRUD, códigos de unión, subdueños, inventario de grupo.
6. **Tiempo real:** Socket.IO, salas de partida, tiradas de dados, notificaciones.
7. **Generadores y herramientas:** tablas aleatorias, pcgen, import/export JSON, impresión.
8. **i18n y pulido:** 5 idiomas, estilos finales, repaso de paridad.

---

## 12. Riesgos y notas

- **Creación de personaje multi-paso** es la pieza más compleja del front (estado de varios pasos, datos de trasfondos). Asignarle tiempo en la fase 3.
- **Lógica de inventario/contenedores** (553 líneas en origen) es densa; portarla con tests de caracterización para no perder comportamiento.
- **Autenticación de Socket.IO con cookie de sesión** requiere compartir el store de sesión entre Fastify y el handshake de Socket.IO; validar pronto (fase 6, o prueba temprana en fase 2).
- **Conversión de `.po` a JSON**: comprobar interpolaciones/plurales al convertir.
- No hay migración de datos: las contraseñas se rehacen con scrypt de Node (no hace falta replicar el formato de Werkzeug).

---

## 13. Decisiones explícitamente descartadas (YAGNI)

- Normalizar inventario/miembros a tablas relacionales (se mantiene JSON en columnas).
- Contenedor de inyección de dependencias (se usa composition root manual).
- Migración de Bulma (ya estaba obsoleto en origen).
- Migración de datos existentes / compatibilidad con hashes de Werkzeug.
- Redis para escalado de Socket.IO en la primera entrega (queda como mejora futura, ya contemplada en origen).

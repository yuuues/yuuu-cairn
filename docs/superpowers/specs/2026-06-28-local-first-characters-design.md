# Diseño: Modo local-first (solo personajes)

Fecha: 2026-06-28
Estado: aprobado (pendiente revisión de spec por el usuario)

## Objetivo

Convertir el cliente en una app **local-first** que cree, edite y juegue personajes de
Cairn **sin servidor**, almacenando todo en el dispositivo. Destino: web + app móvil
vía **Capacitor**. Las partidas en vivo y las cuentas quedan **aparcadas**.

## Alcance (v1)

Dentro:
- Crear / editar / listar / borrar / jugar personajes en local.
- Inventario (comprar de mercado, actualizar) en local.
- Generadores / NPCs y tablas aleatorias en local.
- Export / import de personajes: **archivo JSON** y **QR**.

Fuera (aparcado, no borrado):
- Partidas, "join party", roles de DM, realtime.
- Cuentas / login / email / captcha.
- Servidor (Fastify + Prisma + Socket.IO): se queda en el repo, fuera del bundle local.
- Almacenamiento online de personajes (ver "Extensibilidad futura").

## Requisito duro

Todo en la ruta del cliente corre en un **WebView** (Capacitor). Sin Node:
**sin Prisma, sin Fastify** en el cliente.

## Arquitectura

Se reaprovecha la arquitectura hexagonal existente. `@kw/core` (dominio + casos de uso +
puertos) **no cambia**. Cambian los adaptadores `driven` y la capa que el `web` usa para
invocar los casos de uso.

### Componentes

- **`@kw/core` (sin cambios).** Casos de uso reutilizados:
  - Personaje: CRUD, `RollCharacter`, `UpdateCharacter`.
  - Inventario: `BuyItems`, `UpdateInventory`.
  - Generadores: NPCs / tablas.
- **Adaptadores de navegador (nuevos), implementan puertos `driven`:**
  - `IndexedDbCharacterRepository` (vía `idb`). Honra la interfaz actual
    (`id: number` autoincremental, `ownerId` = `LOCAL_OWNER_ID` constante). El puerto
    `CharacterRepository` **no cambia**.
  - `BrowserDice` (`crypto.getRandomValues`), `BrowserClock` (`Date.now`),
    `BrowserIdGenerator` (`crypto.randomUUID` donde aplique).
  - `BundledGameDataRepository`, `BundledGeneratorRepository`, `BundledMarketRepository`:
    leen JSON de Cairn empaquetado en el bundle (las interfaces ya son lecturas síncronas
    en memoria).
- **Contenedor de composición** (`packages/web/src/local/`): construye los casos de uso
  con los adaptadores anteriores y los expone a React. **Sustituye a `web/src/api/*`
  (HTTP) en el build local.**

### Regla de aislamiento (clave para futuro online)

La UI invoca **casos de uso a través del contenedor**, nunca IndexedDB directo. El
contenedor decide qué adaptador de repositorio inyecta. Añadir online en el futuro =
nuevo adaptador remoto detrás del **mismo** puerto `CharacterRepository` + capa de sync
opcional, **sin reescribir UI**. No se añade código de sync especulativo ahora (YAGNI).

## Persistencia (IndexedDB)

- Una BD IndexedDB con un store `characters`, clave numérica autoincremental.
- El repo guarda el objeto `Character` (validado por Zod) tal cual. Sin SQL, sin
  migraciones de tablas. Versionado a nivel de documento (ver serialización).
- `ownerId` fijado a `LOCAL_OWNER_ID` para satisfacer el puerto sin concepto de usuario.

## Serialización: export / import / QR (un solo formato)

- **Sobre canónico versionado** en `@kw/shared`, validado por Zod:
  ```
  { kind: "cairn-character", schemaVersion: number, exportedAt: string, payload: Character }
  ```
- Tres transportes sobre el mismo sobre:
  - **Archivo `.json`**: descarga en web / `@capacitor/filesystem` + share en móvil.
    Plan B siempre fiable.
  - **QR**: sobre → comprimir (deflate) → base64 → QR (`qrcode`). Si excede capacidad del
    QR, aviso y caída a export por archivo.
  - **Import**: archivo o escaneo QR → validar Zod + `schemaVersion` → guardar con id
    local nuevo.
- Este sobre es además el **formato de wire** reutilizable para la sync online futura.

## Build y Capacitor

- **Un solo cliente** React+Vite sirve web y Capacitor.
- **Modo local** oculta rutas online (auth, parties, realtime) vía flag de build/entry. El
  código online permanece en el repo pero fuera del bundle local.
- Capacitor: `@capacitor/core` + config; `@capacitor/filesystem` / share para export;
  plugin de escaneo QR compatible con WebView (elección concreta en el plan); `qrcode`
  para generar.

## Errores

- Import malformado / `schemaVersion` incompatible → rechazo con mensaje (Zod).
- QR demasiado grande → aviso y fallback a export por archivo.
- IndexedDB no disponible (modo privado) → mensaje claro al usuario.

## Testing

- Tests de `@kw/core` existentes siguen valiendo.
- `IndexedDbCharacterRepository` con `fake-indexeddb` en vitest.
- Round-trip export → import idéntico al original.
- `BrowserDice` con semilla inyectable para determinismo en tests.

## Extensibilidad futura (no implementar ahora)

- **Almacenamiento online de personajes**: nuevo adaptador remoto del puerto
  `CharacterRepository` + capa de sync; reusa el sobre de serialización como wire format.
- **Partidas en vivo**: reactivar el servidor existente como opción auto-hospedada; el QR
  recupera su rol de puente jugador→DM.

## Decisiones tomadas

- Contenedor como **carpeta** (`web/src/local/`), no package nuevo todavía.
- **`idb`** en vez de Dexie (wrapper más fino).
- QR con `qrcode` + escáner Capacitor (plugin concreto a decidir en el plan).

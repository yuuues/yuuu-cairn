# Fase 6 — Tiempo real (Socket.IO sobre Fastify) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir tiempo real con Socket.IO montado sobre el servidor HTTP de Fastify, autenticado con la **misma cookie de sesión** de Fase 2. Salas `party_{id}`: al conectar o emitir `register`, el usuario se une a las salas de las partidas donde es owner o subowner. El evento `roll_dice` invoca el caso de uso `RollDice` (TS puro en `core`, valida pertenencia) que publica el evento de dominio `dice_rolled` a través del puerto `EventPublisher`; el adaptador `SocketEventPublisher` (`server/infrastructure/realtime/socketio`) traduce el evento a una emisión WebSocket a la sala. El cliente React se conecta, registra y muestra notificaciones de tiradas en vivo.

**Architecture:** Hexagonal, sobre lo ya construido en Fases 1–5. La lógica de negocio (`RollDice`) vive en `packages/core` (TS puro, sin Socket.IO/Fastify/Prisma), recibe sus puertos (`CharacterRepository`, `PartyRepository`, `EventPublisher`) por constructor. El puerto `EventPublisher` ya existe (Fase 1). El adaptador driven `SocketEventPublisher` y el adaptador driving `buildSocketGateway` (handlers Socket.IO) viven en `packages/server`; el cableado se hace a mano en `packages/server/src/main.ts`. La validación del payload `roll_dice` usa Zod en `packages/shared`. La web (`packages/web`) reutiliza el mismo protocolo del origen Flask con un cliente `socket.io-client`.

**Tech Stack:** Node 22, pnpm 11 (Windows), TypeScript, Zod, Vitest, Fastify 4, `fastify-socket.io` + `socket.io` (servidor), `socket.io-client` (web), `@fastify/cookie` + `@fastify/session` (sesión compartida), React + Vite, TanStack Query.

> **Nota de paridad (origen Flask `app/socket_events.py`):**
> - `connect` y `register` → ambos llaman a `join_user_parties()`: unen al socket a `party_{id}` de **toda** partida donde el usuario es owner (`Party.owner == user.id`) **o** subowner (`Party.subowners.contains(str(user.id))`). En nuestro modelo eso es `PartyRepository.findByMember(userId)` (owner o `subowners.includes(userId)`), idéntico.
> - `roll_dice` payload: `{ character_id, roll, party_id }`. Validaciones, en orden: (1) todos presentes; (2) el personaje existe; (3) `character.owner === user.id`; (4) la partida existe; (5) `int(character_id)` está en `party.members`. Si todo pasa, emite `dice_rolled` con el **string** `"{character.name} rolled a {roll}"` a la sala `party_{party_id}`. Cualquier fallo → no emite (silencioso). Replicamos exactamente: `RollDice` lanza error en cada fallo y el gateway lo traga sin emitir.
> - El cliente (`socket_notifications.js`) usa `transports: ["websocket"]`, emite `register` al conectar, y al recibir `dice_rolled` muestra una notificación con el string recibido.

---

## Estructura de ficheros (Fase 6)

```
yuuu-cairn/
├─ packages/
│  ├─ shared/
│  │  └─ src/
│  │     ├─ schemas/
│  │     │  └─ realtimeIo.ts            # RollDiceInputSchema, RollDiceInput, DiceRolledMessage
│  │     └─ index.ts                    # (modificar) export de realtimeIo
│  ├─ core/
│  │  └─ src/
│  │     ├─ application/
│  │     │  └─ party/
│  │     │     ├─ RollDice.ts           # caso de uso RollDice (TDD)
│  │     │     ├─ RollDice.test.ts
│  │     │     ├─ errors.ts             # (modificar) añadir code "invalid_input" ya existe; reutilizado
│  │     │     └─ index.ts              # (modificar) export RollDice
│  │     └─ index.ts                    # (vía party/index.js ya reexportado)
│  ├─ server/
│  │  ├─ package.json                   # (modificar) deps fastify-socket.io, socket.io
│  │  └─ src/
│  │     ├─ infrastructure/
│  │     │  └─ realtime/
│  │     │     └─ socketio/
│  │     │        ├─ SocketEventPublisher.ts        # adaptador EventPublisher → io.to(room).emit
│  │     │        └─ SocketEventPublisher.test.ts
│  │     ├─ interfaces/
│  │     │  └─ socket/
│  │     │     ├─ sessionFromHandshake.ts           # extrae SessionUser de la cookie del handshake
│  │     │     ├─ sessionFromHandshake.test.ts
│  │     │     ├─ socketGateway.ts                  # registra connect/register/roll_dice
│  │     │     └─ socketGateway.test.ts
│  │     └─ main.ts                                  # (modificar) cablear Socket.IO + RollDice
│  └─ web/
│     ├─ package.json                   # (modificar) dep socket.io-client
│     └─ src/
│        ├─ realtime/
│        │  ├─ socketClient.ts          # singleton io() + register + dice_rolled
│        │  ├─ useDiceRoller.ts         # hook: conectar, escuchar, rollDice()
│        │  └─ DiceModal.tsx            # modal de dados (paridad dice_modal.js)
│        └─ parties/
│           └─ PartyViewPage.tsx        # (modificar) botón de dados + notificaciones en vivo
```

---

## Task 1: `shared` — esquemas Zod del protocolo de tiempo real (TDD)

**Files:**
- Create: `packages/shared/src/schemas/realtimeIo.ts`
- Modify: `packages/shared/src/index.ts`
- Create: `packages/shared/src/schemas/realtimeIo.test.ts`

- [ ] **Step 1: Escribir el test que falla `packages/shared/src/schemas/realtimeIo.test.ts`**

El payload del origen (`socket_notifications.js` → `roll_dice`) es `{ roll, party_id, character_id }`. Normalizamos a camelCase en el borde (Zod), aceptando los nombres snake_case del cliente legacy vía `z.coerce`/alias no es necesario porque nuestro cliente nuevo enviará camelCase; documentamos el contrato camelCase. `roll` es el string formateado (p.ej. `"7 (d8)"`).

```ts
import { describe, it, expect } from "vitest";
import { RollDiceInputSchema } from "./realtimeIo.js";

describe("RollDiceInputSchema", () => {
  it("acepta un payload válido", () => {
    const parsed = RollDiceInputSchema.parse({
      characterId: 3,
      partyId: 7,
      roll: "7 (d8)",
    });
    expect(parsed).toEqual({ characterId: 3, partyId: 7, roll: "7 (d8)" });
  });

  it("coacciona ids numéricos en string", () => {
    const parsed = RollDiceInputSchema.parse({
      characterId: "3",
      partyId: "7",
      roll: "20",
    });
    expect(parsed.characterId).toBe(3);
    expect(parsed.partyId).toBe(7);
  });

  it("rechaza roll vacío", () => {
    expect(() => RollDiceInputSchema.parse({ characterId: 1, partyId: 1, roll: "" })).toThrow();
  });

  it("rechaza falta de campos", () => {
    expect(() => RollDiceInputSchema.parse({ characterId: 1 })).toThrow();
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/shared test`
Expected: FAIL — "Cannot find module './realtimeIo.js'".

- [ ] **Step 3: Crear `packages/shared/src/schemas/realtimeIo.ts`**

```ts
import { z } from "zod";

/** Payload del evento WS `roll_dice` (paridad: { character_id, party_id, roll }). */
export const RollDiceInputSchema = z.object({
  characterId: z.coerce.number().int(),
  partyId: z.coerce.number().int(),
  roll: z.string().min(1),
});

export type RollDiceInput = z.infer<typeof RollDiceInputSchema>;

/** Mensaje emitido en el evento WS `dice_rolled` (string, paridad con el origen). */
export type DiceRolledMessage = string;

/** Nombres de eventos del canal de tiempo real (contrato cliente↔servidor). */
export const RealtimeEvents = {
  register: "register",
  rollDice: "roll_dice",
  diceRolled: "dice_rolled",
} as const;
```

- [ ] **Step 4: Modificar `packages/shared/src/index.ts` para exportar el nuevo esquema**

Añadir la línea junto al resto de exports de schemas:

```ts
export * from "./schemas/realtimeIo.js";
```

- [ ] **Step 5: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/shared test`
Expected: PASS (4 tests verdes).

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter @kw/shared typecheck`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/schemas/realtimeIo.ts packages/shared/src/schemas/realtimeIo.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): esquema Zod del protocolo de tiempo real (roll_dice/dice_rolled)"
```

---

## Task 2: `core` — caso de uso `RollDice` (TDD)

**Files:**
- Create: `packages/core/src/application/party/RollDice.ts`
- Create: `packages/core/src/application/party/RollDice.test.ts`
- Modify: `packages/core/src/application/party/index.ts`

> Reutiliza el puerto `EventPublisher` (Fase 1: `publishToParty(partyId, { type, payload })`), `CharacterRepository` y `PartyRepository` ya existentes, y la clase `PartyError` ya definida en `party/errors.ts` (códigos `not_found` | `forbidden` | `invalid_code` | `already_member` | `invalid_input`). Paridad exacta con `handle_roll_dice` del origen.

- [ ] **Step 1: Escribir el test que falla `packages/core/src/application/party/RollDice.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import type { Character, Party } from "@kw/shared";
import { InMemoryCharacterRepository } from "../../testing/InMemoryCharacterRepository.js";
import { InMemoryPartyRepository } from "../../testing/InMemoryPartyRepository.js";
import type { DomainEvent } from "../../ports/driven/EventPublisher.js";
import { RollDice } from "./RollDice.js";
import { PartyError } from "./errors.js";

class RecordingPublisher {
  public calls: Array<{ partyId: number; event: DomainEvent }> = [];
  async publishToParty(partyId: number, event: DomainEvent): Promise<void> {
    this.calls.push({ partyId, event });
  }
}

const baseChar = (over: Partial<Character>): Character => ({
  id: 1, ownerId: 1, name: "Hero", background: "A",
  strength: 10, strengthMax: 10, dexterity: 10, dexterityMax: 10, willpower: 10, willpowerMax: 10,
  hp: 5, hpMax: 5, deprived: false, panicked: false, gold: 0, items: [], containers: [],
  description: null, traits: null, notes: null, bonds: null, scars: null, omens: null, armor: null,
  imageUrl: null, partyId: null, ...over,
});

const baseParty = (over: Partial<Party>): Party => ({
  id: 1, ownerId: 1, name: "P", description: null, notes: null,
  members: [], subowners: [], joinCode: "CODE", items: [], containers: [], events: [], version: 0,
  ...over,
});

describe("RollDice", () => {
  let characters: InMemoryCharacterRepository;
  let parties: InMemoryPartyRepository;
  let publisher: RecordingPublisher;
  let rollDice: RollDice;

  beforeEach(() => {
    characters = new InMemoryCharacterRepository();
    parties = new InMemoryPartyRepository();
    publisher = new RecordingPublisher();
    rollDice = new RollDice(characters, parties, publisher);
  });

  it("publica dice_rolled a la sala con el mensaje formateado", async () => {
    const char = await characters.save(baseChar({ id: 0, ownerId: 1, name: "Aldric" }));
    const party = await parties.save(baseParty({ id: 0, ownerId: 1, members: [char.id] }));

    await rollDice.execute({ userId: 1, characterId: char.id, partyId: party.id, roll: "7 (d8)" });

    expect(publisher.calls).toHaveLength(1);
    expect(publisher.calls[0]!.partyId).toBe(party.id);
    expect(publisher.calls[0]!.event).toEqual({
      type: "dice_rolled",
      payload: "Aldric rolled a 7 (d8)",
    });
  });

  it("falla si el personaje no existe", async () => {
    const party = await parties.save(baseParty({ id: 0, members: [99] }));
    await expect(
      rollDice.execute({ userId: 1, characterId: 99, partyId: party.id, roll: "3" })
    ).rejects.toBeInstanceOf(PartyError);
    expect(publisher.calls).toHaveLength(0);
  });

  it("falla si el usuario no es dueño del personaje", async () => {
    const char = await characters.save(baseChar({ id: 0, ownerId: 2, name: "X" }));
    const party = await parties.save(baseParty({ id: 0, members: [char.id] }));
    await expect(
      rollDice.execute({ userId: 1, characterId: char.id, partyId: party.id, roll: "3" })
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(publisher.calls).toHaveLength(0);
  });

  it("falla si la partida no existe", async () => {
    const char = await characters.save(baseChar({ id: 0, ownerId: 1 }));
    await expect(
      rollDice.execute({ userId: 1, characterId: char.id, partyId: 999, roll: "3" })
    ).rejects.toMatchObject({ code: "not_found" });
    expect(publisher.calls).toHaveLength(0);
  });

  it("falla si el personaje no es miembro de la partida", async () => {
    const char = await characters.save(baseChar({ id: 0, ownerId: 1 }));
    const party = await parties.save(baseParty({ id: 0, ownerId: 1, members: [] }));
    await expect(
      rollDice.execute({ userId: 1, characterId: char.id, partyId: party.id, roll: "3" })
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(publisher.calls).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/core test RollDice`
Expected: FAIL — "Cannot find module './RollDice.js'".

- [ ] **Step 3: Implementar `packages/core/src/application/party/RollDice.ts`**

```ts
import type { CharacterRepository } from "../../ports/driven/CharacterRepository.js";
import type { PartyRepository } from "../../ports/driven/PartyRepository.js";
import type { EventPublisher } from "../../ports/driven/EventPublisher.js";
import { PartyError } from "./errors.js";

export interface RollDiceCommand {
  userId: number;
  characterId: number;
  partyId: number;
  /** Texto del resultado ya formateado por el cliente (p.ej. "7 (d8)"). */
  roll: string;
}

/**
 * Tirada de dados compartida en la sala de la partida.
 * Paridad con `handle_roll_dice` (app/socket_events.py): valida pertenencia y
 * publica el evento de dominio `dice_rolled` con el mensaje
 * "{character.name} rolled a {roll}".
 */
export class RollDice {
  constructor(
    private readonly characters: CharacterRepository,
    private readonly parties: PartyRepository,
    private readonly publisher: EventPublisher
  ) {}

  async execute(cmd: RollDiceCommand): Promise<void> {
    const character = await this.characters.findById(cmd.characterId);
    if (!character) {
      throw new PartyError("not_found", "Character not found");
    }
    if (character.ownerId !== cmd.userId) {
      throw new PartyError("forbidden", "User is not the owner of the character");
    }

    const party = await this.parties.findById(cmd.partyId);
    if (!party) {
      throw new PartyError("not_found", "Party not found");
    }
    if (!party.members.includes(cmd.characterId)) {
      throw new PartyError("forbidden", "Character is not a member of the party");
    }

    const message = `${character.name} rolled a ${cmd.roll}`;
    await this.publisher.publishToParty(party.id, {
      type: "dice_rolled",
      payload: message,
    });
  }
}
```

- [ ] **Step 4: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/core test RollDice`
Expected: PASS (5 tests verdes).

- [ ] **Step 5: Exportar `RollDice` desde `packages/core/src/application/party/index.ts`**

Añadir al barrel de party (junto a los demás `export * from`/`export`):

```ts
export * from "./RollDice.js";
```

- [ ] **Step 6: Typecheck del core**

Run: `pnpm --filter @kw/core typecheck`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/application/party/RollDice.ts packages/core/src/application/party/RollDice.test.ts packages/core/src/application/party/index.ts
git commit -m "feat(core): caso de uso RollDice con TDD (paridad handle_roll_dice)"
```

---

## Task 3: `server` — dependencias de Socket.IO

**Files:**
- Modify: `packages/server/package.json`

- [ ] **Step 1: Añadir dependencias a `packages/server/package.json`**

En el bloque `"dependencies"`, añadir (manteniendo orden alfabético junto a las existentes `@fastify/*`/`fastify`):

```json
    "fastify-socket.io": "^5.1.0",
    "socket.io": "^4.7.5",
```

Resultado del bloque `dependencies` (referencia completa, conservando el resto):

```json
  "dependencies": {
    "@fastify/cookie": "^9.4.0",
    "@fastify/session": "^10.9.0",
    "@kw/core": "workspace:*",
    "@kw/shared": "workspace:*",
    "@prisma/client": "^5.18.0",
    "fastify": "^4.28.1",
    "fastify-socket.io": "^5.1.0",
    "socket.io": "^4.7.5",
    "zod": "^3.23.8"
  },
```

> Nota: el bloque exacto puede variar según las deps ya presentes; **solo** añade las dos líneas `fastify-socket.io` y `socket.io`, sin borrar nada.

- [ ] **Step 2: Instalar**

Run: `pnpm install`
Expected: instala `fastify-socket.io` y `socket.io`, actualiza `pnpm-lock.yaml`.

- [ ] **Step 3: Verificar que resuelven**

Run: `pnpm --filter @kw/server exec node -e "import('socket.io').then(()=>import('fastify-socket.io')).then(()=>console.log('ok'))"`
Expected: imprime `ok`.

- [ ] **Step 4: Commit**

```bash
git add packages/server/package.json pnpm-lock.yaml
git commit -m "chore(server): añadir socket.io y fastify-socket.io"
```

---

## Task 4: `server` — adaptador `SocketEventPublisher` (TDD)

**Files:**
- Create: `packages/server/src/infrastructure/realtime/socketio/SocketEventPublisher.ts`
- Create: `packages/server/src/infrastructure/realtime/socketio/SocketEventPublisher.test.ts`

> Adaptador driven que implementa el puerto `EventPublisher`. Traduce un `DomainEvent` a una emisión Socket.IO `io.to("party_{id}").emit(event.type, event.payload)`. Es agnóstico de la lógica; solo enruta.

- [ ] **Step 1: Escribir el test que falla `SocketEventPublisher.test.ts`**

Usamos un doble mínimo del `Server` de Socket.IO (solo necesitamos `.to(room).emit(name, payload)`).

```ts
import { describe, it, expect } from "vitest";
import type { EventPublisher } from "@kw/core";
import { SocketEventPublisher } from "./SocketEventPublisher.js";

function fakeIo() {
  const emitted: Array<{ room: string; event: string; payload: unknown }> = [];
  const io = {
    to(room: string) {
      return {
        emit(event: string, payload: unknown) {
          emitted.push({ room, event, payload });
        },
      };
    },
  };
  return { io, emitted };
}

describe("SocketEventPublisher", () => {
  it("emite el evento a la sala party_{id}", async () => {
    const { io, emitted } = fakeIo();
    const publisher: EventPublisher = new SocketEventPublisher(io as never);

    await publisher.publishToParty(42, { type: "dice_rolled", payload: "Aldric rolled a 7" });

    expect(emitted).toEqual([
      { room: "party_42", event: "dice_rolled", payload: "Aldric rolled a 7" },
    ]);
  });

  it("usa el type del evento como nombre del evento WS", async () => {
    const { io, emitted } = fakeIo();
    const publisher = new SocketEventPublisher(io as never);

    await publisher.publishToParty(1, { type: "party_updated", payload: { id: 1 } });

    expect(emitted[0]!.event).toBe("party_updated");
    expect(emitted[0]!.room).toBe("party_1");
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/server test SocketEventPublisher`
Expected: FAIL — "Cannot find module './SocketEventPublisher.js'".

- [ ] **Step 3: Implementar `SocketEventPublisher.ts`**

```ts
import type { Server } from "socket.io";
import type { DomainEvent, EventPublisher } from "@kw/core";

/** Nombre de la sala de una partida (paridad: f"party_{id}"). */
export function partyRoom(partyId: number): string {
  return `party_${partyId}`;
}

/**
 * Adaptador driven del puerto EventPublisher: traduce eventos de dominio a
 * emisiones Socket.IO a la sala de la partida.
 */
export class SocketEventPublisher implements EventPublisher {
  constructor(private readonly io: Server) {}

  async publishToParty(partyId: number, event: DomainEvent): Promise<void> {
    this.io.to(partyRoom(partyId)).emit(event.type, event.payload);
  }
}
```

- [ ] **Step 4: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/server test SocketEventPublisher`
Expected: PASS (2 tests verdes).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/infrastructure/realtime/socketio/SocketEventPublisher.ts packages/server/src/infrastructure/realtime/socketio/SocketEventPublisher.test.ts
git commit -m "feat(server): SocketEventPublisher (adaptador EventPublisher → Socket.IO)"
```

---

## Task 5: `server` — extraer la sesión de la cookie del handshake (TDD)

**Files:**
- Create: `packages/server/src/interfaces/socket/sessionFromHandshake.ts`
- Create: `packages/server/src/interfaces/socket/sessionFromHandshake.test.ts`

> El handshake de Socket.IO trae las cookies del navegador en `socket.handshake.headers.cookie`. La sesión de Fastify (`@fastify/session`) guarda en la cookie `kw_session` un **session id firmado** (la sesión real vive en el store en memoria). Para autenticar el socket con la **misma cookie de sesión** necesitamos: (1) parsear la cookie, (2) desfirmar el valor con el `SECRET_KEY` (`@fastify/cookie` `unsign`), (3) decodificar el session id, (4) pedir la sesión al `store`. Encapsulamos ese flujo en una función testeable que recibe un `SessionStore` (interfaz mínima) y devuelve el `SessionUser` o `null`.

- [ ] **Step 1: Escribir el test que falla `sessionFromHandshake.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { unsign } from "@fastify/cookie";
import type { SessionUser } from "@kw/shared";
import {
  resolveSessionUser,
  type SessionLookupStore,
} from "./sessionFromHandshake.js";

const SECRET = "test-secret-test-secret-test-secret";

/** Construye una cookie kw_session firmada con un sessionId conocido. */
function signedCookie(sessionId: string): string {
  // @fastify/session almacena el sessionId firmado en la cookie.
  const signed = (require("@fastify/cookie").sign as (v: string, s: string) => string)(
    sessionId,
    SECRET
  );
  return `kw_session=${encodeURIComponent(signed)}`;
}

const user: SessionUser = { id: 7, username: "u", email: "u@e.com" };

function makeStore(map: Record<string, { user?: SessionUser }>): SessionLookupStore {
  return {
    get(sid, cb) {
      cb(null, map[sid] ?? null);
    },
  };
}

describe("resolveSessionUser", () => {
  it("devuelve el SessionUser cuando la cookie es válida y la sesión existe", async () => {
    const sid = "session-abc";
    const cookieHeader = signedCookie(sid);
    const store = makeStore({ [sid]: { user } });

    const result = await resolveSessionUser(cookieHeader, SECRET, "kw_session", store);
    expect(result).toEqual(user);
  });

  it("devuelve null si no hay cookie", async () => {
    const store = makeStore({});
    expect(await resolveSessionUser(undefined, SECRET, "kw_session", store)).toBeNull();
  });

  it("devuelve null si la firma es inválida", async () => {
    const store = makeStore({ "session-abc": { user } });
    const tampered = "kw_session=nope.invalidsig";
    expect(await resolveSessionUser(tampered, SECRET, "kw_session", store)).toBeNull();
  });

  it("devuelve null si la sesión no tiene user", async () => {
    const sid = "session-xyz";
    const store = makeStore({ [sid]: {} });
    const cookieHeader = signedCookie(sid);
    expect(await resolveSessionUser(cookieHeader, SECRET, "kw_session", store)).toBeNull();
  });

  it("verifica que unsign de @fastify/cookie reconoce la firma usada", () => {
    const sid = "s1";
    const signed = (require("@fastify/cookie").sign as (v: string, s: string) => string)(sid, SECRET);
    expect(unsign(signed, SECRET).value).toBe(sid);
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/server test sessionFromHandshake`
Expected: FAIL — "Cannot find module './sessionFromHandshake.js'".

- [ ] **Step 3: Implementar `sessionFromHandshake.ts`**

```ts
import { parse as parseCookie } from "@fastify/cookie";
import { unsign } from "@fastify/cookie";
import type { SessionUser } from "@kw/shared";

/** Interfaz mínima del store de sesión de @fastify/session que necesitamos. */
export interface SessionLookupStore {
  get(
    sessionId: string,
    callback: (err: unknown, session?: { user?: SessionUser } | null) => void
  ): void;
}

/**
 * Resuelve el SessionUser asociado a la cookie de sesión del handshake.
 * Devuelve null si falta la cookie, la firma es inválida o no hay sesión/usuario.
 * Replica el flujo de @fastify/session: cookie → unsign → sessionId → store.get.
 */
export async function resolveSessionUser(
  cookieHeader: string | undefined,
  secret: string,
  cookieName: string,
  store: SessionLookupStore
): Promise<SessionUser | null> {
  if (!cookieHeader) return null;

  const parsed = parseCookie(cookieHeader);
  const raw = parsed[cookieName];
  if (!raw) return null;

  const unsigned = unsign(raw, secret);
  if (!unsigned.valid || unsigned.value === null) return null;

  const sessionId = unsigned.value;

  return new Promise<SessionUser | null>((resolve) => {
    store.get(sessionId, (err, session) => {
      if (err || !session || !session.user) {
        resolve(null);
        return;
      }
      resolve(session.user);
    });
  });
}
```

> Nota: `@fastify/session` por defecto usa un `MemoryStore` cuya forma de `get(sid, cb)` coincide con `SessionLookupStore`. El `sessionId` firmado en la cookie es exactamente lo que `store.get` espera.

- [ ] **Step 4: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/server test sessionFromHandshake`
Expected: PASS (5 tests verdes).

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @kw/server typecheck`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/interfaces/socket/sessionFromHandshake.ts packages/server/src/interfaces/socket/sessionFromHandshake.test.ts
git commit -m "feat(server): resolver SessionUser desde la cookie del handshake de Socket.IO"
```

---

## Task 6: `server` — gateway Socket.IO: connect/register/roll_dice (TDD)

**Files:**
- Create: `packages/server/src/interfaces/socket/socketGateway.ts`
- Create: `packages/server/src/interfaces/socket/socketGateway.test.ts`

> Adaptador driving que registra los handlers en el `Server` de Socket.IO. Recibe el caso de uso `RollDice`, el `PartyRepository` (para `join_user_parties`) y un resolutor de sesión por socket. Estructura para ser testeable sin un servidor HTTP real: la función `registerSocketHandlers(io, deps)` instala el middleware de auth y el handler de `connection`; los handlers consultan `socket.data.user` (lo pone el middleware). Probamos con dobles de `io`/`socket` que capturan callbacks.

- [ ] **Step 1: Escribir el test que falla `socketGateway.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Party, SessionUser } from "@kw/shared";
import { InMemoryCharacterRepository } from "@kw/core/testing/InMemoryCharacterRepository.js";
import { InMemoryPartyRepository } from "@kw/core/testing/InMemoryPartyRepository.js";
import { RollDice } from "@kw/core";
import type { EventPublisher } from "@kw/core";
import { registerSocketHandlers, type SocketGatewayDeps } from "./socketGateway.js";

// ---- dobles mínimos de Socket.IO ----
type Handler = (...args: unknown[]) => unknown;

class FakeSocket {
  public data: { user?: SessionUser } = {};
  public handshake = { headers: { cookie: "" } };
  public rooms = new Set<string>();
  private handlers = new Map<string, Handler>();
  on(event: string, h: Handler) { this.handlers.set(event, h); }
  join(room: string) { this.rooms.add(room); }
  async emit(event: string, ...args: unknown[]) {
    const h = this.handlers.get(event);
    if (h) await h(...args);
  }
}

class FakeIo {
  public connectionHandler?: (s: FakeSocket) => void;
  private mw?: (s: FakeSocket, next: (err?: Error) => void) => void;
  use(fn: (s: FakeSocket, next: (err?: Error) => void) => void) { this.mw = fn; }
  on(event: string, h: (s: FakeSocket) => void) {
    if (event === "connection") this.connectionHandler = h;
  }
  /** Simula una conexión: corre middleware y luego el handler de connection. */
  async connect(socket: FakeSocket): Promise<Error | undefined> {
    return new Promise((resolve) => {
      const proceed = (err?: Error) => {
        if (err) return resolve(err);
        this.connectionHandler?.(socket);
        resolve(undefined);
      };
      if (this.mw) this.mw(socket, proceed);
      else proceed();
    });
  }
}

const party = (over: Partial<Party>): Party => ({
  id: 1, ownerId: 1, name: "P", description: null, notes: null,
  members: [], subowners: [], joinCode: "C", items: [], containers: [], events: [], version: 0,
  ...over,
});

const user: SessionUser = { id: 1, username: "u", email: "u@e.com" };

describe("socketGateway", () => {
  let characters: InMemoryCharacterRepository;
  let parties: InMemoryPartyRepository;
  let publisher: { calls: unknown[] } & EventPublisher;
  let deps: SocketGatewayDeps;
  let io: FakeIo;

  beforeEach(() => {
    characters = new InMemoryCharacterRepository();
    parties = new InMemoryPartyRepository();
    const calls: unknown[] = [];
    publisher = {
      calls,
      async publishToParty(partyId, event) { calls.push({ partyId, event }); },
    };
    deps = {
      rollDice: new RollDice(characters, parties, publisher),
      parties,
      resolveUser: async () => user,
    };
    io = new FakeIo();
    registerSocketHandlers(io as never, deps);
  });

  it("rechaza la conexión si no hay usuario en sesión", async () => {
    deps.resolveUser = async () => null;
    io = new FakeIo();
    registerSocketHandlers(io as never, deps);
    const socket = new FakeSocket();
    const err = await io.connect(socket);
    expect(err).toBeInstanceOf(Error);
  });

  it("al conectar une al socket a las salas de sus partidas (owner/subowner)", async () => {
    await parties.save(party({ id: 0, ownerId: 1 }));
    await parties.save(party({ id: 0, ownerId: 9, subowners: [1] }));
    await parties.save(party({ id: 0, ownerId: 9, subowners: [] })); // ajena

    const socket = new FakeSocket();
    await io.connect(socket);

    expect(socket.rooms.has("party_1")).toBe(true);
    expect(socket.rooms.has("party_2")).toBe(true);
    expect(socket.rooms.has("party_3")).toBe(false);
  });

  it("'register' vuelve a unir a las salas de las partidas", async () => {
    const socket = new FakeSocket();
    await io.connect(socket);
    await parties.save(party({ id: 0, ownerId: 1 })); // creada tras conectar
    await socket.emit("register");
    expect(socket.rooms.has("party_1")).toBe(true);
  });

  it("'roll_dice' válido publica dice_rolled vía RollDice", async () => {
    const char = await characters.save({
      id: 0, ownerId: 1, name: "Aldric", background: "A",
      strength: 10, strengthMax: 10, dexterity: 10, dexterityMax: 10, willpower: 10, willpowerMax: 10,
      hp: 5, hpMax: 5, deprived: false, panicked: false, gold: 0, items: [], containers: [],
      description: null, traits: null, notes: null, bonds: null, scars: null, omens: null, armor: null,
      imageUrl: null, partyId: null,
    });
    const p = await parties.save(party({ id: 0, ownerId: 1, members: [char.id] }));
    const socket = new FakeSocket();
    await io.connect(socket);

    await socket.emit("roll_dice", { characterId: char.id, partyId: p.id, roll: "7 (d8)" });

    expect(publisher.calls).toEqual([
      { partyId: p.id, event: { type: "dice_rolled", payload: "Aldric rolled a 7 (d8)" } },
    ]);
  });

  it("'roll_dice' inválido (payload mal formado) no lanza ni publica", async () => {
    const socket = new FakeSocket();
    await io.connect(socket);
    await socket.emit("roll_dice", { characterId: 1 }); // falta partyId/roll
    expect(publisher.calls).toHaveLength(0);
  });

  it("'roll_dice' de personaje ajeno no publica (error tragado)", async () => {
    const char = await characters.save({
      id: 0, ownerId: 2, name: "X", background: "A",
      strength: 10, strengthMax: 10, dexterity: 10, dexterityMax: 10, willpower: 10, willpowerMax: 10,
      hp: 5, hpMax: 5, deprived: false, panicked: false, gold: 0, items: [], containers: [],
      description: null, traits: null, notes: null, bonds: null, scars: null, omens: null, armor: null,
      imageUrl: null, partyId: null,
    });
    const p = await parties.save(party({ id: 0, ownerId: 1, members: [char.id] }));
    const socket = new FakeSocket();
    await io.connect(socket);
    await socket.emit("roll_dice", { characterId: char.id, partyId: p.id, roll: "3" });
    expect(publisher.calls).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/server test socketGateway`
Expected: FAIL — "Cannot find module './socketGateway.js'".

- [ ] **Step 3: Implementar `socketGateway.ts`**

```ts
import type { Server, Socket } from "socket.io";
import type { SessionUser } from "@kw/shared";
import { RollDiceInputSchema } from "@kw/shared";
import type { PartyRepository, RollDice } from "@kw/core";
import { partyRoom } from "../../infrastructure/realtime/socketio/SocketEventPublisher.js";

export interface SocketGatewayDeps {
  rollDice: RollDice;
  parties: PartyRepository;
  /** Resuelve el SessionUser a partir del handshake del socket (cookie de sesión). */
  resolveUser: (socket: Socket) => Promise<SessionUser | null>;
}

/** Une el socket a las salas party_{id} de las partidas del usuario (paridad join_user_parties). */
async function joinUserParties(
  socket: Socket,
  parties: PartyRepository,
  userId: number
): Promise<void> {
  const userParties = await parties.findByMember(userId);
  for (const party of userParties) {
    socket.join(partyRoom(party.id));
  }
}

/** Registra el middleware de auth y los handlers de conexión en el servidor Socket.IO. */
export function registerSocketHandlers(io: Server, deps: SocketGatewayDeps): void {
  // ---- middleware de autenticación por cookie de sesión ----
  io.use((socket, next) => {
    deps
      .resolveUser(socket)
      .then((user) => {
        if (!user) {
          next(new Error("unauthenticated"));
          return;
        }
        (socket.data as { user?: SessionUser }).user = user;
        next();
      })
      .catch(() => next(new Error("unauthenticated")));
  });

  io.on("connection", (socket) => {
    const user = (socket.data as { user?: SessionUser }).user;
    if (!user) {
      socket.disconnect(true);
      return;
    }

    // connect → unir a las salas de sus partidas
    void joinUserParties(socket, deps.parties, user.id);

    // register → re-unir (paridad con el cliente que emite 'register' al conectar)
    socket.on("register", () => {
      void joinUserParties(socket, deps.parties, user.id);
    });

    // roll_dice → caso de uso RollDice; errores tragados (paridad: emisión silenciosa)
    socket.on("roll_dice", (raw: unknown) => {
      const parsed = RollDiceInputSchema.safeParse(raw);
      if (!parsed.success) return;
      void deps.rollDice
        .execute({
          userId: user.id,
          characterId: parsed.data.characterId,
          partyId: parsed.data.partyId,
          roll: parsed.data.roll,
        })
        .catch(() => {
          /* paridad: cualquier fallo de validación de pertenencia no emite nada */
        });
    });
  });
}
```

- [ ] **Step 4: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/server test socketGateway`
Expected: PASS (6 tests verdes).

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @kw/server typecheck`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/interfaces/socket/socketGateway.ts packages/server/src/interfaces/socket/socketGateway.test.ts
git commit -m "feat(server): gateway Socket.IO (connect/register/roll_dice) con TDD"
```

---

## Task 7: `server` — cablear Socket.IO en el composition root

**Files:**
- Modify: `packages/server/src/main.ts`

> Cableado a mano: crear un `MemoryStore` explícito compartido por `@fastify/session` y por el resolutor de sesión del socket; registrar `fastify-socket.io`; instanciar `SocketEventPublisher` (necesita el `io`), `RollDice` (con `characters`, `parties`, ese publisher) y registrar los handlers tras `app.ready()`.

- [ ] **Step 1: Añadir imports al inicio de `packages/server/src/main.ts`**

Tras los imports existentes de adaptadores, añadir:

```ts
import fastifyIO from "fastify-socket.io";
import { MemoryStore } from "@fastify/session";
import { SocketEventPublisher } from "./infrastructure/realtime/socketio/SocketEventPublisher.js";
import { registerSocketHandlers } from "./interfaces/socket/socketGateway.js";
import { resolveSessionUser } from "./interfaces/socket/sessionFromHandshake.js";
import { RollDice } from "@kw/core";
```

> Si `RollDice` ya estuviera en el import agregado de `@kw/core`, añádelo a esa lista en vez de duplicar el import.

- [ ] **Step 2: Crear un store de sesión explícito y usarlo en el registro de `session`**

Sustituir el bloque actual de registro de sesión:

```ts
  // ---- sesión por cookie httpOnly ----
  await app.register(cookie);
  await app.register(session, {
    secret: env.SECRET_KEY,
    cookieName: "kw_session",
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: env.COOKIE_SECURE,
      maxAge: 60 * 60 * 24, // 24 h (paridad: PERMANENT_SESSION_LIFETIME)
      path: "/",
    },
  });
```

por:

```ts
  // ---- sesión por cookie httpOnly (store explícito, compartido con Socket.IO) ----
  const sessionStore = new MemoryStore();
  await app.register(cookie);
  await app.register(session, {
    secret: env.SECRET_KEY,
    cookieName: "kw_session",
    store: sessionStore,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: env.COOKIE_SECURE,
      maxAge: 60 * 60 * 24, // 24 h (paridad: PERMANENT_SESSION_LIFETIME)
      path: "/",
    },
  });
```

- [ ] **Step 3: Registrar el plugin de Socket.IO antes de las rutas**

Tras el registro de `session` (y antes o junto al resto de `app.register` de rutas), añadir:

```ts
  // ---- Socket.IO montado sobre el servidor HTTP de Fastify ----
  await app.register(fastifyIO, {
    cors: { origin: env.BASE_URL, credentials: true },
  });
```

- [ ] **Step 4: Cablear el publisher de tiempo real y el caso de uso `RollDice`, y registrar los handlers tras `ready`**

Antes de `await app.listen(...)`, añadir:

```ts
  // ---- tiempo real: publisher + caso de uso + gateway ----
  await app.ready(); // garantiza que app.io está disponible
  const eventPublisher = new SocketEventPublisher(app.io);
  const rollDice = new RollDice(characters, parties, eventPublisher);

  registerSocketHandlers(app.io, {
    rollDice,
    parties,
    resolveUser: (socket) =>
      resolveSessionUser(
        socket.handshake.headers.cookie,
        env.SECRET_KEY,
        "kw_session",
        sessionStore
      ),
  });
```

> `app.io` es el `Server` de Socket.IO que decora `fastify-socket.io`. La declaración de tipos del decorador la aporta el propio plugin; si el typecheck no la reconoce, ver Step 5.

- [ ] **Step 5: Augmentar el tipo de Fastify con el decorador `io` (si hace falta)**

`fastify-socket.io` declara `FastifyInstance.io`. Si el typecheck del server falla por `Property 'io' does not exist`, crear `packages/server/src/interfaces/socket/fastify-io.d.ts`:

```ts
import "fastify";
import type { Server } from "socket.io";

declare module "fastify" {
  interface FastifyInstance {
    io: Server;
  }
}
```

- [ ] **Step 6: Typecheck del server**

Run: `pnpm --filter @kw/server typecheck`
Expected: sin errores.

- [ ] **Step 7: Ejecutar toda la batería de tests del server**

Run: `pnpm --filter @kw/server test`
Expected: PASS (incluye SocketEventPublisher, sessionFromHandshake, socketGateway y los tests previos de fases anteriores).

- [ ] **Step 8: Commit**

```bash
git add packages/server/src/main.ts packages/server/src/interfaces/socket/fastify-io.d.ts
git commit -m "feat(server): cablear Socket.IO (sesión compartida, RollDice) en el composition root"
```

---

## Task 8: `web` — dependencia y cliente Socket.IO singleton (TDD)

**Files:**
- Modify: `packages/web/package.json`
- Create: `packages/web/src/realtime/socketClient.ts`
- Create: `packages/web/src/realtime/socketClient.test.ts`

> El cliente debe replicar `socket_notifications.js`: `transports: ["websocket"]`, `credentials`/cookies para enviar la sesión, emitir `register` al conectar, y exponer `onDiceRolled(cb)` + `rollDice(input)`. Para testear sin un servidor real, inyectamos una factoría de socket; en producción usamos `io()` de `socket.io-client`.

- [ ] **Step 1: Añadir la dependencia a `packages/web/package.json`**

En `"dependencies"`, junto a las existentes:

```json
    "socket.io-client": "^4.7.5",
```

Bloque de referencia (conservar el resto):

```json
  "dependencies": {
    "@kw/shared": "workspace:*",
    "@tanstack/react-query": "^5.51.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "socket.io-client": "^4.7.5"
  },
```

- [ ] **Step 2: Instalar**

Run: `pnpm install`
Expected: instala `socket.io-client`, actualiza `pnpm-lock.yaml`.

- [ ] **Step 3: Escribir el test que falla `packages/web/src/realtime/socketClient.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest";
import { createRealtimeClient, type MinimalSocket } from "./socketClient.js";

function fakeSocket() {
  const handlers = new Map<string, (...a: unknown[]) => void>();
  const emitted: Array<{ event: string; args: unknown[] }> = [];
  const socket: MinimalSocket = {
    on(event, cb) { handlers.set(event, cb as (...a: unknown[]) => void); },
    emit(event, ...args) { emitted.push({ event, args }); },
    disconnect() { emitted.push({ event: "__disconnect", args: [] }); },
  };
  return { socket, handlers, emitted };
}

describe("createRealtimeClient", () => {
  it("emite 'register' cuando el socket conecta", () => {
    const { socket, handlers, emitted } = fakeSocket();
    createRealtimeClient(() => socket);
    handlers.get("connect")?.();
    expect(emitted).toContainEqual({ event: "register", args: [] });
  });

  it("rollDice emite 'roll_dice' con el payload del protocolo", () => {
    const { socket, emitted } = fakeSocket();
    const client = createRealtimeClient(() => socket);
    client.rollDice({ characterId: 3, partyId: 7, roll: "7 (d8)" });
    expect(emitted).toContainEqual({
      event: "roll_dice",
      args: [{ characterId: 3, partyId: 7, roll: "7 (d8)" }],
    });
  });

  it("onDiceRolled registra un callback que recibe el string", () => {
    const { socket, handlers } = fakeSocket();
    const client = createRealtimeClient(() => socket);
    const received: string[] = [];
    client.onDiceRolled((msg) => received.push(msg));
    handlers.get("dice_rolled")?.("Aldric rolled a 7 (d8)");
    expect(received).toEqual(["Aldric rolled a 7 (d8)"]);
  });
});
```

- [ ] **Step 4: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/web test socketClient`
Expected: FAIL — "Cannot find module './socketClient.js'".

- [ ] **Step 5: Implementar `packages/web/src/realtime/socketClient.ts`**

```ts
import { io } from "socket.io-client";
import type { RollDiceInput, DiceRolledMessage } from "@kw/shared";

/** Subconjunto de Socket que usamos (testeable sin servidor real). */
export interface MinimalSocket {
  on(event: string, cb: (...args: unknown[]) => void): void;
  emit(event: string, ...args: unknown[]): void;
  disconnect(): void;
}

export interface RealtimeClient {
  rollDice(input: RollDiceInput): void;
  onDiceRolled(cb: (message: DiceRolledMessage) => void): void;
  disconnect(): void;
}

/** Factoría por defecto: socket.io-client con el mismo protocolo del origen. */
function defaultFactory(): MinimalSocket {
  return io({
    transports: ["websocket"],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 3,
    timeout: 10000,
  }) as unknown as MinimalSocket;
}

/**
 * Crea el cliente de tiempo real. Al conectar emite `register` (paridad
 * socket_notifications.js). `factory` permite inyectar un socket falso en tests.
 */
export function createRealtimeClient(
  factory: () => MinimalSocket = defaultFactory
): RealtimeClient {
  const socket = factory();

  socket.on("connect", () => {
    socket.emit("register");
  });

  return {
    rollDice(input: RollDiceInput) {
      socket.emit("roll_dice", input);
    },
    onDiceRolled(cb: (message: DiceRolledMessage) => void) {
      socket.on("dice_rolled", (msg) => cb(msg as DiceRolledMessage));
    },
    disconnect() {
      socket.disconnect();
    },
  };
}
```

- [ ] **Step 6: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/web test socketClient`
Expected: PASS (3 tests verdes).

- [ ] **Step 7: Typecheck**

Run: `pnpm --filter @kw/web typecheck`
Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
git add packages/web/package.json packages/web/src/realtime/socketClient.ts packages/web/src/realtime/socketClient.test.ts pnpm-lock.yaml
git commit -m "feat(web): cliente Socket.IO singleton (register, roll_dice, dice_rolled)"
```

---

## Task 9: `web` — hook `useDiceRoller` y modal de dados (TDD ligero)

**Files:**
- Create: `packages/web/src/realtime/useDiceRoller.ts`
- Create: `packages/web/src/realtime/DiceModal.tsx`
- Create: `packages/web/src/realtime/diceRoll.ts`
- Create: `packages/web/src/realtime/diceRoll.test.ts`

> Paridad con `dice_modal.js`: dados simples d4/d6/d8/d10/d12/d20/d100 y dobles d4+d4..d12+d12; el d100 solo en modo "party". La tirada y el formato del texto son lógica pura testeable; el modal es UI. El hook conecta el cliente al montar y expone `notifications` + `roll(input)`.

- [ ] **Step 1: Escribir el test que falla `packages/web/src/realtime/diceRoll.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { rollSingle, rollDouble, formatSingle, formatDouble } from "./diceRoll.js";

describe("rollSingle", () => {
  it("devuelve un entero en [1, sides]", () => {
    for (let i = 0; i < 200; i++) {
      const r = rollSingle(6, () => 0.5);
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(6);
    }
  });
  it("rng=0 → 1; rng→1 → sides (borde)", () => {
    expect(rollSingle(20, () => 0)).toBe(1);
    expect(rollSingle(20, () => 0.999999)).toBe(20);
  });
});

describe("rollDouble", () => {
  it("devuelve dos tiradas", () => {
    const [a, b] = rollDouble(8, () => 0);
    expect(a).toBe(1);
    expect(b).toBe(1);
  });
});

describe("format", () => {
  it("formatSingle = '{result} (d{sides})'", () => {
    expect(formatSingle(7, 8)).toBe("7 (d8)");
  });
  it("formatDouble = '{a}, {b} (d{sides}+d{sides})'", () => {
    expect(formatDouble(3, 5, 6)).toBe("3, 5 (d6+d6)");
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/web test diceRoll`
Expected: FAIL — "Cannot find module './diceRoll.js'".

- [ ] **Step 3: Implementar `packages/web/src/realtime/diceRoll.ts`**

```ts
export type Rng = () => number;

/** Tirada de un dado de `sides` caras: entero en [1, sides] (paridad utils.rollDice). */
export function rollSingle(sides: number, rng: Rng = Math.random): number {
  return Math.floor(rng() * sides) + 1;
}

/** Dos tiradas de `sides` caras (paridad utils.rollDoubleDice). */
export function rollDouble(sides: number, rng: Rng = Math.random): [number, number] {
  return [rollSingle(sides, rng), rollSingle(sides, rng)];
}

/** Texto de una tirada simple: "{result} (d{sides})". */
export function formatSingle(result: number, sides: number): string {
  return `${result} (d${sides})`;
}

/** Texto de una tirada doble: "{a}, {b} (d{sides}+d{sides})". */
export function formatDouble(a: number, b: number, sides: number): string {
  return `${a}, ${b} (d${sides}+d${sides})`;
}
```

- [ ] **Step 4: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/web test diceRoll`
Expected: PASS.

- [ ] **Step 5: Implementar `packages/web/src/realtime/useDiceRoller.ts`**

```ts
import { useEffect, useRef, useState } from "react";
import type { RollDiceInput } from "@kw/shared";
import { createRealtimeClient, type RealtimeClient } from "./socketClient.js";

export interface UseDiceRoller {
  notifications: string[];
  roll: (input: RollDiceInput) => void;
}

/**
 * Conecta el cliente de tiempo real al montar, acumula las notificaciones
 * `dice_rolled` recibidas y expone `roll` para emitir una tirada.
 */
export function useDiceRoller(): UseDiceRoller {
  const clientRef = useRef<RealtimeClient | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);

  useEffect(() => {
    const client = createRealtimeClient();
    clientRef.current = client;
    client.onDiceRolled((message) => {
      setNotifications((prev) => [...prev, message]);
    });
    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, []);

  return {
    notifications,
    roll: (input: RollDiceInput) => clientRef.current?.rollDice(input),
  };
}
```

- [ ] **Step 6: Implementar `packages/web/src/realtime/DiceModal.tsx`**

```tsx
import { useState } from "react";
import { rollSingle, rollDouble, formatSingle, formatDouble } from "./diceRoll.js";

const SINGLE_DICE = [4, 6, 8, 10, 12, 20, 100];
const DOUBLE_DICE = [4, 6, 8, 10, 12];

export interface DiceModalProps {
  /** "party" muestra el d100; "character" lo oculta (paridad dice_modal.js). */
  mode: "party" | "character";
  /** Callback con el texto formateado de la tirada (se envía por WS). */
  onRoll: (rollText: string) => void;
  onClose: () => void;
}

export function DiceModal({ mode, onRoll, onClose }: DiceModalProps) {
  const [result, setResult] = useState<string>("0");

  const singleDice = SINGLE_DICE.filter((s) => s !== 100 || mode === "party");

  function handleSingle(sides: number) {
    const r = rollSingle(sides);
    setResult(String(r));
    onRoll(formatSingle(r, sides));
  }

  function handleDouble(sides: number) {
    const [a, b] = rollDouble(sides);
    setResult(`${a}, ${b}`);
    onRoll(formatDouble(a, b, sides));
  }

  return (
    <div className="dice-modal" role="dialog" aria-label="Dice roller">
      <div className="dice-modal-background" onClick={onClose} />
      <div className="dice-modal-content">
        <p className="dice-modal-result">{result}</p>
        <div className="dice-modal-single">
          {singleDice.map((sides) => (
            <button key={`d${sides}`} type="button" onClick={() => handleSingle(sides)}>
              d{sides}
            </button>
          ))}
        </div>
        <div className="dice-modal-double">
          {DOUBLE_DICE.map((sides) => (
            <button key={`dd${sides}`} type="button" onClick={() => handleDouble(sides)}>
              d{sides}+d{sides}
            </button>
          ))}
        </div>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Typecheck**

Run: `pnpm --filter @kw/web typecheck`
Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
git add packages/web/src/realtime/diceRoll.ts packages/web/src/realtime/diceRoll.test.ts packages/web/src/realtime/useDiceRoller.ts packages/web/src/realtime/DiceModal.tsx
git commit -m "feat(web): hook useDiceRoller, lógica pura de tirada y modal de dados"
```

---

## Task 10: `web` — integrar dados y notificaciones en la vista de partida

**Files:**
- Modify: `packages/web/src/parties/PartyViewPage.tsx`

> En la vista de partida (donde el usuario es owner/subowner), un botón abre el `DiceModal` en modo "party"; al tirar se envía por WS con el primer personaje del usuario que sea miembro de la partida, y se muestran las notificaciones `dice_rolled` en vivo. Selección del personaje: el primer `member` cuyo dueño sea el usuario actual (en esta vista solo tenemos ids de miembros; usamos `useCharacters` para resolver cuáles son del usuario).

- [ ] **Step 1: Reescribir `packages/web/src/parties/PartyViewPage.tsx`**

```tsx
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useParty } from "./useParties.js";
import { useSession } from "../auth/useSession.js";
import { useCharacters } from "../characters/useCharacters.js";
import { useDiceRoller } from "../realtime/useDiceRoller.js";
import { DiceModal } from "../realtime/DiceModal.js";

export function PartyViewPage() {
  const { id } = useParams<{ id: string }>();
  const partyId = Number(id);
  const { data: session } = useSession();
  const { data, isLoading, error } = useParty(partyId);
  const { data: myCharacters } = useCharacters();
  const { notifications, roll } = useDiceRoller();
  const [diceOpen, setDiceOpen] = useState(false);

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>Party not found or access denied.</p>;
  if (!data) return null;

  const { party, joinCode } = data;
  const isOwner = session?.id === party.ownerId;
  const isSubowner = session?.id !== undefined && party.subowners.includes(session.id);

  // Primer personaje del usuario que es miembro de la partida (para tirar dados).
  const myMemberCharacter = (myCharacters ?? []).find((c) => party.members.includes(c.id));

  function handleRoll(rollText: string) {
    if (!myMemberCharacter) return;
    roll({ characterId: myMemberCharacter.id, partyId: party.id, roll: rollText });
    setDiceOpen(false);
  }

  return (
    <div>
      <h1>{party.name}</h1>
      {party.description && <p>{party.description}</p>}

      {(isOwner || isSubowner) && (
        <div>
          <Link to={`/parties/${party.id}/edit`}>Edit party</Link>
          {joinCode && (
            <p>
              Join code: <strong>{joinCode}</strong>
            </p>
          )}
        </div>
      )}

      {myMemberCharacter && (
        <section>
          <button type="button" onClick={() => setDiceOpen(true)}>
            Roll dice
          </button>
          {diceOpen && (
            <DiceModal
              mode="party"
              onRoll={handleRoll}
              onClose={() => setDiceOpen(false)}
            />
          )}
        </section>
      )}

      <section aria-live="polite">
        <h2>Dice rolls</h2>
        {notifications.length === 0 ? (
          <p>No rolls yet.</p>
        ) : (
          <ul>
            {notifications.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Members ({party.members.length})</h2>
        {party.members.length === 0 ? (
          <p>No members yet.</p>
        ) : (
          <ul>
            {party.members.map((memberId) => (
              <li key={memberId}>Character #{memberId}</li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Group Storage</h2>
        {party.items.length === 0 ? (
          <p>No items in group storage.</p>
        ) : (
          <ul>
            {party.items.map((item) => (
              <li key={item.id}>{item.name}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

> Nota: el hook `useCharacters` ya existe (`packages/web/src/characters/useCharacters.ts`) y devuelve los personajes del usuario autenticado. Si su API expone los datos bajo otra forma (p.ej. `{ data }` con otra propiedad), ajusta el desestructurado `const { data: myCharacters } = useCharacters();` al contrato real de ese hook sin cambiar la lógica.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @kw/web typecheck`
Expected: sin errores.

- [ ] **Step 3: Ejecutar los tests del web**

Run: `pnpm --filter @kw/web test`
Expected: PASS (socketClient, diceRoll y los previos).

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/parties/PartyViewPage.tsx
git commit -m "feat(web): dados en vivo y notificaciones dice_rolled en la vista de partida"
```

---

## Task 11: Verificación final del monorepo (Fase 6)

**Files:**
- (sin cambios de código; verificación)

- [ ] **Step 1: Ejecutar toda la batería de tests del monorepo**

Run: `pnpm test`
Expected: PASS en `@kw/shared` (incluye realtimeIo), `@kw/core` (incluye RollDice), `@kw/server` (incluye SocketEventPublisher, sessionFromHandshake, socketGateway) y `@kw/web` (socketClient, diceRoll).

- [ ] **Step 2: Typecheck global**

Run: `pnpm typecheck`
Expected: sin errores en ningún paquete.

- [ ] **Step 3: Smoke test manual del tiempo real (opcional pero recomendado)**

Run (terminal 1): `cd packages/server && pnpm dev`
Run (terminal 2): `pnpm --filter @kw/web dev`
Pasos: iniciar sesión con dos usuarios (dos navegadores), unir un personaje de cada uno a la misma partida, abrir la vista de la partida en ambos, tirar un dado en uno → el otro debe ver "{nombre} rolled a {resultado}" en "Dice rolls". Parar ambos (Ctrl+C).
Expected: la notificación aparece en tiempo real en el otro cliente conectado a la misma sala `party_{id}`.

- [ ] **Step 4: Commit (si hubo cambios menores) o anotar verificación**

```bash
git commit --allow-empty -m "chore(fase6): verificación final — tests y typecheck en verde"
```

---

## Self-Review (cobertura del alcance)

- **Socket.IO sobre Fastify** → Task 3 (deps), Task 7 (registro de `fastify-socket.io` y montaje sobre el HTTP de Fastify).
- **Autenticación con la misma cookie de sesión de Fase 2** → Task 5 (`resolveSessionUser`: parse + unsign con `SECRET_KEY` + `store.get`), Task 7 (store de sesión explícito `MemoryStore` compartido entre `@fastify/session` y el socket; middleware `io.use`).
- **Salas `party_{id}` y join al conectar/registrarse** → Task 6 (`joinUserParties` vía `PartyRepository.findByMember`, handlers `connection` y `register`), paridad con `join_user_parties` (owner o subowner).
- **Evento `roll_dice` → caso de uso `RollDice` (valida pertenencia) → publica `dice_rolled` vía `EventPublisher`** → Task 2 (`RollDice` en `core`, valida personaje existe/dueño/partida existe/miembro, mensaje `"{name} rolled a {roll}"`), Task 6 (gateway valida payload con Zod y traga errores = emisión silenciosa, paridad).
- **Adaptador `SocketEventPublisher` traduce eventos de dominio a emisiones WS** → Task 4 (`io.to(party_{id}).emit(type, payload)`), implementa el puerto `EventPublisher` de Fase 1.
- **Notificaciones de cambios en vivo siguiendo el mismo patrón** → el publisher es genérico (`event.type` arbitrario, p.ej. `party_updated`), Task 4 lo cubre; queda listo para reusarse desde otros casos de uso sin tocar el transporte.
- **Cliente Socket.IO en la web React** → Task 8 (`createRealtimeClient`: `transports: ["websocket"]`, `withCredentials`, `register` al conectar, `roll_dice`, `dice_rolled`), Task 9 (hook + modal + lógica pura de tirada con paridad `dice_modal.js`/`utils.rollDice`), Task 10 (integración en `PartyViewPage`).

**Ausencia de placeholders:** cada step que toca código incluye el contenido completo (sin TODO/TBD). Los `Run:`/`Expected:` acompañan a cada test y verificación. Hay dos notas de "ajusta si tu contrato difiere" (import agregado de `RollDice` en Task 7 Step 1; forma de `useCharacters` en Task 10) que no son placeholders sino salvaguardas frente a variaciones menores ya existentes en el repo.

**Consistencia de tipos/firmas entre tareas:**
- `RollDiceInput` (`shared`, Task 1) = `{ characterId, partyId, roll }` se usa idéntico en `RollDice.execute` (core, Task 2 — más `userId` del lado servidor), en el gateway (Task 6: `safeParse` → `execute`), en el cliente web (Task 8 `rollDice(input)`) y en el hook/modal (Task 9/10).
- `EventPublisher.publishToParty(partyId, { type, payload })` (puerto Fase 1) lo consume `RollDice` (Task 2) y lo implementa `SocketEventPublisher` (Task 4). El `RecordingPublisher` de los tests respeta esa firma.
- `PartyError` (códigos `not_found`/`forbidden`/...) reutilizado en `RollDice` (Task 2), consistente con `party/errors.ts` existente.
- `PartyRepository.findByMember(userId)` (existente) usado por el gateway para `joinUserParties` (Task 6), con la misma semántica owner-o-subowner del `InMemoryPartyRepository` y `PrismaPartyRepository` ya implementados.
- `SessionUser` (`shared`) = `{ id, username, email }` usado en el resolutor de handshake (Task 5), el gateway (Task 6) y el composition root (Task 7), idéntico al de `@fastify/session` augmentado en `authRoutes.ts`.
- El nombre de sala `party_{id}` se centraliza en `partyRoom()` (Task 4) y lo reusa el gateway (Task 6), evitando divergencias.

**Fuera de alcance de esta fase:** Redis para escalado horizontal de Socket.IO (YAGNI, decisión §13 del diseño); persistencia de eventos de partida; i18n de los mensajes de tirada (Fase 8). El puerto `EventPublisher` queda preparado para emitir otros eventos de dominio (`party_updated`, inventario) cuando los casos de uso correspondientes decidan publicarlos.

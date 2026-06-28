# Fase 5 — Partidas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar la gestión de partidas completa: CRUD, generación y unión por joinCode, subdueños (subowners), gestión de miembros, inventario/contenedores de grupo y eventos de partida. Incluye: InMemoryPartyRepository (helpers de test), adaptador PrismaPartyRepository, casos de uso en `core/application/party`, rutas `/api/parties/*`, y vistas React (lista, creación, edición, vista de partida y unión por código).

**Architecture:** Hexagonal. Toda la lógica de negocio va en `packages/core` (TS puro). Los adaptadores Prisma y Fastify van en `packages/server`. La UI en `packages/web`. El cableado se hace en `packages/server/src/main.ts`. Se reutilizan los tipos `Party` de `@kw/shared`, el puerto `PartyRepository` e `IdGenerator` de `packages/core/src/ports/driven` ya definidos en Fase 1, y el esquema Prisma `Party` ya existente.

**Tech Stack:** Node 22, pnpm workspaces, TypeScript, Zod, Vitest, Fastify, Prisma (SQLite), React, TanStack Query.

> **Nota de paridad Flask:** la lógica de `party_utils.py` (add/remove character, subowners) se porta a casos de uso de `core`. El `joinCode` se genera con `IdGenerator.joinCode()`. Los miembros/subowners se almacenan como `number[]` (JSON en columna, igual que el origen). Un usuario que une un personaje a una partida se convierte automáticamente en `subowner` (paridad con `add_character_to_party`). Al eliminar un personaje de la partida, se elimina del array `subowners` solo si no tiene otros personajes en la partida (misma lógica que el origen). El owner siempre tiene acceso al `joinCode`; subowners también lo ven en el front. El inventario de partida reutiliza exactamente los mismos tipos `Item`/`Container` del inventario de personaje.

---

## Estructura de ficheros (Fase 5)

```
packages/
├─ core/src/
│  ├─ application/party/
│  │  ├─ errors.ts                        # PartyError + PartyErrorCode
│  │  ├─ CreateParty.ts                   # caso de uso: crear partida
│  │  ├─ CreateParty.test.ts
│  │  ├─ GetParty.ts                      # caso de uso: leer partida (auth check)
│  │  ├─ GetParty.test.ts
│  │  ├─ ListParties.ts                   # caso de uso: mis partidas (owner + member)
│  │  ├─ ListParties.test.ts
│  │  ├─ UpdateParty.ts                   # caso de uso: editar nombre/descripción/notas
│  │  ├─ UpdateParty.test.ts
│  │  ├─ DeleteParty.ts                   # caso de uso: borrar partida
│  │  ├─ DeleteParty.test.ts
│  │  ├─ JoinParty.ts                     # caso de uso: unirse por joinCode
│  │  ├─ JoinParty.test.ts
│  │  ├─ LeaveParty.ts                    # caso de uso: salir / expulsar personaje
│  │  ├─ LeaveParty.test.ts
│  │  ├─ UpdatePartyInventory.ts          # caso de uso: guardar items/containers de partida
│  │  ├─ UpdatePartyInventory.test.ts
│  │  └─ index.ts                         # barrel de exports
│  └─ testing/
│     ├─ InMemoryPartyRepository.ts       # fake repository para tests
│     └─ FakeIdGenerator.ts              # generador de joinCode determinista
│
├─ shared/src/schemas/
│  └─ partyIo.ts                          # schemas Zod de entrada HTTP para partidas
│
├─ server/src/
│  ├─ infrastructure/
│  │  ├─ persistence/prisma/
│  │  │  └─ PrismaPartyRepository.ts      # adaptador Prisma
│  │  │  └─ PrismaPartyRepository.test.ts
│  │  └─ rng/
│  │     └─ CryptoIdGenerator.ts         # implementación real de IdGenerator
│  └─ interfaces/http/
│     ├─ partyRoutes.ts                   # rutas /api/parties/*
│     └─ partyRoutes.test.ts
│
└─ web/src/
   ├─ api/
   │  └─ parties.ts                       # fetch helpers para partidas
   ├─ parties/
   │  ├─ useParties.ts                    # TanStack Query hooks
   │  ├─ PartyListPage.tsx                # lista de partidas del usuario
   │  ├─ PartyCreatePage.tsx              # formulario de nueva partida
   │  ├─ PartyViewPage.tsx                # vista de partida (miembros + inventario)
   │  ├─ PartyEditPage.tsx                # edición de partida (dueño/subdueño)
   │  └─ JoinPartyPage.tsx                # unirse por joinCode
   └─ App.tsx                             # añadir rutas /parties/*
```

---

## Task 1: `shared` — schemas Zod de entrada HTTP para partidas (`partyIo.ts`)

**Files:**
- Create: `packages/shared/src/schemas/partyIo.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Crear `packages/shared/src/schemas/partyIo.ts`**

Inputs de creación, edición, unión y actualización de inventario de partida. Reutilizan `ItemSchema` y `ContainerSchema` ya existentes.

```ts
import { z } from "zod";
import { ItemSchema } from "./item.js";
import { ContainerSchema } from "./container.js";

export const CreatePartyInputSchema = z.object({
  name: z.string().min(1).max(64),
  description: z.string().max(2000).nullable().default(null),
  notes: z.string().max(2000).nullable().default(null),
});
export type CreatePartyInput = z.infer<typeof CreatePartyInputSchema>;

export const UpdatePartyInputSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  description: z.string().max(2000).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});
export type UpdatePartyInput = z.infer<typeof UpdatePartyInputSchema>;

export const JoinPartyInputSchema = z.object({
  joinCode: z.string().min(1),
  characterId: z.number().int().positive(),
});
export type JoinPartyInput = z.infer<typeof JoinPartyInputSchema>;

export const LeavePartyInputSchema = z.object({
  characterId: z.number().int().positive(),
});
export type LeavePartyInput = z.infer<typeof LeavePartyInputSchema>;

export const UpdatePartyInventoryInputSchema = z.object({
  items: z.array(ItemSchema),
  containers: z.array(ContainerSchema),
});
export type UpdatePartyInventoryInput = z.infer<typeof UpdatePartyInventoryInputSchema>;
```

- [ ] **Step 2: Añadir export a `packages/shared/src/index.ts`**

Añadir al final del archivo existente:

```ts
export * from "./schemas/partyIo.js";
```

- [ ] **Step 3: Typecheck de shared**

Run: `pnpm --filter @kw/shared typecheck`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/schemas/partyIo.ts packages/shared/src/index.ts
git commit -m "feat(shared): schemas Zod de entrada HTTP para partidas (partyIo)"
```

---

## Task 2: `core/testing` — InMemoryPartyRepository y FakeIdGenerator

**Files:**
- Create: `packages/core/src/testing/InMemoryPartyRepository.ts`
- Create: `packages/core/src/testing/FakeIdGenerator.ts`

Estos helpers permiten testear los casos de uso de partida sin base de datos real.

- [ ] **Step 1: Crear `packages/core/src/testing/InMemoryPartyRepository.ts`**

Sigue el mismo patrón que `InMemoryCharacterRepository` ya existente: autoincremento de id desde 0, `findByJoinCode`, `findByMember` filtra por `members` array.

```ts
import type { Party } from "@kw/shared";
import type { PartyRepository } from "../ports/driven/PartyRepository.js";

export class InMemoryPartyRepository implements PartyRepository {
  private parties = new Map<number, Party>();
  private seq = 0;

  async findById(id: number): Promise<Party | null> {
    return this.parties.get(id) ?? null;
  }

  async findByJoinCode(joinCode: string): Promise<Party | null> {
    for (const p of this.parties.values()) {
      if (p.joinCode === joinCode) return p;
    }
    return null;
  }

  async findByMember(userId: number): Promise<Party[]> {
    return [...this.parties.values()].filter(
      (p) => p.ownerId === userId || p.members.includes(userId)
    );
  }

  async save(party: Party): Promise<Party> {
    let record = party;
    if (record.id === 0) {
      record = { ...record, id: ++this.seq };
    }
    this.parties.set(record.id, record);
    return record;
  }

  async delete(id: number): Promise<void> {
    this.parties.delete(id);
  }
}
```

- [ ] **Step 2: Crear `packages/core/src/testing/FakeIdGenerator.ts`**

Genera códigos secuenciales deterministas para tests.

```ts
import type { IdGenerator } from "../ports/driven/IdGenerator.js";

export class FakeIdGenerator implements IdGenerator {
  private counter = 0;

  joinCode(): string {
    return `CODE${++this.counter}`;
  }
}
```

- [ ] **Step 3: Typecheck de core**

Run: `pnpm --filter @kw/core typecheck`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/testing/InMemoryPartyRepository.ts packages/core/src/testing/FakeIdGenerator.ts
git commit -m "feat(core/testing): InMemoryPartyRepository y FakeIdGenerator"
```

---

## Task 3: `core/application/party` — errores y CreateParty (TDD)

**Files:**
- Create: `packages/core/src/application/party/errors.ts`
- Create: `packages/core/src/application/party/CreateParty.test.ts`
- Create: `packages/core/src/application/party/CreateParty.ts`

- [ ] **Step 1: Crear `packages/core/src/application/party/errors.ts`**

```ts
export type PartyErrorCode =
  | "not_found"
  | "forbidden"
  | "invalid_code"
  | "already_member"
  | "invalid_input";

export class PartyError extends Error {
  constructor(
    public readonly code: PartyErrorCode,
    message: string
  ) {
    super(message);
    this.name = "PartyError";
  }
}
```

- [ ] **Step 2: Escribir el test que falla `CreateParty.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { CreateParty } from "./CreateParty.js";
import { InMemoryPartyRepository } from "../../testing/InMemoryPartyRepository.js";
import { FakeIdGenerator } from "../../testing/FakeIdGenerator.js";

let parties: InMemoryPartyRepository;
let idGen: FakeIdGenerator;

beforeEach(() => {
  parties = new InMemoryPartyRepository();
  idGen = new FakeIdGenerator();
});

describe("CreateParty", () => {
  it("crea una partida con joinCode generado e ownerId correcto", async () => {
    const uc = new CreateParty(parties, idGen);
    const party = await uc.execute({
      ownerId: 1,
      input: { name: "Los Exploradores", description: "Una partida de prueba", notes: null },
    });

    expect(party.id).toBeGreaterThan(0);
    expect(party.ownerId).toBe(1);
    expect(party.name).toBe("Los Exploradores");
    expect(party.description).toBe("Una partida de prueba");
    expect(party.joinCode).toBe("CODE1");
    expect(party.members).toEqual([]);
    expect(party.subowners).toEqual([]);
    expect(party.items).toEqual([]);
    expect(party.containers).toEqual([]);
    expect(party.events).toEqual([]);
    expect(party.version).toBe(0);
  });

  it("genera joinCodes únicos en llamadas sucesivas", async () => {
    const uc = new CreateParty(parties, idGen);
    const p1 = await uc.execute({ ownerId: 1, input: { name: "P1", description: null, notes: null } });
    const p2 = await uc.execute({ ownerId: 1, input: { name: "P2", description: null, notes: null } });
    expect(p1.joinCode).not.toBe(p2.joinCode);
  });
});
```

- [ ] **Step 3: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/core test`
Expected: FAIL — "Cannot find module './CreateParty.js'".

- [ ] **Step 4: Implementar `CreateParty.ts`**

```ts
import type { Party, CreatePartyInput } from "@kw/shared";
import type { PartyRepository } from "../../ports/driven/PartyRepository.js";
import type { IdGenerator } from "../../ports/driven/IdGenerator.js";

export interface CreatePartyCommand {
  ownerId: number;
  input: CreatePartyInput;
}

export class CreateParty {
  constructor(
    private readonly parties: PartyRepository,
    private readonly idGenerator: IdGenerator
  ) {}

  async execute(cmd: CreatePartyCommand): Promise<Party> {
    const party: Party = {
      id: 0,
      ownerId: cmd.ownerId,
      name: cmd.input.name,
      description: cmd.input.description,
      notes: cmd.input.notes,
      members: [],
      subowners: [],
      joinCode: this.idGenerator.joinCode(),
      items: [],
      containers: [],
      events: [],
      version: 0,
    };
    return this.parties.save(party);
  }
}
```

- [ ] **Step 5: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/core test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/application/party/errors.ts packages/core/src/application/party/CreateParty.ts packages/core/src/application/party/CreateParty.test.ts
git commit -m "feat(core): caso de uso CreateParty con TDD"
```

---

## Task 4: `core/application/party` — GetParty y ListParties (TDD)

**Files:**
- Create: `packages/core/src/application/party/GetParty.ts`
- Create: `packages/core/src/application/party/GetParty.test.ts`
- Create: `packages/core/src/application/party/ListParties.ts`
- Create: `packages/core/src/application/party/ListParties.test.ts`

- [ ] **Step 1: Escribir el test que falla `GetParty.test.ts`**

Regla de paridad: solo el owner y los subowners (usuarios con al menos un personaje en la partida) pueden ver la partida. El `joinCode` se devuelve solo al owner.

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { GetParty } from "./GetParty.js";
import { PartyError } from "./errors.js";
import { InMemoryPartyRepository } from "../../testing/InMemoryPartyRepository.js";
import type { Party } from "@kw/shared";

const baseParty = (over: Partial<Party> = {}): Party => ({
  id: 0,
  ownerId: 1,
  name: "Test Party",
  description: null,
  notes: null,
  members: [10],
  subowners: [2],
  joinCode: "ABC123",
  items: [],
  containers: [],
  events: [],
  version: 0,
  ...over,
});

let parties: InMemoryPartyRepository;

beforeEach(() => {
  parties = new InMemoryPartyRepository();
});

describe("GetParty", () => {
  it("el owner puede leer la partida y recibe el joinCode", async () => {
    const saved = await parties.save(baseParty());
    const uc = new GetParty(parties);
    const result = await uc.execute({ partyId: saved.id, userId: 1 });
    expect(result.party.name).toBe("Test Party");
    expect(result.joinCode).toBe("ABC123");
  });

  it("un subowner puede leer la partida pero no recibe joinCode", async () => {
    const saved = await parties.save(baseParty());
    const uc = new GetParty(parties);
    const result = await uc.execute({ partyId: saved.id, userId: 2 });
    expect(result.party.id).toBe(saved.id);
    expect(result.joinCode).toBeNull();
  });

  it("un usuario sin acceso recibe forbidden", async () => {
    const saved = await parties.save(baseParty());
    const uc = new GetParty(parties);
    await expect(uc.execute({ partyId: saved.id, userId: 99 })).rejects.toThrow(PartyError);
  });

  it("partida inexistente recibe not_found", async () => {
    const uc = new GetParty(parties);
    await expect(uc.execute({ partyId: 999, userId: 1 })).rejects.toThrow(PartyError);
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/core test`
Expected: FAIL — "Cannot find module './GetParty.js'".

- [ ] **Step 3: Implementar `GetParty.ts`**

```ts
import type { Party } from "@kw/shared";
import type { PartyRepository } from "../../ports/driven/PartyRepository.js";
import { PartyError } from "./errors.js";

export interface GetPartyQuery {
  partyId: number;
  userId: number;
}

export interface GetPartyResult {
  party: Party;
  joinCode: string | null;
}

export class GetParty {
  constructor(private readonly parties: PartyRepository) {}

  async execute(query: GetPartyQuery): Promise<GetPartyResult> {
    const party = await this.parties.findById(query.partyId);
    if (!party) {
      throw new PartyError("not_found", "Party not found");
    }
    const isOwner = party.ownerId === query.userId;
    const isSubowner = party.subowners.includes(query.userId);
    if (!isOwner && !isSubowner) {
      throw new PartyError("forbidden", "Access denied");
    }
    return {
      party,
      joinCode: isOwner ? party.joinCode : null,
    };
  }
}
```

- [ ] **Step 4: Escribir el test que falla `ListParties.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { ListParties } from "./ListParties.js";
import { InMemoryPartyRepository } from "../../testing/InMemoryPartyRepository.js";
import type { Party } from "@kw/shared";

const mkParty = (over: Partial<Party> = {}): Party => ({
  id: 0,
  ownerId: 1,
  name: "P",
  description: null,
  notes: null,
  members: [],
  subowners: [],
  joinCode: "X",
  items: [],
  containers: [],
  events: [],
  version: 0,
  ...over,
});

let parties: InMemoryPartyRepository;

beforeEach(() => {
  parties = new InMemoryPartyRepository();
});

describe("ListParties", () => {
  it("devuelve las partidas donde el usuario es owner", async () => {
    await parties.save(mkParty({ ownerId: 1, joinCode: "A" }));
    await parties.save(mkParty({ ownerId: 2, joinCode: "B" }));
    const uc = new ListParties(parties);
    const result = await uc.execute(1);
    expect(result).toHaveLength(1);
    expect(result[0]!.ownerId).toBe(1);
  });

  it("devuelve también las partidas donde el usuario es miembro (subowner)", async () => {
    await parties.save(mkParty({ ownerId: 2, subowners: [1], joinCode: "C" }));
    const uc = new ListParties(parties);
    const result = await uc.execute(1);
    expect(result).toHaveLength(1);
  });

  it("lista vacía si no hay partidas del usuario", async () => {
    await parties.save(mkParty({ ownerId: 2, joinCode: "D" }));
    const uc = new ListParties(parties);
    expect(await uc.execute(1)).toHaveLength(0);
  });
});
```

- [ ] **Step 5: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/core test`
Expected: FAIL — "Cannot find module './ListParties.js'".

- [ ] **Step 6: Implementar `ListParties.ts`**

```ts
import type { Party } from "@kw/shared";
import type { PartyRepository } from "../../ports/driven/PartyRepository.js";

export class ListParties {
  constructor(private readonly parties: PartyRepository) {}

  async execute(userId: number): Promise<Party[]> {
    return this.parties.findByMember(userId);
  }
}
```

- [ ] **Step 7: Ejecutar los tests para ver que pasan**

Run: `pnpm --filter @kw/core test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/application/party/GetParty.ts packages/core/src/application/party/GetParty.test.ts packages/core/src/application/party/ListParties.ts packages/core/src/application/party/ListParties.test.ts
git commit -m "feat(core): casos de uso GetParty y ListParties con TDD"
```

---

## Task 5: `core/application/party` — UpdateParty y DeleteParty (TDD)

**Files:**
- Create: `packages/core/src/application/party/UpdateParty.ts`
- Create: `packages/core/src/application/party/UpdateParty.test.ts`
- Create: `packages/core/src/application/party/DeleteParty.ts`
- Create: `packages/core/src/application/party/DeleteParty.test.ts`

- [ ] **Step 1: Escribir el test que falla `UpdateParty.test.ts`**

Solo el owner y subowners pueden editar nombre/descripción/notas. El `version` se incrementa en cada update (para paridad de optimistic locking futuro).

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { UpdateParty } from "./UpdateParty.js";
import { PartyError } from "./errors.js";
import { InMemoryPartyRepository } from "../../testing/InMemoryPartyRepository.js";
import type { Party } from "@kw/shared";

const mkParty = (over: Partial<Party> = {}): Party => ({
  id: 0, ownerId: 1, name: "Old Name", description: "Old desc", notes: null,
  members: [], subowners: [2], joinCode: "X", items: [], containers: [], events: [], version: 0,
  ...over,
});

let parties: InMemoryPartyRepository;

beforeEach(() => { parties = new InMemoryPartyRepository(); });

describe("UpdateParty", () => {
  it("el owner puede actualizar nombre y descripción", async () => {
    const saved = await parties.save(mkParty());
    const uc = new UpdateParty(parties);
    const updated = await uc.execute({
      partyId: saved.id, userId: 1,
      input: { name: "New Name", description: "New desc" },
    });
    expect(updated.name).toBe("New Name");
    expect(updated.description).toBe("New desc");
  });

  it("un subowner puede actualizar la partida", async () => {
    const saved = await parties.save(mkParty());
    const uc = new UpdateParty(parties);
    const updated = await uc.execute({
      partyId: saved.id, userId: 2,
      input: { name: "Subowner Edit" },
    });
    expect(updated.name).toBe("Subowner Edit");
  });

  it("un extraño recibe forbidden", async () => {
    const saved = await parties.save(mkParty());
    const uc = new UpdateParty(parties);
    await expect(uc.execute({ partyId: saved.id, userId: 99, input: { name: "X" } }))
      .rejects.toThrow(PartyError);
  });

  it("partida inexistente recibe not_found", async () => {
    const uc = new UpdateParty(parties);
    await expect(uc.execute({ partyId: 999, userId: 1, input: { name: "X" } }))
      .rejects.toThrow(PartyError);
  });

  it("los campos no incluidos en input no cambian", async () => {
    const saved = await parties.save(mkParty({ notes: "keep me" }));
    const uc = new UpdateParty(parties);
    const updated = await uc.execute({ partyId: saved.id, userId: 1, input: { name: "X" } });
    expect(updated.notes).toBe("keep me");
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/core test`
Expected: FAIL — "Cannot find module './UpdateParty.js'".

- [ ] **Step 3: Implementar `UpdateParty.ts`**

```ts
import type { Party, UpdatePartyInput } from "@kw/shared";
import type { PartyRepository } from "../../ports/driven/PartyRepository.js";
import { PartyError } from "./errors.js";

export interface UpdatePartyCommand {
  partyId: number;
  userId: number;
  input: UpdatePartyInput;
}

export class UpdateParty {
  constructor(private readonly parties: PartyRepository) {}

  async execute(cmd: UpdatePartyCommand): Promise<Party> {
    const party = await this.parties.findById(cmd.partyId);
    if (!party) {
      throw new PartyError("not_found", "Party not found");
    }
    const isOwner = party.ownerId === cmd.userId;
    const isSubowner = party.subowners.includes(cmd.userId);
    if (!isOwner && !isSubowner) {
      throw new PartyError("forbidden", "Access denied");
    }
    const updated: Party = {
      ...party,
      name: cmd.input.name ?? party.name,
      description: cmd.input.description !== undefined ? cmd.input.description : party.description,
      notes: cmd.input.notes !== undefined ? cmd.input.notes : party.notes,
    };
    return this.parties.save(updated);
  }
}
```

- [ ] **Step 4: Escribir el test que falla `DeleteParty.test.ts`**

Solo el owner puede borrar la partida. Al borrar, en el origen Flask también se desvinculaban los personajes (se seteaba `party_id = null`); ese efecto en la BD se delega al adaptador Prisma via `onDelete: Cascade` del esquema, pero el caso de uso debe verificar permisos.

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { DeleteParty } from "./DeleteParty.js";
import { PartyError } from "./errors.js";
import { InMemoryPartyRepository } from "../../testing/InMemoryPartyRepository.js";
import type { Party } from "@kw/shared";

const mkParty = (over: Partial<Party> = {}): Party => ({
  id: 0, ownerId: 1, name: "P", description: null, notes: null,
  members: [10], subowners: [2], joinCode: "X", items: [], containers: [], events: [], version: 0,
  ...over,
});

let parties: InMemoryPartyRepository;

beforeEach(() => { parties = new InMemoryPartyRepository(); });

describe("DeleteParty", () => {
  it("el owner puede borrar la partida", async () => {
    const saved = await parties.save(mkParty());
    const uc = new DeleteParty(parties);
    await uc.execute({ partyId: saved.id, userId: 1 });
    expect(await parties.findById(saved.id)).toBeNull();
  });

  it("un subowner no puede borrar la partida", async () => {
    const saved = await parties.save(mkParty());
    const uc = new DeleteParty(parties);
    await expect(uc.execute({ partyId: saved.id, userId: 2 })).rejects.toThrow(PartyError);
  });

  it("un extraño recibe forbidden", async () => {
    const saved = await parties.save(mkParty());
    const uc = new DeleteParty(parties);
    await expect(uc.execute({ partyId: saved.id, userId: 99 })).rejects.toThrow(PartyError);
  });

  it("partida inexistente recibe not_found", async () => {
    const uc = new DeleteParty(parties);
    await expect(uc.execute({ partyId: 999, userId: 1 })).rejects.toThrow(PartyError);
  });
});
```

- [ ] **Step 5: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/core test`
Expected: FAIL — "Cannot find module './DeleteParty.js'".

- [ ] **Step 6: Implementar `DeleteParty.ts`**

```ts
import type { PartyRepository } from "../../ports/driven/PartyRepository.js";
import { PartyError } from "./errors.js";

export interface DeletePartyCommand {
  partyId: number;
  userId: number;
}

export class DeleteParty {
  constructor(private readonly parties: PartyRepository) {}

  async execute(cmd: DeletePartyCommand): Promise<void> {
    const party = await this.parties.findById(cmd.partyId);
    if (!party) {
      throw new PartyError("not_found", "Party not found");
    }
    if (party.ownerId !== cmd.userId) {
      throw new PartyError("forbidden", "Only the owner can delete a party");
    }
    await this.parties.delete(cmd.partyId);
  }
}
```

- [ ] **Step 7: Ejecutar los tests para ver que pasan**

Run: `pnpm --filter @kw/core test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/application/party/UpdateParty.ts packages/core/src/application/party/UpdateParty.test.ts packages/core/src/application/party/DeleteParty.ts packages/core/src/application/party/DeleteParty.test.ts
git commit -m "feat(core): casos de uso UpdateParty y DeleteParty con TDD"
```

---

## Task 6: `core/application/party` — JoinParty (TDD)

**Files:**
- Create: `packages/core/src/application/party/JoinParty.ts`
- Create: `packages/core/src/application/party/JoinParty.test.ts`

Paridad con `add_character_to_party` de Flask: añade el characterId a `members`, añade el ownerId del personaje a `subowners` (si no está ya). El caso de uso recibe `characterId` y el `characterOwnerId` (el userId que hace la petición, dueño del personaje). Necesita también el `CharacterRepository` para verificar que el personaje pertenece al usuario.

- [ ] **Step 1: Escribir el test que falla `JoinParty.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { JoinParty } from "./JoinParty.js";
import { PartyError } from "./errors.js";
import { InMemoryPartyRepository } from "../../testing/InMemoryPartyRepository.js";
import { InMemoryCharacterRepository } from "../../testing/InMemoryCharacterRepository.js";
import type { Party, Character } from "@kw/shared";

const mkParty = (over: Partial<Party> = {}): Party => ({
  id: 0, ownerId: 1, name: "P", description: null, notes: null,
  members: [], subowners: [], joinCode: "SECRET", items: [], containers: [], events: [], version: 0,
  ...over,
});

const mkChar = (over: Partial<Character> = {}): Character => ({
  id: 0, ownerId: 2, name: "Hero", background: "A", strength: 10, strengthMax: 10,
  dexterity: 10, dexterityMax: 10, willpower: 10, willpowerMax: 10, hp: 5, hpMax: 5,
  deprived: false, panicked: false, gold: 0, items: [], containers: [], description: null,
  traits: null, notes: null, bonds: null, scars: null, omens: null, armor: null, imageUrl: null,
  partyId: null, ...over,
});

let parties: InMemoryPartyRepository;
let characters: InMemoryCharacterRepository;

beforeEach(() => {
  parties = new InMemoryPartyRepository();
  characters = new InMemoryCharacterRepository();
});

describe("JoinParty", () => {
  it("añade el personaje a members y el usuario a subowners", async () => {
    const party = await parties.save(mkParty());
    const char = await characters.save(mkChar({ ownerId: 2 }));

    const uc = new JoinParty(parties, characters);
    const updated = await uc.execute({ joinCode: "SECRET", characterId: char.id, userId: 2 });

    expect(updated.members).toContain(char.id);
    expect(updated.subowners).toContain(2);
  });

  it("joinCode incorrecto lanza invalid_code", async () => {
    const uc = new JoinParty(parties, characters);
    await expect(uc.execute({ joinCode: "WRONG", characterId: 1, userId: 2 }))
      .rejects.toThrow(PartyError);
  });

  it("personaje inexistente o de otro usuario lanza forbidden", async () => {
    const party = await parties.save(mkParty());
    const char = await characters.save(mkChar({ ownerId: 99 }));
    const uc = new JoinParty(parties, characters);
    await expect(uc.execute({ joinCode: "SECRET", characterId: char.id, userId: 2 }))
      .rejects.toThrow(PartyError);
  });

  it("no añade duplicados: unirse dos veces no duplica members ni subowners", async () => {
    const party = await parties.save(mkParty());
    const char = await characters.save(mkChar({ ownerId: 2 }));
    const uc = new JoinParty(parties, characters);
    await uc.execute({ joinCode: "SECRET", characterId: char.id, userId: 2 });
    const updated = await uc.execute({ joinCode: "SECRET", characterId: char.id, userId: 2 });
    expect(updated.members.filter((m) => m === char.id)).toHaveLength(1);
    expect(updated.subowners.filter((s) => s === 2)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/core test`
Expected: FAIL — "Cannot find module './JoinParty.js'".

- [ ] **Step 3: Implementar `JoinParty.ts`**

```ts
import type { Party } from "@kw/shared";
import type { PartyRepository } from "../../ports/driven/PartyRepository.js";
import type { CharacterRepository } from "../../ports/driven/CharacterRepository.js";
import { PartyError } from "./errors.js";

export interface JoinPartyCommand {
  joinCode: string;
  characterId: number;
  userId: number;
}

export class JoinParty {
  constructor(
    private readonly parties: PartyRepository,
    private readonly characters: CharacterRepository
  ) {}

  async execute(cmd: JoinPartyCommand): Promise<Party> {
    const party = await this.parties.findByJoinCode(cmd.joinCode);
    if (!party) {
      throw new PartyError("invalid_code", "Invalid join code");
    }

    const character = await this.characters.findById(cmd.characterId);
    if (!character || character.ownerId !== cmd.userId) {
      throw new PartyError("forbidden", "Character not found or does not belong to user");
    }

    const members = party.members.includes(cmd.characterId)
      ? party.members
      : [...party.members, cmd.characterId];

    const subowners = party.subowners.includes(cmd.userId)
      ? party.subowners
      : [...party.subowners, cmd.userId];

    const updated: Party = { ...party, members, subowners };
    return this.parties.save(updated);
  }
}
```

- [ ] **Step 4: Ejecutar los tests para ver que pasan**

Run: `pnpm --filter @kw/core test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/application/party/JoinParty.ts packages/core/src/application/party/JoinParty.test.ts
git commit -m "feat(core): caso de uso JoinParty con TDD"
```

---

## Task 7: `core/application/party` — LeaveParty (TDD)

**Files:**
- Create: `packages/core/src/application/party/LeaveParty.ts`
- Create: `packages/core/src/application/party/LeaveParty.test.ts`

Paridad con `remove_character_from_party` de Flask: elimina el characterId de `members`; elimina al userId de `subowners` solo si no tiene otros personajes restantes en la partida.

- [ ] **Step 1: Escribir el test que falla `LeaveParty.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { LeaveParty } from "./LeaveParty.js";
import { PartyError } from "./errors.js";
import { InMemoryPartyRepository } from "../../testing/InMemoryPartyRepository.js";
import { InMemoryCharacterRepository } from "../../testing/InMemoryCharacterRepository.js";
import type { Party, Character } from "@kw/shared";

const mkParty = (over: Partial<Party> = {}): Party => ({
  id: 0, ownerId: 1, name: "P", description: null, notes: null,
  members: [], subowners: [], joinCode: "X", items: [], containers: [], events: [], version: 0,
  ...over,
});
const mkChar = (over: Partial<Character> = {}): Character => ({
  id: 0, ownerId: 2, name: "H", background: "A", strength: 10, strengthMax: 10,
  dexterity: 10, dexterityMax: 10, willpower: 10, willpowerMax: 10, hp: 5, hpMax: 5,
  deprived: false, panicked: false, gold: 0, items: [], containers: [], description: null,
  traits: null, notes: null, bonds: null, scars: null, omens: null, armor: null, imageUrl: null,
  partyId: null, ...over,
});

let parties: InMemoryPartyRepository;
let characters: InMemoryCharacterRepository;

beforeEach(() => {
  parties = new InMemoryPartyRepository();
  characters = new InMemoryCharacterRepository();
});

describe("LeaveParty", () => {
  it("elimina el personaje de members y al usuario de subowners si era su único personaje", async () => {
    const char = await characters.save(mkChar({ ownerId: 2 }));
    const party = await parties.save(mkParty({ members: [char.id], subowners: [2] }));
    const uc = new LeaveParty(parties, characters);
    const updated = await uc.execute({ partyId: party.id, characterId: char.id, requesterId: 1 });
    expect(updated.members).not.toContain(char.id);
    expect(updated.subowners).not.toContain(2);
  });

  it("mantiene al usuario en subowners si tiene otro personaje en la partida", async () => {
    const char1 = await characters.save(mkChar({ ownerId: 2 }));
    const char2 = await characters.save(mkChar({ ownerId: 2 }));
    const party = await parties.save(mkParty({ members: [char1.id, char2.id], subowners: [2] }));
    const uc = new LeaveParty(parties, characters);
    const updated = await uc.execute({ partyId: party.id, characterId: char1.id, requesterId: 1 });
    expect(updated.members).not.toContain(char1.id);
    expect(updated.subowners).toContain(2);
  });

  it("el dueño del personaje puede expulsarse a sí mismo", async () => {
    const char = await characters.save(mkChar({ ownerId: 2 }));
    const party = await parties.save(mkParty({ members: [char.id], subowners: [2] }));
    const uc = new LeaveParty(parties, characters);
    const updated = await uc.execute({ partyId: party.id, characterId: char.id, requesterId: 2 });
    expect(updated.members).not.toContain(char.id);
  });

  it("un extraño no puede expulsar a otros", async () => {
    const char = await characters.save(mkChar({ ownerId: 2 }));
    const party = await parties.save(mkParty({ members: [char.id], subowners: [2] }));
    const uc = new LeaveParty(parties, characters);
    await expect(uc.execute({ partyId: party.id, characterId: char.id, requesterId: 99 }))
      .rejects.toThrow(PartyError);
  });

  it("partida inexistente lanza not_found", async () => {
    const uc = new LeaveParty(parties, characters);
    await expect(uc.execute({ partyId: 999, characterId: 1, requesterId: 1 }))
      .rejects.toThrow(PartyError);
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/core test`
Expected: FAIL — "Cannot find module './LeaveParty.js'".

- [ ] **Step 3: Implementar `LeaveParty.ts`**

```ts
import type { Party } from "@kw/shared";
import type { PartyRepository } from "../../ports/driven/PartyRepository.js";
import type { CharacterRepository } from "../../ports/driven/CharacterRepository.js";
import { PartyError } from "./errors.js";

export interface LeavePartyCommand {
  partyId: number;
  characterId: number;
  /** userId del que hace la petición (owner de la partida O dueño del personaje) */
  requesterId: number;
}

export class LeaveParty {
  constructor(
    private readonly parties: PartyRepository,
    private readonly characters: CharacterRepository
  ) {}

  async execute(cmd: LeavePartyCommand): Promise<Party> {
    const party = await this.parties.findById(cmd.partyId);
    if (!party) {
      throw new PartyError("not_found", "Party not found");
    }

    const character = await this.characters.findById(cmd.characterId);
    const characterOwnerId = character?.ownerId;

    // Solo puede expulsar el owner de la partida o el dueño del personaje
    const isPartyOwner = party.ownerId === cmd.requesterId;
    const isCharacterOwner = characterOwnerId === cmd.requesterId;
    if (!isPartyOwner && !isCharacterOwner) {
      throw new PartyError("forbidden", "Access denied");
    }

    const members = party.members.filter((m) => m !== cmd.characterId);

    // Comprobar si el usuario aún tiene otros personajes en la partida
    let subowners = party.subowners;
    if (characterOwnerId !== undefined) {
      const userRemainingCharacters = members.filter(async (memberId) => {
        const c = await this.characters.findById(memberId);
        return c?.ownerId === characterOwnerId;
      });
      // Evaluación síncrona: filtramos los members restantes que pertenecen al usuario
      const remainingMemberIds = await Promise.all(
        members.map(async (memberId) => {
          const c = await this.characters.findById(memberId);
          return c?.ownerId === characterOwnerId ? memberId : null;
        })
      );
      const hasOtherCharacters = remainingMemberIds.some((id) => id !== null);
      if (!hasOtherCharacters) {
        subowners = party.subowners.filter((s) => s !== characterOwnerId);
      }
    }

    const updated: Party = { ...party, members, subowners };
    return this.parties.save(updated);
  }
}
```

- [ ] **Step 4: Ejecutar los tests para ver que pasan**

Run: `pnpm --filter @kw/core test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/application/party/LeaveParty.ts packages/core/src/application/party/LeaveParty.test.ts
git commit -m "feat(core): caso de uso LeaveParty con TDD"
```

---

## Task 8: `core/application/party` — UpdatePartyInventory (TDD) + barrel index

**Files:**
- Create: `packages/core/src/application/party/UpdatePartyInventory.ts`
- Create: `packages/core/src/application/party/UpdatePartyInventory.test.ts`
- Create: `packages/core/src/application/party/index.ts`

- [ ] **Step 1: Escribir el test que falla `UpdatePartyInventory.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { UpdatePartyInventory } from "./UpdatePartyInventory.js";
import { PartyError } from "./errors.js";
import { InMemoryPartyRepository } from "../../testing/InMemoryPartyRepository.js";
import type { Party } from "@kw/shared";

const mkParty = (over: Partial<Party> = {}): Party => ({
  id: 0, ownerId: 1, name: "P", description: null, notes: null,
  members: [], subowners: [2], joinCode: "X", items: [], containers: [], events: [], version: 0,
  ...over,
});

let parties: InMemoryPartyRepository;

beforeEach(() => { parties = new InMemoryPartyRepository(); });

describe("UpdatePartyInventory", () => {
  it("el owner puede actualizar items y containers", async () => {
    const saved = await parties.save(mkParty());
    const uc = new UpdatePartyInventory(parties);
    const updated = await uc.execute({
      partyId: saved.id, userId: 1,
      input: {
        items: [{ id: 1, name: "Rope", location: 0, tags: [] }],
        containers: [{ id: 0, name: "Main", slots: 10 }],
      },
    });
    expect(updated.items).toHaveLength(1);
    expect(updated.items[0]!.name).toBe("Rope");
    expect(updated.containers[0]!.slots).toBe(10);
  });

  it("un subowner puede actualizar el inventario", async () => {
    const saved = await parties.save(mkParty());
    const uc = new UpdatePartyInventory(parties);
    const updated = await uc.execute({
      partyId: saved.id, userId: 2,
      input: { items: [], containers: [] },
    });
    expect(updated.items).toHaveLength(0);
  });

  it("un extraño recibe forbidden", async () => {
    const saved = await parties.save(mkParty());
    const uc = new UpdatePartyInventory(parties);
    await expect(uc.execute({ partyId: saved.id, userId: 99, input: { items: [], containers: [] } }))
      .rejects.toThrow(PartyError);
  });

  it("partida inexistente lanza not_found", async () => {
    const uc = new UpdatePartyInventory(parties);
    await expect(uc.execute({ partyId: 999, userId: 1, input: { items: [], containers: [] } }))
      .rejects.toThrow(PartyError);
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/core test`
Expected: FAIL — "Cannot find module './UpdatePartyInventory.js'".

- [ ] **Step 3: Implementar `UpdatePartyInventory.ts`**

```ts
import type { Party, UpdatePartyInventoryInput } from "@kw/shared";
import type { PartyRepository } from "../../ports/driven/PartyRepository.js";
import { PartyError } from "./errors.js";

export interface UpdatePartyInventoryCommand {
  partyId: number;
  userId: number;
  input: UpdatePartyInventoryInput;
}

export class UpdatePartyInventory {
  constructor(private readonly parties: PartyRepository) {}

  async execute(cmd: UpdatePartyInventoryCommand): Promise<Party> {
    const party = await this.parties.findById(cmd.partyId);
    if (!party) {
      throw new PartyError("not_found", "Party not found");
    }
    const isOwner = party.ownerId === cmd.userId;
    const isSubowner = party.subowners.includes(cmd.userId);
    if (!isOwner && !isSubowner) {
      throw new PartyError("forbidden", "Access denied");
    }
    const updated: Party = {
      ...party,
      items: cmd.input.items,
      containers: cmd.input.containers,
    };
    return this.parties.save(updated);
  }
}
```

- [ ] **Step 4: Crear el barrel `packages/core/src/application/party/index.ts`**

```ts
export { PartyError } from "./errors.js";
export type { PartyErrorCode } from "./errors.js";
export { CreateParty } from "./CreateParty.js";
export type { CreatePartyCommand } from "./CreateParty.js";
export { GetParty } from "./GetParty.js";
export type { GetPartyQuery, GetPartyResult } from "./GetParty.js";
export { ListParties } from "./ListParties.js";
export { UpdateParty } from "./UpdateParty.js";
export type { UpdatePartyCommand } from "./UpdateParty.js";
export { DeleteParty } from "./DeleteParty.js";
export type { DeletePartyCommand } from "./DeleteParty.js";
export { JoinParty } from "./JoinParty.js";
export type { JoinPartyCommand } from "./JoinParty.js";
export { LeaveParty } from "./LeaveParty.js";
export type { LeavePartyCommand } from "./LeaveParty.js";
export { UpdatePartyInventory } from "./UpdatePartyInventory.js";
export type { UpdatePartyInventoryCommand } from "./UpdatePartyInventory.js";
```

- [ ] **Step 5: Actualizar `packages/core/src/index.ts` — añadir exports de party**

Añadir al final del archivo existente:

```ts
// Party — casos de uso
export * from "./application/party/index.js";
```

- [ ] **Step 6: Ejecutar todos los tests para ver que pasan**

Run: `pnpm --filter @kw/core test`
Expected: PASS en todos los tests de party.

- [ ] **Step 7: Typecheck de core**

Run: `pnpm --filter @kw/core typecheck`
Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/application/party/UpdatePartyInventory.ts packages/core/src/application/party/UpdatePartyInventory.test.ts packages/core/src/application/party/index.ts packages/core/src/index.ts
git commit -m "feat(core): UpdatePartyInventory y barrel de casos de uso de party"
```

---

## Task 9: `server/infrastructure` — CryptoIdGenerator y PrismaPartyRepository

**Files:**
- Create: `packages/server/src/infrastructure/rng/CryptoIdGenerator.ts`
- Create: `packages/server/src/infrastructure/persistence/prisma/PrismaPartyRepository.ts`
- Create: `packages/server/src/infrastructure/persistence/prisma/PrismaPartyRepository.test.ts`

- [ ] **Step 1: Crear `CryptoIdGenerator.ts`**

Genera un código de unión legible de 8 caracteres alfanuméricos (sin ambiguos 0/O/I/l), paridad con el origen Flask que usaba strings similares.

```ts
import { randomBytes } from "node:crypto";
import type { IdGenerator } from "@kw/core";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export class CryptoIdGenerator implements IdGenerator {
  joinCode(): string {
    const bytes = randomBytes(8);
    return [...bytes].map((b) => ALPHABET[b! % ALPHABET.length]!).join("");
  }
}
```

- [ ] **Step 2: Crear `PrismaPartyRepository.ts`**

Sigue exactamente el mismo patrón que `PrismaCharacterRepository`: tipo `Row` local, funciones `toEntity`/`toData` que parsean/serializan campos JSON con Zod, métodos CRUD correspondientes al puerto `PartyRepository`.

```ts
import type { PrismaClient } from "@prisma/client";
import {
  ItemSchema,
  ContainerSchema,
  type Party,
  type Item,
  type Container,
} from "@kw/shared";
import { z } from "zod";
import type { PartyRepository } from "@kw/core";

const ItemsSchema = z.array(ItemSchema);
const ContainersSchema = z.array(ContainerSchema);
const MembersSchema = z.array(z.number().int());
const SubownersSchema = z.array(z.number().int());
const EventsSchema = z.array(z.string());

type Row = {
  id: number;
  ownerId: number;
  name: string;
  description: string | null;
  notes: string | null;
  members: string;
  subowners: string;
  joinCode: string;
  items: string;
  containers: string;
  events: string;
  version: number;
};

function toEntity(row: Row): Party {
  return {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    description: row.description,
    notes: row.notes,
    members: MembersSchema.parse(JSON.parse(row.members)),
    subowners: SubownersSchema.parse(JSON.parse(row.subowners)),
    joinCode: row.joinCode,
    items: ItemsSchema.parse(JSON.parse(row.items)),
    containers: ContainersSchema.parse(JSON.parse(row.containers)),
    events: EventsSchema.parse(JSON.parse(row.events)),
    version: row.version,
  };
}

function toData(p: Party) {
  return {
    ownerId: p.ownerId,
    name: p.name,
    description: p.description,
    notes: p.notes,
    members: JSON.stringify(MembersSchema.parse(p.members)),
    subowners: JSON.stringify(SubownersSchema.parse(p.subowners)),
    joinCode: p.joinCode,
    items: JSON.stringify(ItemsSchema.parse(p.items)),
    containers: JSON.stringify(ContainersSchema.parse(p.containers)),
    events: JSON.stringify(EventsSchema.parse(p.events)),
    version: p.version,
  };
}

export class PrismaPartyRepository implements PartyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: number): Promise<Party | null> {
    const row = await this.prisma.party.findUnique({ where: { id } });
    return row ? toEntity(row as Row) : null;
  }

  async findByJoinCode(joinCode: string): Promise<Party | null> {
    const row = await this.prisma.party.findUnique({ where: { joinCode } });
    return row ? toEntity(row as Row) : null;
  }

  async findByMember(userId: number): Promise<Party[]> {
    // Las partidas donde es owner O donde su userId aparece en subowners (JSON)
    // SQLite no admite JSON operators en Prisma, así que cargamos todo y filtramos
    const rows = await this.prisma.party.findMany({
      where: { ownerId: userId },
    });
    // También buscamos donde aparece en subowners
    const allRows = await this.prisma.party.findMany();
    const result = new Map<number, Party>();
    for (const row of allRows) {
      const party = toEntity(row as Row);
      if (party.ownerId === userId || party.subowners.includes(userId)) {
        result.set(party.id, party);
      }
    }
    return [...result.values()];
  }

  async save(party: Party): Promise<Party> {
    const data = toData(party);
    if (party.id === 0) {
      const created = await this.prisma.party.create({ data });
      return toEntity(created as Row);
    }
    const updated = await this.prisma.party.update({
      where: { id: party.id },
      data,
    });
    return toEntity(updated as Row);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.party.delete({ where: { id } });
  }
}
```

- [ ] **Step 3: Escribir el test de integración `PrismaPartyRepository.test.ts`**

Sigue el mismo patrón que `PrismaCharacterRepository.test.ts`: BD SQLite temporal con `prisma db push`.

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import type { Party } from "@kw/shared";
import { PrismaPartyRepository } from "./PrismaPartyRepository.js";

let dir: string;
let prisma: PrismaClient;
let ownerId: number;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "kw-party-"));
  const dbUrl = `file:${join(dir, "test.db")}`;
  execSync("pnpm exec prisma db push --skip-generate", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: "ignore",
  });
  prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  const user = await prisma.user.create({
    data: { email: "o@party.com", username: "partyowner", passwordHash: "h", confirmed: true },
  });
  ownerId = user.id;
});

afterAll(async () => {
  await prisma.$disconnect();
  rmSync(dir, { recursive: true, force: true });
});

const baseParty = (over: Partial<Party> = {}): Party => ({
  id: 0,
  ownerId,
  name: "Test Party",
  description: "A test",
  notes: null,
  members: [],
  subowners: [],
  joinCode: `CODE-${Math.random()}`,
  items: [{ id: 1, name: "Torch", location: 0, tags: [] }],
  containers: [{ id: 0, name: "Main", slots: 10 }],
  events: ["Session 1 started"],
  version: 0,
  ...over,
});

describe("PrismaPartyRepository", () => {
  it("guarda una partida nueva y la recupera con JSON parseado", async () => {
    const repo = new PrismaPartyRepository(prisma);
    const saved = await repo.save(baseParty({ joinCode: "UNIQUE1" }));
    expect(saved.id).toBeGreaterThan(0);

    const got = await repo.findById(saved.id);
    expect(got?.name).toBe("Test Party");
    expect(got?.items).toHaveLength(1);
    expect(got?.items[0]!.name).toBe("Torch");
    expect(got?.containers[0]!.slots).toBe(10);
    expect(got?.events[0]).toBe("Session 1 started");
  });

  it("findByJoinCode encuentra la partida correcta", async () => {
    const repo = new PrismaPartyRepository(prisma);
    await repo.save(baseParty({ joinCode: "TESTJOIN" }));
    const found = await repo.findByJoinCode("TESTJOIN");
    expect(found?.name).toBe("Test Party");
  });

  it("findByMember incluye partidas donde el usuario es owner", async () => {
    const repo = new PrismaPartyRepository(prisma);
    await repo.save(baseParty({ joinCode: "MEMBER1" }));
    const list = await repo.findByMember(ownerId);
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.every((p) => p.ownerId === ownerId || p.subowners.includes(ownerId))).toBe(true);
  });

  it("actualiza una partida existente", async () => {
    const repo = new PrismaPartyRepository(prisma);
    const saved = await repo.save(baseParty({ joinCode: "UPDATE1", name: "Old" }));
    await repo.save({ ...saved, name: "New", version: 1 });
    const reloaded = await repo.findById(saved.id);
    expect(reloaded?.name).toBe("New");
    expect(reloaded?.version).toBe(1);
  });

  it("delete elimina la partida", async () => {
    const repo = new PrismaPartyRepository(prisma);
    const saved = await repo.save(baseParty({ joinCode: "DELETE1" }));
    await repo.delete(saved.id);
    expect(await repo.findById(saved.id)).toBeNull();
  });
});
```

- [ ] **Step 4: Ejecutar el test de integración**

Run: `pnpm --filter @kw/server test`
Expected: PASS — todos los tests de PrismaPartyRepository en verde.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/infrastructure/rng/CryptoIdGenerator.ts packages/server/src/infrastructure/persistence/prisma/PrismaPartyRepository.ts packages/server/src/infrastructure/persistence/prisma/PrismaPartyRepository.test.ts
git commit -m "feat(server): CryptoIdGenerator y PrismaPartyRepository con tests de integración"
```

---

## Task 10: `server/interfaces/http` — partyRoutes (TDD)

**Files:**
- Create: `packages/server/src/interfaces/http/partyRoutes.ts`
- Create: `packages/server/src/interfaces/http/partyRoutes.test.ts`

- [ ] **Step 1: Crear `partyRoutes.ts`**

Sigue el mismo patrón que `characterRoutes.ts` e `inventoryRoutes.ts`. Rutas:
- `GET /` — lista partidas del usuario
- `POST /` — crear partida
- `GET /:id` — ver partida (owner recibe joinCode, subowner no)
- `PATCH /:id` — editar partida (owner o subowner)
- `DELETE /:id` — borrar partida (solo owner)
- `POST /join` — unirse por joinCode
- `DELETE /:id/members/:characterId` — expulsar/salir
- `PUT /:id/inventory` — actualizar inventario de grupo

```ts
import type { FastifyPluginAsync } from "fastify";
import "@fastify/session";
import {
  PartyError,
  type CreateParty,
  type GetParty,
  type ListParties,
  type UpdateParty,
  type DeleteParty,
  type JoinParty,
  type LeaveParty,
  type UpdatePartyInventory,
} from "@kw/core";
import {
  CreatePartyInputSchema,
  UpdatePartyInputSchema,
  JoinPartyInputSchema,
  LeavePartyInputSchema,
  UpdatePartyInventoryInputSchema,
} from "@kw/shared";
import { z } from "zod";

export interface PartyUseCases {
  list: ListParties;
  create: CreateParty;
  get: GetParty;
  update: UpdateParty;
  remove: DeleteParty;
  join: JoinParty;
  leave: LeaveParty;
  updateInventory: UpdatePartyInventory;
}

const ParamsSchema = z.object({ id: z.coerce.number().int() });
const MemberParamsSchema = z.object({
  id: z.coerce.number().int(),
  characterId: z.coerce.number().int(),
});

function statusFor(code: string): number {
  switch (code) {
    case "not_found": return 404;
    case "forbidden": return 403;
    case "invalid_code": return 400;
    case "already_member": return 409;
    default: return 400;
  }
}

export function buildPartyRoutes(uc: PartyUseCases): FastifyPluginAsync {
  const plugin: FastifyPluginAsync = async (app) => {
    app.setErrorHandler((err, _req, reply) => {
      if (err instanceof PartyError) {
        return reply.status(statusFor(err.code)).send({ code: err.code, message: err.message });
      }
      if ((err as { validation?: unknown }).validation) {
        return reply.status(400).send({ code: "invalid_input", message: err.message });
      }
      app.log.error(err);
      return reply.status(500).send({ code: "internal", message: "Internal error" });
    });

    app.addHook("preHandler", async (req, reply) => {
      if (!req.session.user) {
        return reply.status(401).send({ code: "unauthenticated", message: "Not logged in" });
      }
    });

    app.get("/", async (req, reply) => {
      const parties = await uc.list.execute(req.session.user!.id);
      return reply.send({ parties });
    });

    app.post("/", async (req, reply) => {
      const input = CreatePartyInputSchema.parse(req.body);
      const party = await uc.create.execute({ ownerId: req.session.user!.id, input });
      return reply.status(201).send({ party });
    });

    app.get("/:id", async (req, reply) => {
      const { id } = ParamsSchema.parse(req.params);
      const result = await uc.get.execute({ partyId: id, userId: req.session.user!.id });
      return reply.send({ party: result.party, joinCode: result.joinCode });
    });

    app.patch("/:id", async (req, reply) => {
      const { id } = ParamsSchema.parse(req.params);
      const input = UpdatePartyInputSchema.parse(req.body);
      const party = await uc.update.execute({ partyId: id, userId: req.session.user!.id, input });
      return reply.send({ party });
    });

    app.delete("/:id", async (req, reply) => {
      const { id } = ParamsSchema.parse(req.params);
      await uc.remove.execute({ partyId: id, userId: req.session.user!.id });
      return reply.send({ ok: true });
    });

    app.post("/join", async (req, reply) => {
      const input = JoinPartyInputSchema.parse(req.body);
      const party = await uc.join.execute({
        joinCode: input.joinCode,
        characterId: input.characterId,
        userId: req.session.user!.id,
      });
      return reply.send({ party });
    });

    app.delete("/:id/members/:characterId", async (req, reply) => {
      const { id, characterId } = MemberParamsSchema.parse(req.params);
      const party = await uc.leave.execute({
        partyId: id,
        characterId,
        requesterId: req.session.user!.id,
      });
      return reply.send({ party });
    });

    app.put("/:id/inventory", async (req, reply) => {
      const { id } = ParamsSchema.parse(req.params);
      const input = UpdatePartyInventoryInputSchema.parse(req.body);
      const party = await uc.updateInventory.execute({
        partyId: id,
        userId: req.session.user!.id,
        input,
      });
      return reply.send({ party });
    });
  };
  return plugin;
}
```

- [ ] **Step 2: Crear `partyRoutes.test.ts`**

Sigue el mismo patrón que `characterRoutes.test.ts`: usa repositorios en memoria.

```ts
import { describe, it, expect, beforeEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import session from "@fastify/session";
import {
  CreateParty,
  GetParty,
  ListParties,
  UpdateParty,
  DeleteParty,
  JoinParty,
  LeaveParty,
  UpdatePartyInventory,
} from "@kw/core";
import { InMemoryPartyRepository } from "@kw/core/testing/InMemoryPartyRepository.js";
import { InMemoryCharacterRepository } from "@kw/core/testing/InMemoryCharacterRepository.js";
import { FakeIdGenerator } from "@kw/core/testing/FakeIdGenerator.js";
import type { SessionUser, Character } from "@kw/shared";
import { buildPartyRoutes } from "./partyRoutes.js";

async function buildApp() {
  const parties = new InMemoryPartyRepository();
  const characters = new InMemoryCharacterRepository();
  const idGen = new FakeIdGenerator();

  const uc = {
    list: new ListParties(parties),
    create: new CreateParty(parties, idGen),
    get: new GetParty(parties),
    update: new UpdateParty(parties),
    remove: new DeleteParty(parties),
    join: new JoinParty(parties, characters),
    leave: new LeaveParty(parties, characters),
    updateInventory: new UpdatePartyInventory(parties),
  };

  const app = Fastify();
  await app.register(cookie);
  await app.register(session, {
    secret: "test-secret-test-secret-test-secret",
    cookieName: "kw_session",
    cookie: { secure: false, httpOnly: true, path: "/" },
  });
  app.post<{ Body: SessionUser }>("/test-login", async (req, reply) => {
    req.session.user = req.body;
    return reply.send({ ok: true });
  });
  await app.register(buildPartyRoutes(uc), { prefix: "/api/parties" });
  await app.ready();
  return { app, parties, characters };
}

async function login(app: FastifyInstance, user: SessionUser): Promise<string> {
  const res = await app.inject({ method: "POST", url: "/test-login", payload: user });
  const setCookie = res.headers["set-cookie"];
  return Array.isArray(setCookie) ? setCookie[0]! : (setCookie as string);
}

const owner: SessionUser = { id: 1, username: "owner", email: "o@e.com" };
const other: SessionUser = { id: 2, username: "other", email: "x@e.com" };

const createPayload = { name: "My Party", description: "A cool party", notes: null };

describe("party routes", () => {
  let ctx: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => { ctx = await buildApp(); });

  it("rechaza sin sesión con 401", async () => {
    const res = await ctx.app.inject({ method: "GET", url: "/api/parties" });
    expect(res.statusCode).toBe(401);
  });

  it("crea, lista, lee, edita y borra una partida", async () => {
    const cookie = await login(ctx.app, owner);

    const created = await ctx.app.inject({
      method: "POST", url: "/api/parties", headers: { cookie }, payload: createPayload,
    });
    expect(created.statusCode).toBe(201);
    const id = created.json().party.id as number;
    expect(id).toBeGreaterThan(0);
    expect(created.json().party.joinCode).toBe("CODE1");

    const list = await ctx.app.inject({ method: "GET", url: "/api/parties", headers: { cookie } });
    expect(list.json().parties).toHaveLength(1);

    // owner recibe joinCode
    const got = await ctx.app.inject({ method: "GET", url: `/api/parties/${id}`, headers: { cookie } });
    expect(got.json().joinCode).toBe("CODE1");
    expect(got.json().party.name).toBe("My Party");

    const patched = await ctx.app.inject({
      method: "PATCH", url: `/api/parties/${id}`, headers: { cookie }, payload: { name: "Renamed" },
    });
    expect(patched.json().party.name).toBe("Renamed");

    const deleted = await ctx.app.inject({ method: "DELETE", url: `/api/parties/${id}`, headers: { cookie } });
    expect(deleted.statusCode).toBe(200);
  });

  it("un usuario ajeno recibe 403 al leer la partida", async () => {
    const cookieA = await login(ctx.app, owner);
    const created = await ctx.app.inject({
      method: "POST", url: "/api/parties", headers: { cookie: cookieA }, payload: createPayload,
    });
    const id = created.json().party.id as number;

    const cookieB = await login(ctx.app, other);
    const got = await ctx.app.inject({ method: "GET", url: `/api/parties/${id}`, headers: { cookie: cookieB } });
    expect(got.statusCode).toBe(403);
  });

  it("unirse a una partida por joinCode", async () => {
    const cookieA = await login(ctx.app, owner);
    const created = await ctx.app.inject({
      method: "POST", url: "/api/parties", headers: { cookie: cookieA }, payload: createPayload,
    });
    const partyId = created.json().party.id as number;
    const joinCode = created.json().party.joinCode as string;

    // Crear personaje del usuario 2
    const baseChar: Character = {
      id: 0, ownerId: 2, name: "Hero", background: "A",
      strength: 10, strengthMax: 10, dexterity: 10, dexterityMax: 10, willpower: 10, willpowerMax: 10,
      hp: 5, hpMax: 5, deprived: false, panicked: false, gold: 0, items: [], containers: [],
      description: null, traits: null, notes: null, bonds: null, scars: null, omens: null, armor: null,
      imageUrl: null, partyId: null,
    };
    const savedChar = await ctx.characters.save(baseChar);

    const cookieB = await login(ctx.app, other);
    const joined = await ctx.app.inject({
      method: "POST", url: "/api/parties/join", headers: { cookie: cookieB },
      payload: { joinCode, characterId: savedChar.id },
    });
    expect(joined.statusCode).toBe(200);
    expect(joined.json().party.members).toContain(savedChar.id);
    expect(joined.json().party.subowners).toContain(2);

    // subowner no recibe joinCode
    const gotAsSubowner = await ctx.app.inject({
      method: "GET", url: `/api/parties/${partyId}`, headers: { cookie: cookieB },
    });
    expect(gotAsSubowner.statusCode).toBe(200);
    expect(gotAsSubowner.json().joinCode).toBeNull();
  });

  it("actualizar inventario de partida", async () => {
    const cookie = await login(ctx.app, owner);
    const created = await ctx.app.inject({
      method: "POST", url: "/api/parties", headers: { cookie }, payload: createPayload,
    });
    const id = created.json().party.id as number;

    const updated = await ctx.app.inject({
      method: "PUT", url: `/api/parties/${id}/inventory`, headers: { cookie },
      payload: {
        items: [{ id: 1, name: "Rope", location: 0, tags: [] }],
        containers: [{ id: 0, name: "Main", slots: 10 }],
      },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().party.items[0].name).toBe("Rope");
  });

  it("joinCode incorrecto devuelve 400", async () => {
    const cookie = await login(ctx.app, owner);
    const res = await ctx.app.inject({
      method: "POST", url: "/api/parties/join", headers: { cookie },
      payload: { joinCode: "WRONG", characterId: 1 },
    });
    expect(res.statusCode).toBe(400);
  });
});
```

- [ ] **Step 3: Ejecutar el test**

Run: `pnpm --filter @kw/server test`
Expected: PASS — todos los tests de partyRoutes en verde.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/interfaces/http/partyRoutes.ts packages/server/src/interfaces/http/partyRoutes.test.ts
git commit -m "feat(server): rutas HTTP de partidas con tests"
```

---

## Task 11: `server/main.ts` — cablear partidas en el composition root

**Files:**
- Modify: `packages/server/src/main.ts`

- [ ] **Step 1: Añadir imports y cableado en `main.ts`**

Añadir al bloque de imports existente de `@kw/core`:

```ts
import {
  // ... (imports existentes mantenidos)
  CreateParty,
  GetParty,
  ListParties,
  UpdateParty,
  DeleteParty,
  JoinParty,
  LeaveParty,
  UpdatePartyInventory,
} from "@kw/core";
```

Añadir import del adaptador y del generador:

```ts
import { PrismaPartyRepository } from "./infrastructure/persistence/prisma/PrismaPartyRepository.js";
import { CryptoIdGenerator } from "./infrastructure/rng/CryptoIdGenerator.js";
import { buildPartyRoutes } from "./interfaces/http/partyRoutes.js";
```

Añadir después de la instanciación de `characters`:

```ts
const parties = new PrismaPartyRepository(prisma);
const idGenerator = new CryptoIdGenerator();

const partyUseCases = {
  list: new ListParties(parties),
  create: new CreateParty(parties, idGenerator),
  get: new GetParty(parties),
  update: new UpdateParty(parties),
  remove: new DeleteParty(parties),
  join: new JoinParty(parties, characters),
  leave: new LeaveParty(parties, characters),
  updateInventory: new UpdatePartyInventory(parties),
};
```

Añadir registro de rutas después del registro de `marketplaceRoutes`:

```ts
await app.register(buildPartyRoutes(partyUseCases), { prefix: "/api/parties" });
```

- [ ] **Step 2: Typecheck del servidor**

Run: `pnpm --filter @kw/server typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/main.ts
git commit -m "feat(server): cablear partidas en composition root"
```

---

## Task 12: `web` — API client, hooks TanStack Query y vistas React de partidas

**Files:**
- Create: `packages/web/src/api/parties.ts`
- Create: `packages/web/src/parties/useParties.ts`
- Create: `packages/web/src/parties/PartyListPage.tsx`
- Create: `packages/web/src/parties/PartyCreatePage.tsx`
- Create: `packages/web/src/parties/PartyViewPage.tsx`
- Create: `packages/web/src/parties/PartyEditPage.tsx`
- Create: `packages/web/src/parties/JoinPartyPage.tsx`
- Modify: `packages/web/src/App.tsx`

- [ ] **Step 1: Crear `packages/web/src/api/parties.ts`**

Sigue el mismo patrón que `api/characters.ts` usando las funciones `getJson`/`send` ya definidas en ese módulo. Las importa para no duplicar la lógica HTTP.

```ts
import type {
  Party,
  CreatePartyInput,
  UpdatePartyInput,
  JoinPartyInput,
  UpdatePartyInventoryInput,
} from "@kw/shared";
import { ApiError } from "./auth.js";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.code ?? "error", data.message ?? "Request failed");
  return data as T;
}

async function send<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.code ?? "error", data.message ?? "Request failed");
  return data as T;
}

export const partiesApi = {
  list: () =>
    getJson<{ parties: Party[] }>("/api/parties").then((d) => d.parties),

  get: (id: number) =>
    getJson<{ party: Party; joinCode: string | null }>(`/api/parties/${id}`),

  create: (input: CreatePartyInput) =>
    send<{ party: Party }>("POST", "/api/parties", input).then((d) => d.party),

  update: (id: number, input: UpdatePartyInput) =>
    send<{ party: Party }>("PATCH", `/api/parties/${id}`, input).then((d) => d.party),

  remove: (id: number) =>
    send<{ ok: true }>("DELETE", `/api/parties/${id}`),

  join: (input: JoinPartyInput) =>
    send<{ party: Party }>("POST", "/api/parties/join", input).then((d) => d.party),

  removeMember: (partyId: number, characterId: number) =>
    send<{ party: Party }>("DELETE", `/api/parties/${partyId}/members/${characterId}`).then((d) => d.party),

  updateInventory: (id: number, input: UpdatePartyInventoryInput) =>
    send<{ party: Party }>("PUT", `/api/parties/${id}/inventory`, input).then((d) => d.party),
};
```

- [ ] **Step 2: Crear `packages/web/src/parties/useParties.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreatePartyInput,
  UpdatePartyInput,
  JoinPartyInput,
  UpdatePartyInventoryInput,
} from "@kw/shared";
import { partiesApi } from "../api/parties.js";

export function useParties() {
  return useQuery({ queryKey: ["parties"], queryFn: partiesApi.list });
}

export function useParty(id: number) {
  return useQuery({
    queryKey: ["parties", id],
    queryFn: () => partiesApi.get(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useCreateParty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePartyInput) => partiesApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parties"] }),
  });
}

export function useUpdateParty(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePartyInput) => partiesApi.update(id, input),
    onSuccess: (party) => {
      qc.setQueryData(["parties", id], { party, joinCode: null });
      qc.invalidateQueries({ queryKey: ["parties"] });
    },
  });
}

export function useDeleteParty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => partiesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parties"] }),
  });
}

export function useJoinParty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: JoinPartyInput) => partiesApi.join(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parties"] }),
  });
}

export function useRemoveMember(partyId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (characterId: number) => partiesApi.removeMember(partyId, characterId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parties", partyId] }),
  });
}

export function useUpdatePartyInventory(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePartyInventoryInput) => partiesApi.updateInventory(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parties", id] }),
  });
}
```

- [ ] **Step 3: Crear `PartyListPage.tsx`**

Paridad con `parties.html`: lista de cartas de partida, botón de nueva partida.

```tsx
import { Link } from "react-router-dom";
import { useParties, useDeleteParty } from "./useParties.js";

export function PartyListPage() {
  const { data: parties, isLoading, error } = useParties();
  const del = useDeleteParty();

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>Failed to load parties.</p>;

  return (
    <div>
      <h1>Parties</h1>
      <p>
        <Link to="/parties/new">+ New party</Link>
        {" · "}
        <Link to="/parties/join">Join by code</Link>
      </p>
      {parties && parties.length === 0 ? (
        <p>No parties yet.</p>
      ) : (
        <ul>
          {parties?.map((p) => (
            <li key={p.id}>
              <Link to={`/parties/${p.id}`}>{p.name}</Link>
              {p.description ? ` — ${p.description}` : ""}
              {" "}
              <button
                onClick={() => del.mutate(p.id)}
                disabled={del.isPending}
                aria-label={`Delete ${p.name}`}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Crear `PartyCreatePage.tsx`**

Paridad con el modal de nueva partida en `parties.html`.

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateParty } from "./useParties.js";

export function PartyCreatePage() {
  const navigate = useNavigate();
  const create = useCreateParty();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const party = await create.mutateAsync({ name, description: description || null, notes: null });
    navigate(`/parties/${party.id}`);
  };

  return (
    <div>
      <h1>New Party</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={64}
          />
        </div>
        <div>
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
          />
        </div>
        <button type="submit" disabled={create.isPending}>
          Create Party
        </button>
        <button type="button" onClick={() => navigate("/parties")}>
          Cancel
        </button>
      </form>
      {create.error && <p>Error: {(create.error as Error).message}</p>}
    </div>
  );
}
```

- [ ] **Step 5: Crear `PartyViewPage.tsx`**

Paridad con `party_view.html`: muestra miembros (resumen de stats) e inventario de grupo. El owner ve el joinCode; los subowners ven la partida pero no el código.

```tsx
import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { useParty } from "./useParties.js";
import { useSession } from "../auth/useSession.js";

export function PartyViewPage() {
  const { id } = useParams<{ id: string }>();
  const partyId = Number(id);
  const { data: session } = useSession();
  const { data, isLoading, error } = useParty(partyId);

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>Party not found or access denied.</p>;
  if (!data) return null;

  const { party, joinCode } = data;
  const isOwner = session?.id === party.ownerId;
  const isSubowner = session?.id !== undefined && party.subowners.includes(session.id);

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

- [ ] **Step 6: Crear `PartyEditPage.tsx`**

Paridad con `party_edit.html`: formulario editable con nombre/descripción, lista de miembros con botón "Remove" (solo owner), e inventario editable.

```tsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useParty, useUpdateParty, useDeleteParty, useRemoveMember } from "./useParties.js";
import { useSession } from "../auth/useSession.js";

export function PartyEditPage() {
  const { id } = useParams<{ id: string }>();
  const partyId = Number(id);
  const navigate = useNavigate();
  const { data: session } = useSession();
  const { data, isLoading, error } = useParty(partyId);
  const update = useUpdateParty(partyId);
  const del = useDeleteParty();
  const removeMember = useRemoveMember(partyId);

  const [name, setName] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null | undefined>(undefined);

  if (isLoading) return <p>Loading…</p>;
  if (error || !data) return <p>Party not found or access denied.</p>;

  const { party } = data;
  const isOwner = session?.id === party.ownerId;
  const isSubowner = session?.id !== undefined && party.subowners.includes(session.id);

  if (!isOwner && !isSubowner) {
    return <p>Access denied.</p>;
  }

  const currentName = name ?? party.name;
  const currentDescription = description !== undefined ? description : party.description;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await update.mutateAsync({ name: currentName, description: currentDescription });
    navigate(`/parties/${partyId}`);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete party "${party.name}"?`)) return;
    await del.mutateAsync(partyId);
    navigate("/parties");
  };

  return (
    <div>
      <form onSubmit={handleSave}>
        <h1>
          <input
            type="text"
            value={currentName}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={64}
          />
        </h1>
        <textarea
          value={currentDescription ?? ""}
          onChange={(e) => setDescription(e.target.value || null)}
          maxLength={2000}
        />
        <div>
          <button type="submit" disabled={update.isPending}>Save</button>
          <button type="button" onClick={() => navigate(`/parties/${partyId}`)}>Cancel</button>
        </div>
      </form>

      <section>
        <h2>Members</h2>
        {party.members.length === 0 ? (
          <p>No members yet.</p>
        ) : (
          <ul>
            {party.members.map((memberId) => (
              <li key={memberId}>
                Character #{memberId}
                {isOwner && (
                  <button
                    onClick={() => removeMember.mutate(memberId)}
                    disabled={removeMember.isPending}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {isOwner && (
        <div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={del.isPending}
          >
            Delete Party
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Crear `JoinPartyPage.tsx`**

Paridad con la funcionalidad de unión por código: formulario con `joinCode` y selección del personaje del usuario.

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useJoinParty } from "./useParties.js";
import { useCharacters } from "../characters/useCharacters.js";

export function JoinPartyPage() {
  const navigate = useNavigate();
  const join = useJoinParty();
  const { data: characters, isLoading } = useCharacters();

  const [joinCode, setJoinCode] = useState("");
  const [characterId, setCharacterId] = useState<number | "">("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!characterId) return;
    const party = await join.mutateAsync({ joinCode, characterId: Number(characterId) });
    navigate(`/parties/${party.id}`);
  };

  if (isLoading) return <p>Loading characters…</p>;

  return (
    <div>
      <h1>Join Party</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Join Code</label>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            required
            placeholder="Enter join code"
          />
        </div>
        <div>
          <label>Character</label>
          <select
            value={characterId}
            onChange={(e) => setCharacterId(e.target.value ? Number(e.target.value) : "")}
            required
          >
            <option value="">Select a character</option>
            {characters?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.background})
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={join.isPending}>
          Join Party
        </button>
        <button type="button" onClick={() => navigate("/parties")}>
          Cancel
        </button>
      </form>
      {join.error && <p>Error: {(join.error as Error).message}</p>}
    </div>
  );
}
```

- [ ] **Step 8: Actualizar `packages/web/src/App.tsx` — añadir rutas de partidas**

Añadir imports:

```tsx
import { PartyListPage } from "./parties/PartyListPage.js";
import { PartyCreatePage } from "./parties/PartyCreatePage.js";
import { PartyViewPage } from "./parties/PartyViewPage.js";
import { PartyEditPage } from "./parties/PartyEditPage.js";
import { JoinPartyPage } from "./parties/JoinPartyPage.js";
```

Añadir dentro de `<Routes>` antes del cierre:

```tsx
<Route path="/parties" element={<PartyListPage />} />
<Route path="/parties/new" element={<PartyCreatePage />} />
<Route path="/parties/join" element={<JoinPartyPage />} />
<Route path="/parties/:id" element={<PartyViewPage />} />
<Route path="/parties/:id/edit" element={<PartyEditPage />} />
```

Y añadir el enlace a partidas en el componente `Home` existente junto a Characters:

```tsx
<Link to="/parties">Parties</Link>
```

- [ ] **Step 9: Typecheck de web**

Run: `pnpm --filter @kw/web typecheck`
Expected: sin errores.

- [ ] **Step 10: Commit**

```bash
git add packages/web/src/api/parties.ts packages/web/src/parties/ packages/web/src/App.tsx
git commit -m "feat(web): vistas React de partidas (lista, creación, vista, edición, join)"
```

---

## Task 13: Verificación final y suite de tests completa

**Files:** ninguno nuevo.

- [ ] **Step 1: Ejecutar todos los tests del monorepo**

Run: `pnpm test`
Expected: PASS en `@kw/core` (todos los tests de party/character/auth/inventory) y `@kw/server` (PrismaPartyRepository + partyRoutes).

- [ ] **Step 2: Typecheck global**

Run: `pnpm typecheck`
Expected: sin errores en ningún paquete.

- [ ] **Step 3: Verificar que el servidor arranca sin errores**

Run: `pnpm --filter @kw/server dev`
Expected: servidor arrancar, log "Server listening on 0.0.0.0:8000", sin errores de imports ni de composition root.
Ctrl+C para parar.

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "chore(fase5): verificación final — todos los tests pasan, typecheck limpio"
```

---

## Self-Review (cobertura del alcance de Fase 5)

### Alcance cubierto

| Funcionalidad | Tasks |
|---|---|
| Esquemas Zod de entrada HTTP para partidas | Task 1 |
| Helpers de test en memoria (InMemoryPartyRepository, FakeIdGenerator) | Task 2 |
| CreateParty con joinCode generado | Task 3 |
| GetParty (auth check, joinCode solo al owner) + ListParties | Task 4 |
| UpdateParty (owner o subowner) + DeleteParty (solo owner) | Task 5 |
| JoinParty por código — añade member + subowner (paridad Flask) | Task 6 |
| LeaveParty — elimina member, quita subowner si no quedan más chars | Task 7 |
| UpdatePartyInventory (items/containers de grupo) | Task 8 |
| CryptoIdGenerator (IdGenerator real) + PrismaPartyRepository + test integración | Task 9 |
| Rutas HTTP /api/parties/* con tests HTTP (Fastify.inject) | Task 10 |
| Cableado en composition root (main.ts) | Task 11 |
| API client web + TanStack Query hooks + 5 vistas React + rutas App | Task 12 |
| Verificación final: pnpm test + typecheck + arranque servidor | Task 13 |

### Ausencia de placeholders

Todos los pasos con código están completamente implementados, sin `TODO`, `TBD` ni `// ...`. Los casos de uso tienen implementación mínima suficiente para pasar los tests definidos en el mismo step.

### Consistencia de tipos/firmas entre tareas

- `Party` de `@kw/shared` (definido en Fase 1) usado en todos los casos de uso, adaptador Prisma, rutas y API cliente sin modificación.
- `PartyRepository` (puerto de Fase 1) implementado por `InMemoryPartyRepository` (Task 2) y `PrismaPartyRepository` (Task 9).
- `IdGenerator` (puerto de Fase 1) implementado por `FakeIdGenerator` (Task 2) y `CryptoIdGenerator` (Task 9).
- `CreatePartyInput`/`UpdatePartyInput`/`JoinPartyInput`/`LeavePartyInput`/`UpdatePartyInventoryInput` definidos en `@kw/shared` (Task 1), usados por routes (Task 10) y API client (Task 12).
- `CharacterRepository` reutilizado en `JoinParty` y `LeaveParty` (Tasks 6, 7) con el mismo `InMemoryCharacterRepository` de fases anteriores.
- Patrón de tests HTTP idéntico al de `characterRoutes.test.ts` (Fase 3): `Fastify.inject + session`.

### Paridad funcional con Flask

- Unión: `add_character_to_party` → `JoinParty.execute` (Task 6): mismo comportamiento de idempotencia y subowners.
- Baja: `remove_character_from_party` → `LeaveParty.execute` (Task 7): misma lógica de "¿quedan otros chars del usuario?".
- Solo el owner ve `joinCode` en `GetParty` (Task 4), igual que en `get_party_data` del blueprint original.
- Solo el owner puede borrar la partida (Task 5), igual que `party_delete` del blueprint.

### Fuera de alcance de Fase 5

- Tiempo real (Socket.IO, salas de partida, tiradas de dados): Fase 6.
- Datos de miembros expandidos (ficha completa en la vista de partida): el front muestra `Character #id` en esta fase; Fase 6 o complemento posterior puede enriquecer con una llamada al API de personajes.
- Eventos de partida (`events: string[]`): el campo existe y se persiste; la lógica de añadir eventos (tiradas de dados) va en Fase 6.

# Fase 4 — Inventario y Marketplace — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portar la gestión de inventario (contenedores, slots, capacidad, armadura, oro) y el marketplace (catálogo, compra) de Kettlewright (Flask) a la arquitectura hexagonal Node.js: reglas puras en `@kw/core`, casos de uso `UpdateInventory`/`TransferItem`/`BuyItems`, adaptador `FileMarketRepository`, rutas `/api/characters/:id/inventory`, `/api/characters/:id/transfer` y `/api/marketplace`, y editor de inventario React con recálculo en vivo reutilizando las funciones puras de `@kw/core`.

**Architecture:** Hexagonal. La lógica de negocio (cálculo de slots por contenedor, capacidad, armadura, resolución de compra) vive en `packages/core` (TS puro, sin Prisma/Fastify). Los casos de uso reciben sus puertos por constructor (`CharacterRepository` ya existe de Fase 1/3; se añade `MarketRepository`). Los adaptadores driven (`FileMarketRepository`) y driving (rutas HTTP Fastify) van en `packages/server`; el cableado se hace a mano en `packages/server/src/main.ts`. Los esquemas/tipos compartidos van en `packages/shared` (Zod). La UI React vive en `packages/web` y reutiliza las funciones puras de `@kw/core` para previsualización inmediata sin ir al servidor.

**Tech Stack:** Node 22, pnpm 11, TypeScript, Zod, Vitest, Fastify 4 (`fastify.inject`), Prisma (SQLite), React 18 + Vite, TanStack Query, React Router. Entorno Windows.

> **Nota de paridad:** las reglas replican *exactamente* el comportamiento del origen Flask (`app/lib/inventory.py`, `app/lib/market.py`, `app/blueprints/marketplace.py`). En particular:
> - `containerSlots` cuenta `bulky`=+2, `petty`=0, resto=+1 (idéntico a `Inventory.container_slots`).
> - La capacidad de un contenedor se considera **llena** cuando `slots ocupados >= container.slots` (`>=`, no `>`), igual que `create_item`/`add_fatigue`.
> - `armorValue` ya existe en Fase 1 (`armor.ts`): suma `1/2/3 Armor` en `location 0`, tope 3. Se reutiliza al guardar inventario (paridad `charedit_save` → `character.armor = armorValue()`).
> - La compra (`Market.buy`) resuelve nombres del carrito contra el catálogo; si la `uses` está en los tags del item de mercado, copia `uses`. El catálogo de origen **no** trae `charges`, así que la rama de charges del original queda inerte (se replica fielmente: solo se copia `uses`).
> - El catálogo es `{ Gear: {...}, Armor: {...}, Weapons: {...} }` donde cada entrada es `{ nombre: { tags, cost, uses? } }` (fichero `data/marketplace.json`, ya copiado del origen).
> Son tests de caracterización: preservar comportamiento, no "mejorarlo".

> **Estado del repo al empezar (Fases 1–3 hechas):** existen `@kw/shared` (con `ItemSchema`, `ContainerSchema`, `CharacterSchema`, `UpdateCharacterInputSchema`), `@kw/core` (dominio `inventory.ts`/`armor.ts`/`hp.ts`, puerto `CharacterRepository`, casos de uso de personaje, testing `InMemoryCharacterRepository`), `@kw/server` (`PrismaCharacterRepository`, `characterRoutes.ts` con guard de sesión, `buildDataRoutes`, composition root en `main.ts`) y `@kw/web` (cliente `charactersApi`, hooks `useCharacter`/`useUpdateCharacter`, páginas de personaje). El plan **reutiliza** esos nombres y firmas reales. `data/marketplace.json` ya está versionado.

---

## Estructura de ficheros (Fase 4)

```
yuuu-cairn/
├─ data/
│  └─ marketplace.json                    # ya copiado del origen (Gear/Armor/Weapons)
├─ packages/
│  ├─ shared/
│  │  └─ src/
│  │     ├─ index.ts                       # + export market/inventoryIo
│  │     └─ schemas/
│  │        ├─ market.ts                   # MarketItem, MarketCatalog
│  │        └─ inventoryIo.ts              # UpdateInventoryInput, TransferItemInput, BuyItemsInput
│  ├─ core/
│  │  └─ src/
│  │     ├─ index.ts                       # + exports nuevos
│  │     ├─ domain/character/
│  │     │  ├─ inventory.ts                # + containerSlots, containerCapacityLeft, isContainerFull
│  │     │  ├─ inventory.test.ts           # + tests de los nuevos helpers
│  │     │  ├─ market.ts                   # resolveBoughtItems (puro)
│  │     │  └─ market.test.ts
│  │     ├─ ports/driven/
│  │     │  └─ MarketRepository.ts         # puerto del catálogo
│  │     ├─ application/inventory/
│  │     │  ├─ UpdateInventory.ts
│  │     │  ├─ UpdateInventory.test.ts
│  │     │  ├─ TransferItem.ts
│  │     │  ├─ TransferItem.test.ts
│  │     │  ├─ BuyItems.ts
│  │     │  ├─ BuyItems.test.ts
│  │     │  ├─ errors.ts
│  │     │  └─ index.ts
│  │     └─ testing/
│  │        └─ FakeMarketRepository.ts
│  ├─ server/
│  │  └─ src/
│  │     ├─ main.ts                        # + cableado inventario/marketplace
│  │     ├─ infrastructure/marketplace/
│  │     │  ├─ FileMarketRepository.ts
│  │     │  └─ FileMarketRepository.test.ts
│  │     └─ interfaces/http/
│  │        ├─ inventoryRoutes.ts          # /api/characters/:id/inventory + /transfer
│  │        ├─ inventoryRoutes.test.ts
│  │        ├─ marketplaceRoutes.ts        # /api/marketplace
│  │        └─ marketplaceRoutes.test.ts
│  └─ web/
│     └─ src/
│        ├─ App.tsx                        # + ruta /characters/:id/inventory
│        ├─ api/
│        │  ├─ inventory.ts                # inventoryApi
│        │  └─ marketplace.ts              # marketplaceApi
│        ├─ inventory/
│        │  ├─ useInventory.ts             # hooks TanStack Query
│        │  ├─ InventoryEditorPage.tsx
│        │  ├─ ContainerView.tsx
│        │  └─ MarketplaceModal.tsx
│        └─ characters/CharacterViewPage.tsx  # + enlace a inventario (Modify)
```

---

## Task 1: `shared` — esquemas Zod de marketplace e I/O de inventario

**Files:**
- Create: `packages/shared/src/schemas/market.ts`
- Create: `packages/shared/src/schemas/inventoryIo.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Crear `packages/shared/src/schemas/market.ts`**

Modela el catálogo del origen (`data/marketplace.json`): mapa `categoría → { nombreItem → { tags, cost, uses? } }`. `MarketItem` es la forma "aplanada" que devuelve la API (paridad `load_market`, que añade `name` y `category`).

```ts
import { z } from "zod";

/** Entrada bruta de un item en el catálogo (sin name/category aún). */
export const MarketCatalogEntrySchema = z
  .object({
    tags: z.array(z.string()).default([]),
    cost: z.number().int(),
    uses: z.number().int().optional(),
    charges: z.number().int().optional(),
    description: z.string().optional(),
  })
  .passthrough();
export type MarketCatalogEntry = z.infer<typeof MarketCatalogEntrySchema>;

/** Catálogo bruto: categoría -> (nombre -> entrada). */
export const MarketCatalogSchema = z.record(
  z.string(),
  z.record(z.string(), MarketCatalogEntrySchema)
);
export type MarketCatalog = z.infer<typeof MarketCatalogSchema>;

/** Item aplanado expuesto por la API (paridad load_market: añade name + category). */
export const MarketItemSchema = z.object({
  name: z.string(),
  category: z.string(),
  cost: z.number().int(),
  tags: z.array(z.string()).default([]),
  uses: z.number().int().optional(),
  charges: z.number().int().optional(),
  description: z.string().optional(),
});
export type MarketItem = z.infer<typeof MarketItemSchema>;
```

- [ ] **Step 2: Crear `packages/shared/src/schemas/inventoryIo.ts`**

Esquemas de entrada de los tres casos de uso. `UpdateInventoryInput` reemplaza items/containers/gold completos (paridad: el editor envía el estado entero). `TransferItemInput` mueve un item a otro personaje. `BuyItemsInput` lleva el carrito (lista de nombres, con repetición por cantidad), el oro resultante y el contenedor destino.

```ts
import { z } from "zod";
import { ItemSchema } from "./item.js";
import { ContainerSchema } from "./container.js";

export const UpdateInventoryInputSchema = z.object({
  items: z.array(ItemSchema),
  containers: z.array(ContainerSchema),
  gold: z.number().int().min(0),
});
export type UpdateInventoryInput = z.infer<typeof UpdateInventoryInputSchema>;

export const TransferItemInputSchema = z.object({
  itemId: z.number().int(),
  toCharacterId: z.number().int(),
});
export type TransferItemInput = z.infer<typeof TransferItemInputSchema>;

export const BuyItemsInputSchema = z.object({
  /** Nombres del carrito; un nombre repetido = comprar varias unidades. */
  cart: z.array(z.string()),
  /** Oro resultante tras la compra (el front ya descontó el coste). */
  gold: z.number().int().min(0),
  /** Contenedor destino donde caen los items comprados. */
  containerId: z.number().int(),
});
export type BuyItemsInput = z.infer<typeof BuyItemsInputSchema>;
```

- [ ] **Step 3: Actualizar `packages/shared/src/index.ts`**

Añadir al final del fichero:

```ts
export * from "./schemas/market.js";
export * from "./schemas/inventoryIo.js";
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @kw/shared typecheck`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/schemas/market.ts packages/shared/src/schemas/inventoryIo.ts packages/shared/src/index.ts
git commit -m "feat(shared): esquemas Zod de marketplace e I/O de inventario"
```

---

## Task 2: `core` — slots por contenedor y capacidad (TDD)

**Files:**
- Modify: `packages/core/src/domain/character/inventory.test.ts`
- Modify: `packages/core/src/domain/character/inventory.ts`

> Reutiliza `itemSlotCost` ya existente. Añade helpers por contenedor arbitrario (no solo el principal), necesarios para marketplace y transferencias: paridad `Inventory.container_slots` y la comprobación de capacidad de `create_item`/`add_fatigue`.

- [ ] **Step 1: Añadir tests al final de `packages/core/src/domain/character/inventory.test.ts`**

```ts
import {
  containerSlots,
  containerCapacityLeft,
  isContainerFull,
} from "./inventory.js";

describe("containerSlots", () => {
  it("suma el coste de los items cuyo location coincide con el contenedor", () => {
    const items = [
      item({ id: 1, location: 3, tags: [] }), // 1
      item({ id: 2, location: 3, tags: ["bulky"] }), // 2
      item({ id: 3, location: 3, tags: ["petty"] }), // 0
      item({ id: 4, location: 0, tags: [] }), // ignorado
    ];
    expect(containerSlots(items, 3)).toBe(3);
  });
  it("contenedor sin items => 0", () => {
    expect(containerSlots([], 3)).toBe(0);
  });
});

describe("containerCapacityLeft", () => {
  it("capacidad libre = slots del contenedor menos ocupados", () => {
    const items = [item({ id: 1, location: 2, tags: [] })]; // 1
    const containers = [{ id: 2, name: "Sack", slots: 6 }];
    expect(containerCapacityLeft(items, containers, 2)).toBe(5);
  });
  it("contenedor inexistente => 0", () => {
    expect(containerCapacityLeft([], [], 9)).toBe(0);
  });
});

describe("isContainerFull", () => {
  it("lleno cuando los slots ocupados alcanzan la capacidad (>=)", () => {
    const items = Array.from({ length: 6 }, (_, i) =>
      item({ id: i + 1, location: 2, tags: [] })
    ); // 6 slots
    const containers = [{ id: 2, name: "Sack", slots: 6 }];
    expect(isContainerFull(items, containers, 2)).toBe(true);
  });
  it("no lleno con hueco", () => {
    const items = [item({ id: 1, location: 2, tags: [] })];
    const containers = [{ id: 2, name: "Sack", slots: 6 }];
    expect(isContainerFull(items, containers, 2)).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/core test`
Expected: FAIL — `containerSlots is not a function` / `containerCapacityLeft is not a function`.

- [ ] **Step 3: Añadir las funciones al final de `packages/core/src/domain/character/inventory.ts`**

```ts
/** Slots ocupados en un contenedor concreto (paridad Inventory.container_slots). */
export function containerSlots(items: Item[], containerId: number): number {
  return items
    .filter((it) => it.location === containerId)
    .reduce((sum, it) => sum + itemSlotCost(it), 0);
}

/** Capacidad libre del contenedor (0 si no existe). */
export function containerCapacityLeft(
  items: Item[],
  containers: Container[],
  containerId: number
): number {
  const container = containers.find((c) => c.id === containerId);
  if (!container) return 0;
  return container.slots - containerSlots(items, containerId);
}

/** Lleno cuando los slots ocupados alcanzan/superan la capacidad (>=). */
export function isContainerFull(
  items: Item[],
  containers: Container[],
  containerId: number
): boolean {
  const container = containers.find((c) => c.id === containerId);
  if (!container) return true;
  return containerSlots(items, containerId) >= container.slots;
}
```

- [ ] **Step 4: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/core test`
Expected: PASS (los nuevos `describe` en verde, sin romper los previos de Fase 1).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/domain/character/inventory.ts packages/core/src/domain/character/inventory.test.ts
git commit -m "feat(core): slots y capacidad por contenedor (containerSlots, isContainerFull)"
```

---

## Task 3: `core` — resolución pura de compra del marketplace (TDD)

**Files:**
- Create: `packages/core/src/domain/character/market.test.ts`
- Create: `packages/core/src/domain/character/market.ts`

> Replica `Market.buy`: dado un catálogo aplanado (`MarketItem[]`) y un carrito (nombres con repetición), resuelve cada nombre a un item de inventario `{ name, tags, location, ... }`. Si `"uses"` está en los tags del item de mercado, copia `uses`; copia `description` si existe. Nombres no encontrados se ignoran (paridad: `continue`). El catálogo de origen no trae `charges`, así que esa rama queda inerte (no se copia charges).

- [ ] **Step 1: Escribir el test que falla `packages/core/src/domain/character/market.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import type { MarketItem } from "@kw/shared";
import { resolveBoughtItems } from "./market.js";

const catalog: MarketItem[] = [
  { name: "Torch", category: "Gear", cost: 5, tags: ["uses"], uses: 3 },
  { name: "Rope", category: "Gear", cost: 10, tags: [], description: "50ft" },
  {
    name: "Chainmail",
    category: "Armor",
    cost: 40,
    tags: ["bulky", "2 Armor"],
  },
];

describe("resolveBoughtItems", () => {
  it("resuelve un nombre simple a un item de inventario (location dada)", () => {
    const result = resolveBoughtItems(["Rope"], catalog, 0);
    expect(result).toEqual([
      {
        name: "Rope",
        tags: [],
        location: 0,
        description: "50ft",
      },
    ]);
  });

  it("copia uses cuando el tag 'uses' está presente", () => {
    const result = resolveBoughtItems(["Torch"], catalog, 2);
    expect(result[0]).toMatchObject({
      name: "Torch",
      tags: ["uses"],
      location: 2,
      uses: 3,
    });
  });

  it("no añade uses si el tag 'uses' no está", () => {
    const result = resolveBoughtItems(["Chainmail"], catalog, 0);
    expect(result[0]).not.toHaveProperty("uses");
    expect(result[0]!.tags).toEqual(["bulky", "2 Armor"]);
  });

  it("repite items por cada aparición en el carrito", () => {
    const result = resolveBoughtItems(["Torch", "Torch"], catalog, 0);
    expect(result).toHaveLength(2);
  });

  it("ignora nombres no presentes en el catálogo", () => {
    const result = resolveBoughtItems(["Ghost", "Rope"], catalog, 0);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("Rope");
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/core test`
Expected: FAIL — "Cannot find module './market.js'".

- [ ] **Step 3: Implementar `packages/core/src/domain/character/market.ts`**

```ts
import type { Item, MarketItem } from "@kw/shared";

/** Item recién comprado, aún sin id (lo asignará la persistencia/caso de uso). */
export type BoughtItem = Omit<Item, "id">;

/**
 * Resuelve un carrito (nombres con repetición) contra el catálogo y produce
 * items de inventario en el contenedor `location`. Paridad Market.buy:
 * - nombre no encontrado => se ignora;
 * - copia tags; copia `uses` solo si el tag "uses" está presente;
 * - copia `description` si existe.
 */
export function resolveBoughtItems(
  cart: string[],
  catalog: MarketItem[],
  location: number
): BoughtItem[] {
  const byName = new Map(catalog.map((it) => [it.name, it]));
  const result: BoughtItem[] = [];
  for (const name of cart) {
    const market = byName.get(name);
    if (!market) continue;
    const tags = market.tags ?? [];
    const item: BoughtItem = { name, tags, location };
    if (tags.includes("uses") && market.uses !== undefined) {
      (item as Record<string, unknown>).uses = market.uses;
    }
    if (market.description !== undefined) {
      (item as Record<string, unknown>).description = market.description;
    }
    result.push(item);
  }
  return result;
}
```

- [ ] **Step 4: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/core test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/domain/character/market.ts packages/core/src/domain/character/market.test.ts
git commit -m "feat(core): resolución pura de compra del marketplace (resolveBoughtItems)"
```

---

## Task 4: `core` — puerto MarketRepository + fake de testing

**Files:**
- Create: `packages/core/src/ports/driven/MarketRepository.ts`
- Create: `packages/core/src/testing/FakeMarketRepository.ts`
- Modify: `packages/core/package.json`

> Puerto driven para el catálogo (lo implementará `FileMarketRepository` en `server`). El fake permite testear casos de uso sin fichero. El `exports` de `@kw/core` lista cada helper de testing por subpath; hay que registrar el nuevo para que `@kw/core/testing/FakeMarketRepository.js` resuelva desde `server`.

- [ ] **Step 1: Crear `packages/core/src/ports/driven/MarketRepository.ts`**

```ts
import type { MarketItem } from "@kw/shared";

export interface MarketRepository {
  /** Catálogo aplanado (paridad load_market). */
  items(): MarketItem[];
  /** Categorías presentes en el catálogo (Gear, Armor, Weapons). */
  categories(): string[];
}
```

- [ ] **Step 2: Crear `packages/core/src/testing/FakeMarketRepository.ts`**

```ts
import type { MarketItem } from "@kw/shared";
import type { MarketRepository } from "../ports/driven/MarketRepository.js";

export class FakeMarketRepository implements MarketRepository {
  constructor(private readonly catalog: MarketItem[] = []) {}

  items(): MarketItem[] {
    return this.catalog;
  }

  categories(): string[] {
    return [...new Set(this.catalog.map((it) => it.category))];
  }
}
```

- [ ] **Step 3: Registrar el subpath del fake en `packages/core/package.json`**

Añadir esta línea dentro de `"exports"`, tras `"./testing/InMemoryCharacterRepository.js": "./src/testing/InMemoryCharacterRepository.ts"` (recuerda añadir la coma a la línea anterior):

```json
    "./testing/FakeMarketRepository.js": "./src/testing/FakeMarketRepository.ts"
```

El bloque `exports` queda así (últimas dos líneas):

```json
    "./testing/InMemoryCharacterRepository.js": "./src/testing/InMemoryCharacterRepository.ts",
    "./testing/FakeMarketRepository.js": "./src/testing/FakeMarketRepository.ts"
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @kw/core typecheck`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/ports/driven/MarketRepository.ts packages/core/src/testing/FakeMarketRepository.ts packages/core/package.json
git commit -m "feat(core): puerto MarketRepository y fake de testing"
```

---

## Task 5: `core` — caso de uso UpdateInventory (TDD)

**Files:**
- Create: `packages/core/src/application/inventory/errors.ts`
- Create: `packages/core/src/application/inventory/UpdateInventory.test.ts`
- Create: `packages/core/src/application/inventory/UpdateInventory.ts`

> Reemplaza items/containers/gold del personaje y **recalcula la armadura** con `armorValue` (paridad `charedit_save`: `character.armor = armorValue()`). Comprueba propiedad (`ownerId`). Reutiliza `CharacterRepository` (Fase 1) y `armorValue` (Fase 1).

- [ ] **Step 1: Crear `packages/core/src/application/inventory/errors.ts`**

```ts
export type InventoryErrorCode = "not_found" | "forbidden" | "invalid_input";

export class InventoryError extends Error {
  constructor(
    public readonly code: InventoryErrorCode,
    message: string
  ) {
    super(message);
    this.name = "InventoryError";
  }
}
```

- [ ] **Step 2: Escribir el test que falla `packages/core/src/application/inventory/UpdateInventory.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import type { Character } from "@kw/shared";
import { InMemoryCharacterRepository } from "../../testing/InMemoryCharacterRepository.js";
import { UpdateInventory } from "./UpdateInventory.js";
import { InventoryError } from "./errors.js";

function baseCharacter(over: Partial<Character> = {}): Character {
  return {
    id: 0,
    ownerId: 1,
    name: "Rune",
    background: "Aurifex",
    strength: 10,
    strengthMax: 10,
    dexterity: 10,
    dexterityMax: 10,
    willpower: 10,
    willpowerMax: 10,
    hp: 6,
    hpMax: 6,
    deprived: false,
    panicked: false,
    gold: 5,
    items: [],
    containers: [{ id: 0, name: "Main", slots: 10 }],
    description: null,
    traits: null,
    notes: null,
    bonds: null,
    scars: null,
    omens: null,
    armor: null,
    imageUrl: null,
    partyId: null,
    ...over,
  };
}

describe("UpdateInventory", () => {
  let repo: InMemoryCharacterRepository;
  let uc: UpdateInventory;
  let charId: number;

  beforeEach(async () => {
    repo = new InMemoryCharacterRepository();
    uc = new UpdateInventory(repo);
    const saved = await repo.save(baseCharacter());
    charId = saved.id;
  });

  it("reemplaza items/containers/gold y recalcula armadura", async () => {
    const result = await uc.execute({
      id: charId,
      ownerId: 1,
      input: {
        gold: 12,
        items: [{ id: 1, name: "Mail", location: 0, tags: ["2 Armor"] }],
        containers: [{ id: 0, name: "Main", slots: 10 }],
      },
    });
    expect(result.gold).toBe(12);
    expect(result.items).toHaveLength(1);
    expect(result.armor).toBe("2"); // armorValue recalculada
  });

  it("topa la armadura en 3", async () => {
    const result = await uc.execute({
      id: charId,
      ownerId: 1,
      input: {
        gold: 0,
        items: [
          { id: 1, name: "A", location: 0, tags: ["2 Armor"] },
          { id: 2, name: "B", location: 0, tags: ["2 Armor"] },
        ],
        containers: [{ id: 0, name: "Main", slots: 10 }],
      },
    });
    expect(result.armor).toBe("3");
  });

  it("falla con not_found si el personaje es de otro dueño", async () => {
    await expect(
      uc.execute({
        id: charId,
        ownerId: 999,
        input: { gold: 0, items: [], containers: [] },
      })
    ).rejects.toBeInstanceOf(InventoryError);
  });
});
```

- [ ] **Step 3: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/core test`
Expected: FAIL — "Cannot find module './UpdateInventory.js'".

- [ ] **Step 4: Implementar `packages/core/src/application/inventory/UpdateInventory.ts`**

```ts
import type { Character, UpdateInventoryInput } from "@kw/shared";
import type { CharacterRepository } from "../../ports/driven/CharacterRepository.js";
import { armorValue } from "../../domain/character/armor.js";
import { InventoryError } from "./errors.js";

export interface UpdateInventoryCommand {
  id: number;
  ownerId: number;
  input: UpdateInventoryInput;
}

export class UpdateInventory {
  constructor(private readonly characters: CharacterRepository) {}

  async execute(cmd: UpdateInventoryCommand): Promise<Character> {
    const current = await this.characters.findById(cmd.id);
    if (!current || current.ownerId !== cmd.ownerId) {
      throw new InventoryError("not_found", "Character not found");
    }
    const next: Character = {
      ...current,
      items: cmd.input.items,
      containers: cmd.input.containers,
      gold: cmd.input.gold,
      armor: String(armorValue(cmd.input.items)),
    };
    return this.characters.save(next);
  }
}
```

- [ ] **Step 5: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/core test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/application/inventory/errors.ts packages/core/src/application/inventory/UpdateInventory.ts packages/core/src/application/inventory/UpdateInventory.test.ts
git commit -m "feat(core): caso de uso UpdateInventory con recálculo de armadura"
```

---

## Task 6: `core` — caso de uso TransferItem (TDD)

**Files:**
- Create: `packages/core/src/application/inventory/TransferItem.test.ts`
- Create: `packages/core/src/application/inventory/TransferItem.ts`

> Mueve un item de un personaje (origen) al contenedor principal (location 0) de otro personaje (destino), reasignando un id único en el destino. Paridad `Inventory.move_item_to_user`: borra del origen, añade al destino. Comprueba propiedad del origen y recalcula la armadura de ambos (al cambiar sus items en `location 0`). El id en destino se calcula como `max(ids)+1` (paridad con la asignación incremental usada en creación).

- [ ] **Step 1: Escribir el test que falla `packages/core/src/application/inventory/TransferItem.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import type { Character } from "@kw/shared";
import { InMemoryCharacterRepository } from "../../testing/InMemoryCharacterRepository.js";
import { TransferItem } from "./TransferItem.js";
import { InventoryError } from "./errors.js";

function baseCharacter(over: Partial<Character> = {}): Character {
  return {
    id: 0,
    ownerId: 1,
    name: "Char",
    background: "Aurifex",
    strength: 10,
    strengthMax: 10,
    dexterity: 10,
    dexterityMax: 10,
    willpower: 10,
    willpowerMax: 10,
    hp: 6,
    hpMax: 6,
    deprived: false,
    panicked: false,
    gold: 0,
    items: [],
    containers: [{ id: 0, name: "Main", slots: 10 }],
    description: null,
    traits: null,
    notes: null,
    bonds: null,
    scars: null,
    omens: null,
    armor: null,
    imageUrl: null,
    partyId: null,
    ...over,
  };
}

describe("TransferItem", () => {
  let repo: InMemoryCharacterRepository;
  let uc: TransferItem;
  let fromId: number;
  let toId: number;

  beforeEach(async () => {
    repo = new InMemoryCharacterRepository();
    uc = new TransferItem(repo);
    const from = await repo.save(
      baseCharacter({
        ownerId: 1,
        items: [{ id: 7, name: "Sword", location: 0, tags: [] }],
      })
    );
    const to = await repo.save(
      baseCharacter({
        ownerId: 2,
        items: [{ id: 3, name: "Shield", location: 0, tags: ["1 Armor"] }],
      })
    );
    fromId = from.id;
    toId = to.id;
  });

  it("mueve el item al contenedor principal del destino con id nuevo", async () => {
    await uc.execute({
      ownerId: 1,
      fromCharacterId: fromId,
      input: { itemId: 7, toCharacterId: toId },
    });

    const from = await repo.findById(fromId);
    const to = await repo.findById(toId);
    expect(from!.items).toHaveLength(0);
    expect(to!.items).toHaveLength(2);
    const moved = to!.items.find((i) => i.name === "Sword")!;
    expect(moved.location).toBe(0);
    expect(moved.id).toBe(4); // max(3)+1
  });

  it("recalcula la armadura del destino si el item movido aporta armadura", async () => {
    await repo.save({
      ...(await repo.findById(fromId))!,
      items: [{ id: 7, name: "Plate", location: 0, tags: ["3 Armor"] }],
    });
    await uc.execute({
      ownerId: 1,
      fromCharacterId: fromId,
      input: { itemId: 7, toCharacterId: toId },
    });
    const to = await repo.findById(toId);
    expect(to!.armor).toBe("3"); // 1 (Shield) + 3 (Plate) topado a 3
  });

  it("falla con not_found si el origen no es del dueño", async () => {
    await expect(
      uc.execute({
        ownerId: 999,
        fromCharacterId: fromId,
        input: { itemId: 7, toCharacterId: toId },
      })
    ).rejects.toBeInstanceOf(InventoryError);
  });

  it("falla con not_found si el item no existe en el origen", async () => {
    await expect(
      uc.execute({
        ownerId: 1,
        fromCharacterId: fromId,
        input: { itemId: 999, toCharacterId: toId },
      })
    ).rejects.toBeInstanceOf(InventoryError);
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/core test`
Expected: FAIL — "Cannot find module './TransferItem.js'".

- [ ] **Step 3: Implementar `packages/core/src/application/inventory/TransferItem.ts`**

```ts
import type { Character, Item, TransferItemInput } from "@kw/shared";
import type { CharacterRepository } from "../../ports/driven/CharacterRepository.js";
import { armorValue } from "../../domain/character/armor.js";
import { InventoryError } from "./errors.js";

export interface TransferItemCommand {
  ownerId: number;
  fromCharacterId: number;
  input: TransferItemInput;
}

function nextItemId(items: Item[]): number {
  return items.reduce((max, it) => (it.id > max ? it.id : max), 0) + 1;
}

export class TransferItem {
  constructor(private readonly characters: CharacterRepository) {}

  async execute(cmd: TransferItemCommand): Promise<void> {
    const from = await this.characters.findById(cmd.fromCharacterId);
    if (!from || from.ownerId !== cmd.ownerId) {
      throw new InventoryError("not_found", "Source character not found");
    }
    const item = from.items.find((it) => it.id === cmd.input.itemId);
    if (!item) {
      throw new InventoryError("not_found", "Item not found");
    }
    const to = await this.characters.findById(cmd.input.toCharacterId);
    if (!to) {
      throw new InventoryError("not_found", "Target character not found");
    }

    const fromItems = from.items.filter((it) => it.id !== item.id);
    const movedItem: Item = { ...item, id: nextItemId(to.items), location: 0 };
    const toItems = [...to.items, movedItem];

    const nextFrom: Character = {
      ...from,
      items: fromItems,
      armor: String(armorValue(fromItems)),
    };
    const nextTo: Character = {
      ...to,
      items: toItems,
      armor: String(armorValue(toItems)),
    };

    await this.characters.save(nextFrom);
    await this.characters.save(nextTo);
  }
}
```

- [ ] **Step 4: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/core test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/application/inventory/TransferItem.ts packages/core/src/application/inventory/TransferItem.test.ts
git commit -m "feat(core): caso de uso TransferItem entre personajes"
```

---

## Task 7: `core` — caso de uso BuyItems (TDD)

**Files:**
- Create: `packages/core/src/application/inventory/BuyItems.test.ts`
- Create: `packages/core/src/application/inventory/BuyItems.ts`

> Paridad `marketplace_buy`: fija `character.gold` al valor enviado, resuelve el carrito con `resolveBoughtItems` (Task 3) hacia el contenedor destino, asigna ids incrementales, los añade a los items del personaje y recalcula armadura. Usa `MarketRepository` (catálogo) + `CharacterRepository`.

- [ ] **Step 1: Escribir el test que falla `packages/core/src/application/inventory/BuyItems.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import type { Character, MarketItem } from "@kw/shared";
import { InMemoryCharacterRepository } from "../../testing/InMemoryCharacterRepository.js";
import { FakeMarketRepository } from "../../testing/FakeMarketRepository.js";
import { BuyItems } from "./BuyItems.js";
import { InventoryError } from "./errors.js";

const catalog: MarketItem[] = [
  { name: "Torch", category: "Gear", cost: 5, tags: ["uses"], uses: 3 },
  { name: "Rope", category: "Gear", cost: 10, tags: [], description: "50ft" },
  { name: "Mail", category: "Armor", cost: 40, tags: ["2 Armor"] },
];

function baseCharacter(over: Partial<Character> = {}): Character {
  return {
    id: 0,
    ownerId: 1,
    name: "Char",
    background: "Aurifex",
    strength: 10,
    strengthMax: 10,
    dexterity: 10,
    dexterityMax: 10,
    willpower: 10,
    willpowerMax: 10,
    hp: 6,
    hpMax: 6,
    deprived: false,
    panicked: false,
    gold: 100,
    items: [],
    containers: [{ id: 0, name: "Main", slots: 10 }],
    description: null,
    traits: null,
    notes: null,
    bonds: null,
    scars: null,
    omens: null,
    armor: null,
    imageUrl: null,
    partyId: null,
    ...over,
  };
}

describe("BuyItems", () => {
  let chars: InMemoryCharacterRepository;
  let market: FakeMarketRepository;
  let uc: BuyItems;
  let charId: number;

  beforeEach(async () => {
    chars = new InMemoryCharacterRepository();
    market = new FakeMarketRepository(catalog);
    uc = new BuyItems(chars, market);
    const saved = await chars.save(baseCharacter());
    charId = saved.id;
  });

  it("añade los items comprados al contenedor y fija el oro", async () => {
    const result = await uc.execute({
      id: charId,
      ownerId: 1,
      input: { cart: ["Torch", "Rope"], gold: 85, containerId: 0 },
    });
    expect(result.gold).toBe(85);
    expect(result.items).toHaveLength(2);
    expect(result.items.map((i) => i.name).sort()).toEqual(["Rope", "Torch"]);
    expect(result.items.every((i) => i.location === 0)).toBe(true);
  });

  it("asigna ids incrementales únicos a los items comprados", async () => {
    await chars.save({
      ...(await chars.findById(charId))!,
      items: [{ id: 5, name: "Existing", location: 0, tags: [] }],
    });
    const result = await uc.execute({
      id: charId,
      ownerId: 1,
      input: { cart: ["Rope"], gold: 90, containerId: 0 },
    });
    const bought = result.items.find((i) => i.name === "Rope")!;
    expect(bought.id).toBe(6); // max(5)+1
  });

  it("recalcula la armadura tras comprar armadura", async () => {
    const result = await uc.execute({
      id: charId,
      ownerId: 1,
      input: { cart: ["Mail"], gold: 60, containerId: 0 },
    });
    expect(result.armor).toBe("2");
  });

  it("falla con not_found si el personaje es de otro dueño", async () => {
    await expect(
      uc.execute({
        id: charId,
        ownerId: 999,
        input: { cart: [], gold: 0, containerId: 0 },
      })
    ).rejects.toBeInstanceOf(InventoryError);
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/core test`
Expected: FAIL — "Cannot find module './BuyItems.js'".

- [ ] **Step 3: Implementar `packages/core/src/application/inventory/BuyItems.ts`**

```ts
import type { Character, Item, BuyItemsInput } from "@kw/shared";
import type { CharacterRepository } from "../../ports/driven/CharacterRepository.js";
import type { MarketRepository } from "../../ports/driven/MarketRepository.js";
import { armorValue } from "../../domain/character/armor.js";
import { resolveBoughtItems } from "../../domain/character/market.js";
import { InventoryError } from "./errors.js";

export interface BuyItemsCommand {
  id: number;
  ownerId: number;
  input: BuyItemsInput;
}

function nextItemId(items: Item[]): number {
  return items.reduce((max, it) => (it.id > max ? it.id : max), 0) + 1;
}

export class BuyItems {
  constructor(
    private readonly characters: CharacterRepository,
    private readonly market: MarketRepository
  ) {}

  async execute(cmd: BuyItemsCommand): Promise<Character> {
    const current = await this.characters.findById(cmd.id);
    if (!current || current.ownerId !== cmd.ownerId) {
      throw new InventoryError("not_found", "Character not found");
    }

    const bought = resolveBoughtItems(
      cmd.input.cart,
      this.market.items(),
      cmd.input.containerId
    );

    const items = [...current.items];
    let id = nextItemId(items);
    for (const b of bought) {
      items.push({ ...b, id } as Item);
      id += 1;
    }

    const next: Character = {
      ...current,
      gold: cmd.input.gold,
      items,
      armor: String(armorValue(items)),
    };
    return this.characters.save(next);
  }
}
```

- [ ] **Step 4: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/core test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/application/inventory/BuyItems.ts packages/core/src/application/inventory/BuyItems.test.ts
git commit -m "feat(core): caso de uso BuyItems (compra en el marketplace)"
```

---

## Task 8: `core` — barrel de inventario y exports del núcleo

**Files:**
- Create: `packages/core/src/application/inventory/index.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Crear `packages/core/src/application/inventory/index.ts`**

```ts
export { InventoryError } from "./errors.js";
export type { InventoryErrorCode } from "./errors.js";
export { UpdateInventory } from "./UpdateInventory.js";
export type { UpdateInventoryCommand } from "./UpdateInventory.js";
export { TransferItem } from "./TransferItem.js";
export type { TransferItemCommand } from "./TransferItem.js";
export { BuyItems } from "./BuyItems.js";
export type { BuyItemsCommand } from "./BuyItems.js";
```

- [ ] **Step 2: Añadir exports al final de `packages/core/src/index.ts`**

```ts
// Inventory/Marketplace — dominio puro
export * from "./domain/character/market.js";

// Inventory/Marketplace — puerto
export type { MarketRepository } from "./ports/driven/MarketRepository.js";

// Inventory/Marketplace — casos de uso
export * from "./application/inventory/index.js";
```

> Nota: `containerSlots`, `containerCapacityLeft`, `isContainerFull` (Task 2) ya se exportan vía la línea `export * from "./domain/character/inventory.js";` existente al inicio de `index.ts`.

- [ ] **Step 3: Typecheck y tests del core**

Run: `pnpm --filter @kw/core typecheck && pnpm --filter @kw/core test`
Expected: typecheck sin errores; todos los tests en verde (inventario, market, UpdateInventory, TransferItem, BuyItems + los previos de Fases 1–3).

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/application/inventory/index.ts packages/core/src/index.ts
git commit -m "feat(core): barrel de casos de uso de inventario y exports del núcleo"
```

---

## Task 9: `server` — adaptador FileMarketRepository (TDD)

**Files:**
- Create: `packages/server/src/infrastructure/marketplace/FileMarketRepository.test.ts`
- Create: `packages/server/src/infrastructure/marketplace/FileMarketRepository.ts`

> Implementa `MarketRepository` leyendo `data/marketplace.json` (catálogo crudo `categoría → nombre → entrada`) y aplanándolo a `MarketItem[]` (paridad `load_market`: añade `name` y `category`). Valida con `MarketCatalogSchema`. Cachea tras la primera lectura, como `FileGameDataRepository`.

- [ ] **Step 1: Escribir el test que falla `packages/server/src/infrastructure/marketplace/FileMarketRepository.test.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FileMarketRepository } from "./FileMarketRepository.js";

let dataDir: string;

const catalog = {
  Gear: {
    Torch: { tags: ["uses"], uses: 3, cost: 5 },
    Rope: { tags: [], cost: 10 },
  },
  Armor: {
    Mail: { tags: ["2 Armor"], cost: 40 },
  },
};

beforeAll(() => {
  dataDir = mkdtempSync(join(tmpdir(), "kw-market-"));
  writeFileSync(join(dataDir, "marketplace.json"), JSON.stringify(catalog));
});

afterAll(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

describe("FileMarketRepository", () => {
  it("aplana el catálogo a MarketItem[] con name y category", () => {
    const repo = new FileMarketRepository(dataDir);
    const items = repo.items();
    expect(items).toHaveLength(3);
    const torch = items.find((i) => i.name === "Torch")!;
    expect(torch.category).toBe("Gear");
    expect(torch.cost).toBe(5);
    expect(torch.tags).toEqual(["uses"]);
    expect(torch.uses).toBe(3);
  });

  it("expone las categorías presentes", () => {
    const repo = new FileMarketRepository(dataDir);
    expect(repo.categories().sort()).toEqual(["Armor", "Gear"]);
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/server test FileMarketRepository`
Expected: FAIL — "Cannot find module './FileMarketRepository.js'".

- [ ] **Step 3: Implementar `packages/server/src/infrastructure/marketplace/FileMarketRepository.ts`**

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MarketCatalogSchema, type MarketItem } from "@kw/shared";
import type { MarketRepository } from "@kw/core";

export class FileMarketRepository implements MarketRepository {
  private _items: MarketItem[] | null = null;

  constructor(private readonly dataDir: string) {}

  private load(): MarketItem[] {
    if (this._items) return this._items;
    const raw = JSON.parse(
      readFileSync(join(this.dataDir, "marketplace.json"), "utf8")
    );
    const catalog = MarketCatalogSchema.parse(raw);
    const items: MarketItem[] = [];
    for (const [category, entries] of Object.entries(catalog)) {
      for (const [name, entry] of Object.entries(entries)) {
        items.push({ ...entry, name, category });
      }
    }
    this._items = items;
    return items;
  }

  items(): MarketItem[] {
    return this.load();
  }

  categories(): string[] {
    return [...new Set(this.load().map((it) => it.category))];
  }
}
```

- [ ] **Step 4: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/server test FileMarketRepository`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/infrastructure/marketplace/FileMarketRepository.ts packages/server/src/infrastructure/marketplace/FileMarketRepository.test.ts
git commit -m "feat(server): FileMarketRepository (aplana data/marketplace.json)"
```

---

## Task 10: `server` — rutas HTTP de inventario (TDD)

**Files:**
- Create: `packages/server/src/interfaces/http/inventoryRoutes.test.ts`
- Create: `packages/server/src/interfaces/http/inventoryRoutes.ts`

> Rutas montadas bajo `/api/characters` (mismo prefijo que `characterRoutes`, pero plugin propio para no tocar el existente): `PUT /:id/inventory` (UpdateInventory) y `POST /:id/transfer` (TransferItem). Guard de sesión idéntico a `characterRoutes`. Validación Zod en el borde.

- [ ] **Step 1: Escribir el test que falla `packages/server/src/interfaces/http/inventoryRoutes.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import session from "@fastify/session";
import { UpdateInventory, TransferItem } from "@kw/core";
import { InMemoryCharacterRepository } from "@kw/core/testing/InMemoryCharacterRepository.js";
import type { Character, SessionUser } from "@kw/shared";
import { buildInventoryRoutes } from "./inventoryRoutes.js";

function baseCharacter(over: Partial<Character> = {}): Character {
  return {
    id: 0,
    ownerId: 1,
    name: "Char",
    background: "Aurifex",
    strength: 10,
    strengthMax: 10,
    dexterity: 10,
    dexterityMax: 10,
    willpower: 10,
    willpowerMax: 10,
    hp: 6,
    hpMax: 6,
    deprived: false,
    panicked: false,
    gold: 50,
    items: [],
    containers: [{ id: 0, name: "Main", slots: 10 }],
    description: null,
    traits: null,
    notes: null,
    bonds: null,
    scars: null,
    omens: null,
    armor: null,
    imageUrl: null,
    partyId: null,
    ...over,
  };
}

async function buildApp() {
  const characters = new InMemoryCharacterRepository();
  const uc = {
    updateInventory: new UpdateInventory(characters),
    transferItem: new TransferItem(characters),
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
  await app.register(buildInventoryRoutes(uc), { prefix: "/api/characters" });
  await app.ready();
  return { app, characters };
}

async function login(app: FastifyInstance, user: SessionUser): Promise<string> {
  const res = await app.inject({ method: "POST", url: "/test-login", payload: user });
  const setCookie = res.headers["set-cookie"];
  return Array.isArray(setCookie) ? setCookie[0]! : (setCookie as string);
}

const owner: SessionUser = { id: 1, username: "owner", email: "o@e.com" };

describe("inventory routes", () => {
  let ctx: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    ctx = await buildApp();
  });

  it("rechaza sin sesión con 401", async () => {
    const res = await ctx.app.inject({
      method: "PUT",
      url: "/api/characters/1/inventory",
      payload: { items: [], containers: [], gold: 0 },
    });
    expect(res.statusCode).toBe(401);
  });

  it("PUT /:id/inventory actualiza items, oro y armadura", async () => {
    const saved = await ctx.characters.save(baseCharacter());
    const cookie = await login(ctx.app, owner);
    const res = await ctx.app.inject({
      method: "PUT",
      url: `/api/characters/${saved.id}/inventory`,
      headers: { cookie },
      payload: {
        gold: 30,
        containers: [{ id: 0, name: "Main", slots: 10 }],
        items: [{ id: 1, name: "Mail", location: 0, tags: ["2 Armor"] }],
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().character.gold).toBe(30);
    expect(res.json().character.armor).toBe("2");
  });

  it("POST /:id/transfer mueve un item a otro personaje", async () => {
    const from = await ctx.characters.save(
      baseCharacter({
        ownerId: 1,
        items: [{ id: 7, name: "Sword", location: 0, tags: [] }],
      })
    );
    const to = await ctx.characters.save(baseCharacter({ ownerId: 2, items: [] }));
    const cookie = await login(ctx.app, owner);
    const res = await ctx.app.inject({
      method: "POST",
      url: `/api/characters/${from.id}/transfer`,
      headers: { cookie },
      payload: { itemId: 7, toCharacterId: to.id },
    });
    expect(res.statusCode).toBe(200);
    const target = await ctx.characters.findById(to.id);
    expect(target!.items.map((i) => i.name)).toContain("Sword");
  });

  it("404 al actualizar inventario de personaje ajeno", async () => {
    const saved = await ctx.characters.save(baseCharacter({ ownerId: 2 }));
    const cookie = await login(ctx.app, owner);
    const res = await ctx.app.inject({
      method: "PUT",
      url: `/api/characters/${saved.id}/inventory`,
      headers: { cookie },
      payload: { items: [], containers: [], gold: 0 },
    });
    expect(res.statusCode).toBe(404);
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/server test inventoryRoutes`
Expected: FAIL — "Cannot find module './inventoryRoutes.js'".

- [ ] **Step 3: Implementar `packages/server/src/interfaces/http/inventoryRoutes.ts`**

```ts
import type { FastifyPluginAsync } from "fastify";
import "@fastify/session";
import {
  InventoryError,
  type UpdateInventory,
  type TransferItem,
} from "@kw/core";
import {
  UpdateInventoryInputSchema,
  TransferItemInputSchema,
} from "@kw/shared";
import { z } from "zod";

export interface InventoryUseCases {
  updateInventory: UpdateInventory;
  transferItem: TransferItem;
}

const ParamsSchema = z.object({ id: z.coerce.number().int() });

function statusFor(code: string): number {
  switch (code) {
    case "not_found":
      return 404;
    case "forbidden":
      return 403;
    default:
      return 400;
  }
}

export function buildInventoryRoutes(uc: InventoryUseCases): FastifyPluginAsync {
  const plugin: FastifyPluginAsync = async (app) => {
    app.setErrorHandler((err, _req, reply) => {
      if (err instanceof InventoryError) {
        return reply
          .status(statusFor(err.code))
          .send({ code: err.code, message: err.message });
      }
      if ((err as { validation?: unknown }).validation) {
        return reply
          .status(400)
          .send({ code: "invalid_input", message: err.message });
      }
      app.log.error(err);
      return reply.status(500).send({ code: "internal", message: "Internal error" });
    });

    app.addHook("preHandler", async (req, reply) => {
      if (!req.session.user) {
        return reply
          .status(401)
          .send({ code: "unauthenticated", message: "Not logged in" });
      }
    });

    app.put("/:id/inventory", async (req, reply) => {
      const { id } = ParamsSchema.parse(req.params);
      const input = UpdateInventoryInputSchema.parse(req.body);
      const character = await uc.updateInventory.execute({
        id,
        ownerId: req.session.user!.id,
        input,
      });
      return reply.send({ character });
    });

    app.post("/:id/transfer", async (req, reply) => {
      const { id } = ParamsSchema.parse(req.params);
      const input = TransferItemInputSchema.parse(req.body);
      await uc.transferItem.execute({
        ownerId: req.session.user!.id,
        fromCharacterId: id,
        input,
      });
      return reply.send({ ok: true });
    });
  };
  return plugin;
}
```

- [ ] **Step 4: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/server test inventoryRoutes`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/interfaces/http/inventoryRoutes.ts packages/server/src/interfaces/http/inventoryRoutes.test.ts
git commit -m "feat(server): rutas /api/characters/:id/inventory y /transfer"
```

---

## Task 11: `server` — rutas HTTP del marketplace (TDD)

**Files:**
- Create: `packages/server/src/interfaces/http/marketplaceRoutes.test.ts`
- Create: `packages/server/src/interfaces/http/marketplaceRoutes.ts`

> `GET /api/marketplace` devuelve catálogo + categorías (paridad `marketplace_show`). `POST /api/marketplace/:characterId/buy` ejecuta `BuyItems` (paridad `marketplace_buy`). Guard de sesión.

- [ ] **Step 1: Escribir el test que falla `packages/server/src/interfaces/http/marketplaceRoutes.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import session from "@fastify/session";
import { BuyItems } from "@kw/core";
import { InMemoryCharacterRepository } from "@kw/core/testing/InMemoryCharacterRepository.js";
import { FakeMarketRepository } from "@kw/core/testing/FakeMarketRepository.js";
import type { Character, MarketItem, SessionUser } from "@kw/shared";
import { buildMarketplaceRoutes } from "./marketplaceRoutes.js";

const catalog: MarketItem[] = [
  { name: "Torch", category: "Gear", cost: 5, tags: ["uses"], uses: 3 },
  { name: "Mail", category: "Armor", cost: 40, tags: ["2 Armor"] },
];

function baseCharacter(over: Partial<Character> = {}): Character {
  return {
    id: 0,
    ownerId: 1,
    name: "Char",
    background: "Aurifex",
    strength: 10,
    strengthMax: 10,
    dexterity: 10,
    dexterityMax: 10,
    willpower: 10,
    willpowerMax: 10,
    hp: 6,
    hpMax: 6,
    deprived: false,
    panicked: false,
    gold: 100,
    items: [],
    containers: [{ id: 0, name: "Main", slots: 10 }],
    description: null,
    traits: null,
    notes: null,
    bonds: null,
    scars: null,
    omens: null,
    armor: null,
    imageUrl: null,
    partyId: null,
    ...over,
  };
}

async function buildApp() {
  const characters = new InMemoryCharacterRepository();
  const market = new FakeMarketRepository(catalog);
  const uc = { buyItems: new BuyItems(characters, market) };
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
  await app.register(buildMarketplaceRoutes(market, uc), {
    prefix: "/api/marketplace",
  });
  await app.ready();
  return { app, characters };
}

async function login(app: FastifyInstance, user: SessionUser): Promise<string> {
  const res = await app.inject({ method: "POST", url: "/test-login", payload: user });
  const setCookie = res.headers["set-cookie"];
  return Array.isArray(setCookie) ? setCookie[0]! : (setCookie as string);
}

const owner: SessionUser = { id: 1, username: "owner", email: "o@e.com" };

describe("marketplace routes", () => {
  let ctx: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    ctx = await buildApp();
  });

  it("rechaza sin sesión con 401", async () => {
    const res = await ctx.app.inject({ method: "GET", url: "/api/marketplace" });
    expect(res.statusCode).toBe(401);
  });

  it("GET / devuelve catálogo y categorías", async () => {
    const cookie = await login(ctx.app, owner);
    const res = await ctx.app.inject({
      method: "GET",
      url: "/api/marketplace",
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().items).toHaveLength(2);
    expect(res.json().categories.sort()).toEqual(["Armor", "Gear"]);
  });

  it("POST /:characterId/buy compra items y fija el oro", async () => {
    const saved = await ctx.characters.save(baseCharacter());
    const cookie = await login(ctx.app, owner);
    const res = await ctx.app.inject({
      method: "POST",
      url: `/api/marketplace/${saved.id}/buy`,
      headers: { cookie },
      payload: { cart: ["Torch", "Mail"], gold: 55, containerId: 0 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().character.gold).toBe(55);
    expect(res.json().character.items).toHaveLength(2);
    expect(res.json().character.armor).toBe("2");
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/server test marketplaceRoutes`
Expected: FAIL — "Cannot find module './marketplaceRoutes.js'".

- [ ] **Step 3: Implementar `packages/server/src/interfaces/http/marketplaceRoutes.ts`**

```ts
import type { FastifyPluginAsync } from "fastify";
import "@fastify/session";
import { InventoryError, type BuyItems, type MarketRepository } from "@kw/core";
import { BuyItemsInputSchema } from "@kw/shared";
import { z } from "zod";

export interface MarketplaceUseCases {
  buyItems: BuyItems;
}

const ParamsSchema = z.object({ characterId: z.coerce.number().int() });

function statusFor(code: string): number {
  switch (code) {
    case "not_found":
      return 404;
    case "forbidden":
      return 403;
    default:
      return 400;
  }
}

export function buildMarketplaceRoutes(
  market: MarketRepository,
  uc: MarketplaceUseCases
): FastifyPluginAsync {
  const plugin: FastifyPluginAsync = async (app) => {
    app.setErrorHandler((err, _req, reply) => {
      if (err instanceof InventoryError) {
        return reply
          .status(statusFor(err.code))
          .send({ code: err.code, message: err.message });
      }
      if ((err as { validation?: unknown }).validation) {
        return reply
          .status(400)
          .send({ code: "invalid_input", message: err.message });
      }
      app.log.error(err);
      return reply.status(500).send({ code: "internal", message: "Internal error" });
    });

    app.addHook("preHandler", async (req, reply) => {
      if (!req.session.user) {
        return reply
          .status(401)
          .send({ code: "unauthenticated", message: "Not logged in" });
      }
    });

    app.get("/", async (_req, reply) =>
      reply.send({ items: market.items(), categories: market.categories() })
    );

    app.post("/:characterId/buy", async (req, reply) => {
      const { characterId } = ParamsSchema.parse(req.params);
      const input = BuyItemsInputSchema.parse(req.body);
      const character = await uc.buyItems.execute({
        id: characterId,
        ownerId: req.session.user!.id,
        input,
      });
      return reply.send({ character });
    });
  };
  return plugin;
}
```

- [ ] **Step 4: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/server test marketplaceRoutes`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/interfaces/http/marketplaceRoutes.ts packages/server/src/interfaces/http/marketplaceRoutes.test.ts
git commit -m "feat(server): rutas /api/marketplace (catálogo + compra)"
```

---

## Task 12: `server` — cablear inventario y marketplace en el composition root

**Files:**
- Modify: `packages/server/src/main.ts`

> Instancia `FileMarketRepository`, los casos de uso `UpdateInventory`/`TransferItem`/`BuyItems` (reusando `characters` ya existente) y registra los dos plugins. Las rutas de inventario comparten prefijo `/api/characters` con `buildCharacterRoutes` (plugins distintos, sin colisión de rutas).

- [ ] **Step 1: Añadir imports en `packages/server/src/main.ts`**

Tras la línea `import { buildDataRoutes } from "./interfaces/http/dataRoutes.js";` añadir:

```ts
import { FileMarketRepository } from "./infrastructure/marketplace/FileMarketRepository.js";
import { buildInventoryRoutes } from "./interfaces/http/inventoryRoutes.js";
import { buildMarketplaceRoutes } from "./interfaces/http/marketplaceRoutes.js";
```

- [ ] **Step 2: Añadir casos de uso al import de `@kw/core`**

En el bloque `import { ... } from "@kw/core";`, añadir tras `RollCharacter,`:

```ts
  UpdateInventory,
  TransferItem,
  BuyItems,
```

- [ ] **Step 3: Instanciar el adaptador de mercado y los casos de uso**

Tras el bloque `const characterUseCases = { ... };` (justo antes de `// ---- casos de uso (inyección por constructor) ----`) añadir:

```ts
  // ---- adaptador y casos de uso de inventario/marketplace ----
  const market = new FileMarketRepository(dataDir);

  const inventoryUseCases = {
    updateInventory: new UpdateInventory(characters),
    transferItem: new TransferItem(characters),
  };
  const marketplaceUseCases = {
    buyItems: new BuyItems(characters, market),
  };
```

- [ ] **Step 4: Registrar los plugins de rutas**

Tras la línea `await app.register(buildDataRoutes(gameData), { prefix: "/api/data" });` añadir:

```ts
  await app.register(buildInventoryRoutes(inventoryUseCases), {
    prefix: "/api/characters",
  });
  await app.register(buildMarketplaceRoutes(market, marketplaceUseCases), {
    prefix: "/api/marketplace",
  });
```

- [ ] **Step 5: Typecheck y tests del server**

Run: `pnpm --filter @kw/server typecheck && pnpm --filter @kw/server test`
Expected: typecheck sin errores; tests en verde (auth, character, data, FileMarketRepository, inventoryRoutes, marketplaceRoutes).

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/main.ts
git commit -m "feat(server): cablear inventario y marketplace en el composition root"
```

---

## Task 13: `web` — clientes de API y hooks de inventario/marketplace

**Files:**
- Modify: `packages/web/package.json`
- Create: `packages/web/src/api/inventory.ts`
- Create: `packages/web/src/api/marketplace.ts`
- Create: `packages/web/src/inventory/useInventory.ts`

> Reutiliza el patrón `getJson`/`send` y `ApiError` ya usados en `api/characters.ts` y `api/auth.ts`. Los hooks usan TanStack Query e invalidan la query `["characters", id]`. Las Tasks 14 y 16 importan funciones puras **en runtime** desde `@kw/core` (`containerSlots`, `isContainerFull`, `armorValue`, `occupiedMainSlots`), así que `@kw/web` debe declarar `@kw/core` como dependencia (hasta ahora solo dependía de `@kw/shared`).

- [ ] **Step 1: Añadir `@kw/core` como dependencia en `packages/web/package.json`**

En el bloque `"dependencies"`, añadir antes de `"@kw/shared": "workspace:*",`:

```json
    "@kw/core": "workspace:*",
```

Luego instalar:

Run: `pnpm install`
Expected: enlaza `@kw/core` en `@kw/web` sin errores.

- [ ] **Step 2: Crear `packages/web/src/api/inventory.ts`**

```ts
import type {
  Character,
  UpdateInventoryInput,
  TransferItemInput,
} from "@kw/shared";
import { ApiError } from "./auth.js";

async function send<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.code ?? "error", data.message ?? "Request failed");
  }
  return data as T;
}

export const inventoryApi = {
  update: (id: number, input: UpdateInventoryInput) =>
    send<{ character: Character }>(
      "PUT",
      `/api/characters/${id}/inventory`,
      input
    ).then((d) => d.character),
  transfer: (id: number, input: TransferItemInput) =>
    send<{ ok: true }>("POST", `/api/characters/${id}/transfer`, input),
};
```

- [ ] **Step 3: Crear `packages/web/src/api/marketplace.ts`**

```ts
import type { Character, MarketItem, BuyItemsInput } from "@kw/shared";
import { ApiError } from "./auth.js";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.code ?? "error", data.message ?? "Request failed");
  }
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
  if (!res.ok) {
    throw new ApiError(data.code ?? "error", data.message ?? "Request failed");
  }
  return data as T;
}

export const marketplaceApi = {
  catalog: () =>
    getJson<{ items: MarketItem[]; categories: string[] }>("/api/marketplace"),
  buy: (characterId: number, input: BuyItemsInput) =>
    send<{ character: Character }>(
      "POST",
      `/api/marketplace/${characterId}/buy`,
      input
    ).then((d) => d.character),
};
```

- [ ] **Step 4: Crear `packages/web/src/inventory/useInventory.ts`**

```ts
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  Character,
  UpdateInventoryInput,
  TransferItemInput,
  BuyItemsInput,
} from "@kw/shared";
import { inventoryApi } from "../api/inventory.js";
import { marketplaceApi } from "../api/marketplace.js";

export function useUpdateInventory(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateInventoryInput) => inventoryApi.update(id, input),
    onSuccess: (character: Character) => {
      qc.setQueryData(["characters", id], character);
      qc.invalidateQueries({ queryKey: ["characters"] });
    },
  });
}

export function useTransferItem(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TransferItemInput) => inventoryApi.transfer(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["characters"] });
    },
  });
}

export function useMarketCatalog() {
  return useQuery({
    queryKey: ["marketplace"],
    queryFn: marketplaceApi.catalog,
  });
}

export function useBuyItems(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BuyItemsInput) => marketplaceApi.buy(id, input),
    onSuccess: (character: Character) => {
      qc.setQueryData(["characters", id], character);
      qc.invalidateQueries({ queryKey: ["characters"] });
    },
  });
}
```

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @kw/web typecheck`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add packages/web/package.json pnpm-lock.yaml packages/web/src/api/inventory.ts packages/web/src/api/marketplace.ts packages/web/src/inventory/useInventory.ts
git commit -m "feat(web): clientes de API y hooks de inventario/marketplace"
```

---

## Task 14: `web` — vista de contenedor con recálculo en vivo

**Files:**
- Create: `packages/web/src/inventory/ContainerView.tsx`

> Componente puro de presentación: dado un contenedor y los items, calcula los slots ocupados con `containerSlots` de `@kw/core` (reutilización de la función pura, sin ir al servidor) y muestra `nombre (ocupados/slots)`, marcando "encumbered" cuando está lleno. Paridad `Inventory.decorate` (título `name (curr/slots)` + flag encumbered con `>=`).

- [ ] **Step 1: Crear `packages/web/src/inventory/ContainerView.tsx`**

```tsx
import type { Item, Container } from "@kw/shared";
import { containerSlots, isContainerFull } from "@kw/core";

interface ContainerViewProps {
  container: Container;
  items: Item[];
  containers: Container[];
  onDeleteItem: (itemId: number) => void;
}

export function ContainerView({
  container,
  items,
  containers,
  onDeleteItem,
}: ContainerViewProps) {
  const used = containerSlots(items, container.id);
  const full = isContainerFull(items, containers, container.id);
  const containerItems = items.filter((it) => it.location === container.id);

  return (
    <section className={full ? "container encumbered" : "container"}>
      <h3>
        {container.name} ({used}/{container.slots})
      </h3>
      <ul>
        {containerItems.map((it) => (
          <li key={it.id}>
            {it.name}
            {it.tags.length > 0 ? ` (${it.tags.join(", ")})` : ""}{" "}
            <button type="button" onClick={() => onDeleteItem(it.id)}>
              ×
            </button>
          </li>
        ))}
        {containerItems.length === 0 && <li className="empty">—</li>}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @kw/web typecheck`
Expected: sin errores (importa `containerSlots`/`isContainerFull` de `@kw/core`).

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/inventory/ContainerView.tsx
git commit -m "feat(web): ContainerView con recálculo de slots en vivo desde @kw/core"
```

---

## Task 15: `web` — modal de marketplace con carrito y oro en vivo

**Files:**
- Create: `packages/web/src/inventory/MarketplaceModal.tsx`

> Paridad `marketplace.js`: lista el catálogo, permite +/- por item, descuenta el oro en vivo (bloquea si no alcanza), arma el carrito (nombres con repetición) y al guardar llama a `useBuyItems` con `{ cart, gold, containerId }`. El recálculo del oro es local (no va al servidor hasta confirmar).

- [ ] **Step 1: Crear `packages/web/src/inventory/MarketplaceModal.tsx`**

```tsx
import { useMemo, useState } from "react";
import type { MarketItem } from "@kw/shared";
import { useMarketCatalog, useBuyItems } from "./useInventory.js";

interface MarketplaceModalProps {
  characterId: number;
  initialGold: number;
  containerId: number;
  onClose: () => void;
}

export function MarketplaceModal({
  characterId,
  initialGold,
  containerId,
  onClose,
}: MarketplaceModalProps) {
  const { data, isLoading } = useMarketCatalog();
  const buy = useBuyItems(characterId);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const itemsByName = useMemo(() => {
    const map = new Map<string, MarketItem>();
    for (const it of data?.items ?? []) map.set(it.name, it);
    return map;
  }, [data]);

  const spent = useMemo(
    () =>
      Object.entries(quantities).reduce((sum, [name, qty]) => {
        const it = itemsByName.get(name);
        return sum + (it ? it.cost * qty : 0);
      }, 0),
    [quantities, itemsByName]
  );
  const remainingGold = initialGold - spent;

  function changeQty(name: string, delta: number) {
    setError(null);
    const it = itemsByName.get(name);
    if (!it) return;
    if (delta > 0 && remainingGold < it.cost) {
      setError(`Not enough gold for ${name}`);
      return;
    }
    setQuantities((q) => {
      const next = Math.max(0, (q[name] ?? 0) + delta);
      return { ...q, [name]: next };
    });
  }

  function buildCart(): string[] {
    const cart: string[] = [];
    for (const [name, qty] of Object.entries(quantities)) {
      for (let i = 0; i < qty; i++) cart.push(name);
    }
    return cart;
  }

  async function handleBuy() {
    await buy.mutateAsync({
      cart: buildCart(),
      gold: remainingGold,
      containerId,
    });
    onClose();
  }

  if (isLoading) return <div className="modal">Loading marketplace…</div>;

  return (
    <div className="modal marketplace-modal">
      <header>
        <h2>Marketplace</h2>
        <span className="gold-display">Gold: {remainingGold}</span>
      </header>
      {error && <p className="error">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Cost</th>
            <th>Type</th>
            <th>Qty</th>
          </tr>
        </thead>
        <tbody>
          {(data?.items ?? []).map((it) => (
            <tr key={`${it.category}:${it.name}`}>
              <td>
                {it.name}
                {it.tags.length > 0 ? ` (${it.tags.join(", ")})` : ""}
              </td>
              <td>{it.cost}</td>
              <td>{it.category}</td>
              <td>
                <button type="button" onClick={() => changeQty(it.name, -1)}>
                  -
                </button>
                <span>{quantities[it.name] ?? 0}</span>
                <button type="button" onClick={() => changeQty(it.name, 1)}>
                  +
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <footer>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        <button type="button" onClick={handleBuy} disabled={buy.isPending}>
          Buy
        </button>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @kw/web typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/inventory/MarketplaceModal.tsx
git commit -m "feat(web): modal de marketplace con carrito y oro en vivo"
```

---

## Task 16: `web` — página editor de inventario y routing

**Files:**
- Create: `packages/web/src/inventory/InventoryEditorPage.tsx`
- Modify: `packages/web/src/App.tsx`
- Modify: `packages/web/src/characters/CharacterViewPage.tsx`

> Junta todo: carga el personaje con `useCharacter`, mantiene estado local de items/containers/gold, muestra `ContainerView` por contenedor (recálculo en vivo), permite abrir el `MarketplaceModal`, y guarda con `useUpdateInventory`. Añade la ruta `/characters/:id/inventory` y un enlace desde la vista de personaje.

- [ ] **Step 1: Crear `packages/web/src/inventory/InventoryEditorPage.tsx`**

```tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import type { Item, Container } from "@kw/shared";
import { armorValue, occupiedMainSlots } from "@kw/core";
import { useCharacter } from "../characters/useCharacters.js";
import { useUpdateInventory } from "./useInventory.js";
import { ContainerView } from "./ContainerView.js";
import { MarketplaceModal } from "./MarketplaceModal.js";

export function InventoryEditorPage() {
  const { id } = useParams();
  const characterId = Number(id);
  const navigate = useNavigate();
  const { data: character, isLoading } = useCharacter(characterId);
  const update = useUpdateInventory(characterId);

  const [items, setItems] = useState<Item[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [gold, setGold] = useState(0);
  const [showMarket, setShowMarket] = useState(false);

  useEffect(() => {
    if (character) {
      setItems(character.items);
      setContainers(character.containers);
      setGold(character.gold);
    }
  }, [character]);

  const liveArmor = useMemo(() => armorValue(items), [items]);
  const mainSlots = useMemo(() => occupiedMainSlots(items), [items]);

  function deleteItem(itemId: number) {
    setItems((prev) => prev.filter((it) => it.id !== itemId));
  }

  async function handleSave() {
    await update.mutateAsync({ items, containers, gold });
    navigate(`/characters/${characterId}`);
  }

  if (isLoading || !character) return <p>Loading…</p>;

  return (
    <div className="inventory-editor">
      <h1>Inventory — {character.name}</h1>
      <p>
        <Link to={`/characters/${characterId}`}>← Back</Link>
      </p>

      <div className="inventory-summary">
        <label>
          Gold:{" "}
          <input
            type="number"
            min={0}
            value={gold}
            onChange={(e) => setGold(Math.max(0, Number(e.target.value)))}
          />
        </label>
        <span>Armor: {liveArmor}</span>
        <span>Main slots: {mainSlots}</span>
      </div>

      <button type="button" onClick={() => setShowMarket(true)}>
        Open Marketplace
      </button>

      {containers.map((c) => (
        <ContainerView
          key={c.id}
          container={c}
          items={items}
          containers={containers}
          onDeleteItem={deleteItem}
        />
      ))}

      <button type="button" onClick={handleSave} disabled={update.isPending}>
        Save inventory
      </button>

      {showMarket && (
        <MarketplaceModal
          characterId={characterId}
          initialGold={gold}
          containerId={0}
          onClose={() => setShowMarket(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Registrar la ruta en `packages/web/src/App.tsx`**

Añadir el import junto a los demás de characters/create:

```tsx
import { InventoryEditorPage } from "./inventory/InventoryEditorPage.js";
```

Y añadir la ruta tras `<Route path="/characters/:id/edit" element={<CharacterEditPage />} />`:

```tsx
      <Route
        path="/characters/:id/inventory"
        element={<InventoryEditorPage />}
      />
```

- [ ] **Step 3: Añadir enlace en `packages/web/src/characters/CharacterViewPage.tsx`**

El bloque de enlaces existente es:

```tsx
      <p>
        <Link to="/characters">← Back</Link> ·{" "}
        <Link to={`/characters/${character.id}/edit`}>Edit</Link>
      </p>
```

Sustitúyelo por (añadiendo el enlace a inventario, reutilizando `character.id` ya disponible):

```tsx
      <p>
        <Link to="/characters">← Back</Link> ·{" "}
        <Link to={`/characters/${character.id}/edit`}>Edit</Link> ·{" "}
        <Link to={`/characters/${character.id}/inventory`}>Inventory</Link>
      </p>
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @kw/web typecheck`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/inventory/InventoryEditorPage.tsx packages/web/src/App.tsx packages/web/src/characters/CharacterViewPage.tsx
git commit -m "feat(web): página editor de inventario con recálculo en vivo y routing"
```

---

## Task 17: Verificación final de la Fase 4

**Files:**
- (sin cambios de código; verificación de todo el monorepo)

- [ ] **Step 1: Tests de todo el monorepo**

Run: `pnpm test`
Expected: PASS en `@kw/core` (inventario, market, UpdateInventory, TransferItem, BuyItems + previos) y `@kw/server` (FileMarketRepository, inventoryRoutes, marketplaceRoutes + previos).

- [ ] **Step 2: Typecheck global**

Run: `pnpm typecheck`
Expected: sin errores en ningún paquete.

- [ ] **Step 3: Arranque end-to-end manual (opcional pero recomendado)**

Run (terminal 1): `pnpm --filter @kw/server dev`
Run (terminal 2): `pnpm --filter @kw/web dev`
Abrir `http://127.0.0.1:5173`, iniciar sesión, abrir un personaje → "Inventory": comprobar que los slots/armadura se recalculan en vivo, abrir el marketplace, comprar un item dentro del presupuesto y guardar. Parar ambos (Ctrl+C).

- [ ] **Step 4: Commit de cierre (si quedara algo sin commitear)**

```bash
git add -A
git commit -m "chore: verificación de Fase 4 (inventario y marketplace)" || echo "nada que commitear"
```

---

## Self-Review (cobertura del spec)

**Cobertura del alcance de la Fase 4:**
- **Gestión de contenedores y objetos, slots** → Task 2 (`containerSlots`, `containerCapacityLeft`, `isContainerFull`), reutilizando `itemSlotCost`/`occupiedMainSlots` de Fase 1.
- **Armadura** → reutiliza `armorValue` (Fase 1); recalculada en `UpdateInventory` (Task 5), `TransferItem` (Task 6) y `BuyItems` (Task 7), paridad `charedit_save`.
- **Oro** → `UpdateInventoryInput.gold` (Task 1), fijado en `UpdateInventory` y `BuyItems`.
- **Transferencia de objetos entre personajes** → `TransferItem` (Task 6) + ruta `/transfer` (Task 10), paridad `move_item_to_user`.
- **Compra en el marketplace** → dominio `resolveBoughtItems` (Task 3), puerto `MarketRepository` (Task 4), caso de uso `BuyItems` (Task 7), adaptador `FileMarketRepository` (Task 9), rutas `/api/marketplace` (Task 11), paridad `Market.buy`/`marketplace_buy`.
- **Casos de uso sobre reglas puras de core** → Tasks 5–7 (todos reciben puertos por constructor; lógica pura en `domain/`).
- **Rutas `/api/characters/:id/inventory` y `/api/marketplace`** → Tasks 10, 11; cableado en composition root (Task 12).
- **UI React del editor con recálculo en vivo reutilizando funciones puras de core** → Tasks 14–16 (`ContainerView` usa `containerSlots`/`isContainerFull`; `InventoryEditorPage` usa `armorValue`/`occupiedMainSlots`, todo desde `@kw/core`).

**Ausencia de placeholders:** todos los steps que tocan código incluyen el código completo (sin TODO/TBD). Los `Run:`/`Expected:` y commits están en cada tarea.

**Consistencia de tipos/firmas entre tareas:**
- `MarketItem`/`MarketCatalog`/`UpdateInventoryInput`/`TransferItemInput`/`BuyItemsInput` (Task 1) se consumen idénticos en core (Tasks 3,5,6,7), server (Tasks 9,10,11) y web (Task 13).
- `MarketRepository` (Task 4) lo implementa `FakeMarketRepository` (Task 4) y `FileMarketRepository` (Task 9); lo consumen `BuyItems` (Task 7) y `buildMarketplaceRoutes` (Task 11).
- `InventoryError` (Task 5) se lanza en los 3 casos de uso y se mapea a HTTP en las rutas (Tasks 10,11) con el mismo `statusFor`.
- Los casos de uso reutilizan `CharacterRepository` (Fase 1) y `armorValue` (Fase 1) sin redefinirlos.
- `resolveBoughtItems` devuelve `BoughtItem` (= `Omit<Item,"id">`); `BuyItems` le asigna ids incrementales antes de construir `Item`, consistente con `nextItemId` también usado en `TransferItem`.
- Las firmas de los plugins (`buildInventoryRoutes(uc)`, `buildMarketplaceRoutes(market, uc)`) coinciden entre su test, su implementación y el cableado en `main.ts` (Task 12).

**Decisiones / desviaciones respecto al origen:**
- Los ids de item son numéricos incrementales (consistente con `assignItemIds` de Fase 3), no uuid hex como el Flask original; `nextItemId = max(id)+1`. Esto preserva el comportamiento observable (ids únicos crecientes) sin la dependencia de uuid.
- `UpdateInventory` reemplaza el estado completo de inventario (el editor envía items/containers/gold enteros), en lugar de las múltiples micro-rutas HTMX del origen (`add_fatigue`, `move_items`, `update_container`…). Las mutaciones granulares se resuelven en el cliente (estado local) y se persisten en una sola llamada, manteniendo paridad funcional del resultado.
- La rama de `charges` de `Market.buy` queda inerte porque el catálogo de origen no contiene `charges` (replicado fielmente: solo se copia `uses`).
- `TransferItem` cubre el caso "mover a otro personaje" (`move_item_to_user`). El inventario de grupo de partida (`move_item_to_party`) pertenece a la Fase 5 (Partidas) y queda fuera de alcance aquí.

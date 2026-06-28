# Fase 1 — Andamiaje hexagonal y port de reglas de juego — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Montar el monorepo hexagonal (core/shared/server/web) arrancando, con la lógica de juego pura de Cairn portada a `core` y cubierta por tests, Prisma con el esquema de BD, y un composition root mínimo.

**Architecture:** Monorepo pnpm con cuatro paquetes. `core` (dominio + casos de uso + puertos, TS puro, cero infra) y `shared` (esquemas Zod + tipos) forman el hexágono. `server` (Fastify + Prisma + composition root) y `web` (React + Vite) son adaptadores que dependen hacia dentro. Esta fase entrega el esqueleto y las reglas de inventario/armadura/HP/sobrecarga con tests; no incluye persistencia real ni endpoints de negocio (van en fases posteriores).

**Tech Stack:** Node 20+, pnpm workspaces, TypeScript, Zod, Vitest, Fastify, Prisma (SQLite), React, Vite.

> **Nota de paridad:** las reglas de juego replican *exactamente* el comportamiento del origen Flask (`app/models/character.py`, `app/lib/inventory.py`). En particular `effectiveHp` usa el literal `10` (no la capacidad del contenedor principal), igual que el original. Son tests de caracterización: preservar comportamiento, no "mejorarlo".

---

## Estructura de ficheros (Fase 1)

```
yuuu-cairn/
├─ package.json                         # root: workspaces + scripts
├─ pnpm-workspace.yaml
├─ tsconfig.base.json                   # config TS compartida
├─ .gitignore
├─ .nvmrc
├─ packages/
│  ├─ shared/
│  │  ├─ package.json
│  │  ├─ tsconfig.json
│  │  └─ src/
│  │     ├─ index.ts
│  │     └─ schemas/
│  │        ├─ item.ts                  # ItemSchema, Item
│  │        ├─ container.ts             # ContainerSchema, Container
│  │        ├─ character.ts             # CharacterSchema, Character
│  │        └─ party.ts                 # PartySchema, Party
│  ├─ core/
│  │  ├─ package.json
│  │  ├─ tsconfig.json
│  │  ├─ vitest.config.ts
│  │  └─ src/
│  │     ├─ index.ts
│  │     ├─ domain/
│  │     │  └─ character/
│  │     │     ├─ inventory.ts          # itemSlotCost, occupiedMainSlots, mainContainerSlots, isOverburdened
│  │     │     ├─ inventory.test.ts
│  │     │     ├─ armor.ts              # armorValue
│  │     │     ├─ armor.test.ts
│  │     │     ├─ hp.ts                 # effectiveHp
│  │     │     └─ hp.test.ts
│  │     └─ ports/
│  │        └─ driven/
│  │           ├─ CharacterRepository.ts
│  │           ├─ PartyRepository.ts
│  │           ├─ UserRepository.ts
│  │           ├─ PasswordHasher.ts
│  │           ├─ Mailer.ts
│  │           ├─ EventPublisher.ts
│  │           ├─ Clock.ts
│  │           └─ IdGenerator.ts
│  ├─ server/
│  │  ├─ package.json
│  │  ├─ tsconfig.json
│  │  ├─ prisma/
│  │  │  └─ schema.prisma               # User, Character, Party
│  │  └─ src/
│  │     ├─ main.ts                     # composition root + arranque Fastify
│  │     └─ infrastructure/
│  │        └─ config/
│  │           └─ env.ts                # carga/validación de env con Zod
│  └─ web/
│     ├─ package.json
│     ├─ tsconfig.json
│     ├─ vite.config.ts
│     ├─ index.html
│     └─ src/
│        ├─ main.tsx
│        └─ App.tsx
└─ data/                                # JSON de juego copiados del origen (fase posterior los consume)
```

---

## Task 1: Inicializar el monorepo pnpm

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.nvmrc`

- [ ] **Step 1: Crear `.nvmrc`**

```
20
```

- [ ] **Step 2: Crear `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
```

- [ ] **Step 3: Crear `package.json` raíz**

```json
{
  "name": "yuuu-cairn",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "dev": "pnpm --filter @kw/server --filter @kw/web --parallel dev"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 4: Crear `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "resolveJsonModule": true
  }
}
```

- [ ] **Step 5: Crear `.gitignore`**

```
node_modules/
dist/
*.tsbuildinfo
.env
packages/server/prisma/*.sqlite
packages/server/prisma/dev.db*
.DS_Store
```

- [ ] **Step 6: Instalar y verificar**

Run: `pnpm install`
Expected: instala sin error, crea `pnpm-lock.yaml`.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .gitignore .nvmrc pnpm-lock.yaml
git commit -m "chore: inicializar monorepo pnpm con workspaces"
```

---

## Task 2: Paquete `shared` — esquemas Zod de Item y Container

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/schemas/item.ts`
- Create: `packages/shared/src/schemas/container.ts`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: Crear `packages/shared/package.json`**

```json
{
  "name": "@kw/shared",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "^3.23.8"
  }
}
```

- [ ] **Step 2: Crear `packages/shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Crear `packages/shared/src/schemas/item.ts`**

Estructura tomada del origen (`inventoryData.js`): un item tiene `id`, `name`, `location` (id del contenedor; `0` = principal), `tags` (array de strings; los especiales son `"petty"`, `"bulky"`, `"1 Armor"`, `"2 Armor"`, `"3 Armor"`). Otros campos reales (uses, description, carrying, carried_by...) se permiten con `passthrough` para no romper en esta fase.

```ts
import { z } from "zod";

export const ItemSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    location: z.number().int(), // id del contenedor; 0 = contenedor principal
    tags: z.array(z.string()).default([]),
  })
  .passthrough();

export type Item = z.infer<typeof ItemSchema>;
```

- [ ] **Step 4: Crear `packages/shared/src/schemas/container.ts`**

El contenedor principal del origen es `{ name: "Main", slots: 10, id: 0 }`.

```ts
import { z } from "zod";

export const ContainerSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    slots: z.number().int(),
  })
  .passthrough();

export type Container = z.infer<typeof ContainerSchema>;
```

- [ ] **Step 5: Crear `packages/shared/src/index.ts`**

```ts
export * from "./schemas/item.js";
export * from "./schemas/container.js";
```

- [ ] **Step 6: Instalar deps del workspace**

Run: `pnpm install`
Expected: enlaza `zod` en `shared`.

- [ ] **Step 7: Typecheck**

Run: `pnpm --filter @kw/shared typecheck`
Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
git add packages/shared pnpm-lock.yaml
git commit -m "feat(shared): esquemas Zod de Item y Container"
```

---

## Task 3: Paquete `core` — setup + reglas de slots de inventario (TDD)

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/vitest.config.ts`
- Create: `packages/core/src/domain/character/inventory.test.ts`
- Create: `packages/core/src/domain/character/inventory.ts`

- [ ] **Step 1: Crear `packages/core/package.json`**

```json
{
  "name": "@kw/core",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@kw/shared": "workspace:*",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Crear `packages/core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Crear `packages/core/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Escribir el test que falla `packages/core/src/domain/character/inventory.test.ts`**

Reglas del origen (`Character.occupiedMainSlots`): solo cuentan los items con `location === 0`; entre esos, `petty` cuenta 0, `bulky` cuenta 2, el resto 1.

```ts
import { describe, it, expect } from "vitest";
import type { Item } from "@kw/shared";
import { itemSlotCost, occupiedMainSlots } from "./inventory.js";

const item = (over: Partial<Item>): Item => ({
  id: 1,
  name: "x",
  location: 0,
  tags: [],
  ...over,
});

describe("itemSlotCost", () => {
  it("un item normal ocupa 1 slot", () => {
    expect(itemSlotCost(item({ tags: [] }))).toBe(1);
  });
  it("un item bulky ocupa 2 slots", () => {
    expect(itemSlotCost(item({ tags: ["bulky"] }))).toBe(2);
  });
  it("un item petty ocupa 0 slots", () => {
    expect(itemSlotCost(item({ tags: ["petty"] }))).toBe(0);
  });
  it("petty tiene prioridad sobre bulky (0 slots)", () => {
    expect(itemSlotCost(item({ tags: ["petty", "bulky"] }))).toBe(0);
  });
});

describe("occupiedMainSlots", () => {
  it("solo cuenta items en el contenedor principal (location 0)", () => {
    const items = [
      item({ id: 1, location: 0, tags: [] }), // 1
      item({ id: 2, location: 5, tags: [] }), // ignorado
      item({ id: 3, location: 0, tags: ["bulky"] }), // 2
      item({ id: 4, location: 0, tags: ["petty"] }), // 0
    ];
    expect(occupiedMainSlots(items)).toBe(3);
  });
  it("lista vacía => 0", () => {
    expect(occupiedMainSlots([])).toBe(0);
  });
});
```

- [ ] **Step 5: Ejecutar el test para verque falla**

Run: `pnpm --filter @kw/core test`
Expected: FAIL — "Cannot find module './inventory.js'" / `itemSlotCost is not a function`.

- [ ] **Step 6: Implementar `packages/core/src/domain/character/inventory.ts`**

```ts
import type { Item, Container } from "@kw/shared";

/** Coste en slots de un item: petty=0, bulky=2, resto=1. */
export function itemSlotCost(item: Item): number {
  if (item.tags.includes("petty")) return 0;
  if (item.tags.includes("bulky")) return 2;
  return 1;
}

/** Slots ocupados en el contenedor principal (location === 0). */
export function occupiedMainSlots(items: Item[]): number {
  return items
    .filter((it) => it.location === 0)
    .reduce((sum, it) => sum + itemSlotCost(it), 0);
}

/** Capacidad del contenedor principal (id === 0); 10 por defecto. */
export function mainContainerSlots(containers: Container[]): number {
  const main = containers.find((c) => c.id === 0);
  return main ? main.slots : 10;
}

/** Sobrecargado si los slots ocupados alcanzan/superan la capacidad principal. */
export function isOverburdened(items: Item[], containers: Container[]): boolean {
  return occupiedMainSlots(items) >= mainContainerSlots(containers);
}
```

- [ ] **Step 7: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/core test`
Expected: PASS (6 tests verdes de los 2 describe creados).

- [ ] **Step 8: Commit**

```bash
git add packages/core pnpm-lock.yaml
git commit -m "feat(core): reglas de slots de inventario (itemSlotCost, occupiedMainSlots)"
```

---

## Task 4: `core` — regla de sobrecarga (isOverburdened, TDD)

**Files:**
- Modify: `packages/core/src/domain/character/inventory.test.ts`
- Test: la implementación ya existe en `inventory.ts` (Task 3); aquí se añade su cobertura.

- [ ] **Step 1: Añadir tests al final de `inventory.test.ts`**

Regla del origen (`Character.overburdened`): capacidad por defecto 10, o `slots` del contenedor con `id === 0`; sobrecargado si `occupiedMainSlots >= capacidad`.

```ts
import {
  mainContainerSlots,
  isOverburdened,
} from "./inventory.js";

const mainContainer = (slots: number) => ({ id: 0, name: "Main", slots });

describe("mainContainerSlots", () => {
  it("usa los slots del contenedor con id 0", () => {
    expect(mainContainerSlots([mainContainer(8)])).toBe(8);
  });
  it("sin contenedor principal => 10 por defecto", () => {
    expect(mainContainerSlots([{ id: 3, name: "Sack", slots: 6 }])).toBe(10);
  });
});

describe("isOverburdened", () => {
  it("no sobrecargado con menos slots que la capacidad", () => {
    const items = [item({ id: 1, location: 0 }), item({ id: 2, location: 0 })]; // 2 slots
    expect(isOverburdened(items, [mainContainer(10)])).toBe(false);
  });
  it("sobrecargado al alcanzar la capacidad", () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      item({ id: i + 1, location: 0 })
    ); // 10 slots
    expect(isOverburdened(items, [mainContainer(10)])).toBe(true);
  });
});
```

- [ ] **Step 2: Ejecutar tests**

Run: `pnpm --filter @kw/core test`
Expected: PASS (los nuevos describe en verde; la implementación ya existía).

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/domain/character/inventory.test.ts
git commit -m "test(core): cobertura de capacidad y sobrecarga del contenedor principal"
```

---

## Task 5: `core` — valor de armadura (armorValue, TDD)

**Files:**
- Create: `packages/core/src/domain/character/armor.test.ts`
- Create: `packages/core/src/domain/character/armor.ts`

- [ ] **Step 1: Escribir el test que falla `armor.test.ts`**

Regla del origen (`Character.armorValue`): solo items en `location === 0` con tags; suma `"1 Armor"`=+1, `"2 Armor"`=+2, `"3 Armor"`=+3; tope total 3.

```ts
import { describe, it, expect } from "vitest";
import type { Item } from "@kw/shared";
import { armorValue } from "./armor.js";

const item = (over: Partial<Item>): Item => ({
  id: 1,
  name: "x",
  location: 0,
  tags: [],
  ...over,
});

describe("armorValue", () => {
  it("sin items => 0", () => {
    expect(armorValue([])).toBe(0);
  });
  it("suma el valor de armadura de los tags", () => {
    expect(armorValue([item({ tags: ["1 Armor"] })])).toBe(1);
    expect(armorValue([item({ tags: ["2 Armor"] })])).toBe(2);
  });
  it("ignora items fuera del contenedor principal", () => {
    expect(armorValue([item({ location: 4, tags: ["2 Armor"] })])).toBe(0);
  });
  it("ignora items sin tags", () => {
    expect(armorValue([item({ tags: [] })])).toBe(0);
  });
  it("acumula varios items con tope en 3", () => {
    const items = [
      item({ id: 1, tags: ["2 Armor"] }),
      item({ id: 2, tags: ["2 Armor"] }),
    ];
    expect(armorValue(items)).toBe(3);
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/core test`
Expected: FAIL — "Cannot find module './armor.js'".

- [ ] **Step 3: Implementar `packages/core/src/domain/character/armor.ts`**

```ts
import type { Item } from "@kw/shared";

/** Valor de armadura: suma de tags de armadura en el contenedor principal, tope 3. */
export function armorValue(items: Item[]): number {
  let armor = 0;
  for (const it of items) {
    if (it.location !== 0) continue;
    if (!it.tags || it.tags.length === 0) continue;
    if (it.tags.includes("1 Armor")) armor += 1;
    if (it.tags.includes("2 Armor")) armor += 2;
    if (it.tags.includes("3 Armor")) armor += 3;
  }
  return Math.min(armor, 3);
}
```

- [ ] **Step 4: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/core test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/domain/character/armor.ts packages/core/src/domain/character/armor.test.ts
git commit -m "feat(core): cálculo de valor de armadura"
```

---

## Task 6: `core` — HP efectivo (effectiveHp, TDD)

**Files:**
- Create: `packages/core/src/domain/character/hp.test.ts`
- Create: `packages/core/src/domain/character/hp.ts`

- [ ] **Step 1: Escribir el test que falla `hp.test.ts`**

Regla del origen (`Character.hpValue`): el HP efectivo es 0 si `occupiedMainSlots() >= 10` (literal 10, no la capacidad del contenedor) o si `panicked`; en caso contrario el HP actual. Devuelve actual y máximo.

```ts
import { describe, it, expect } from "vitest";
import type { Item } from "@kw/shared";
import { effectiveHp } from "./hp.js";

const item = (over: Partial<Item>): Item => ({
  id: 1,
  name: "x",
  location: 0,
  tags: [],
  ...over,
});

describe("effectiveHp", () => {
  it("devuelve hp y hpMax cuando no hay penalización", () => {
    expect(effectiveHp({ hp: 4, hpMax: 6, panicked: false, items: [] })).toEqual({
      hp: 4,
      hpMax: 6,
    });
  });
  it("hp efectivo 0 si está en pánico", () => {
    expect(effectiveHp({ hp: 4, hpMax: 6, panicked: true, items: [] })).toEqual({
      hp: 0,
      hpMax: 6,
    });
  });
  it("hp efectivo 0 si ocupa 10 o más slots principales", () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      item({ id: i + 1, location: 0 })
    );
    expect(effectiveHp({ hp: 5, hpMax: 5, panicked: false, items }).hp).toBe(0);
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/core test`
Expected: FAIL — "Cannot find module './hp.js'".

- [ ] **Step 3: Implementar `packages/core/src/domain/character/hp.ts`**

```ts
import type { Item } from "@kw/shared";
import { occupiedMainSlots } from "./inventory.js";

export interface EffectiveHpInput {
  hp: number;
  hpMax: number;
  panicked: boolean;
  items: Item[];
}

export interface EffectiveHp {
  hp: number;
  hpMax: number;
}

/** HP efectivo: 0 si ocupa >=10 slots principales o está en pánico (paridad con el origen). */
export function effectiveHp(input: EffectiveHpInput): EffectiveHp {
  let hp = input.hp;
  if (occupiedMainSlots(input.items) >= 10 || input.panicked) {
    hp = 0;
  }
  return { hp, hpMax: input.hpMax };
}
```

- [ ] **Step 4: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/core test`
Expected: PASS.

- [ ] **Step 5: Crear el barrel `packages/core/src/index.ts`**

```ts
export * from "./domain/character/inventory.js";
export * from "./domain/character/armor.js";
export * from "./domain/character/hp.js";
```

- [ ] **Step 6: Typecheck del core**

Run: `pnpm --filter @kw/core typecheck`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/domain/character/hp.ts packages/core/src/domain/character/hp.test.ts packages/core/src/index.ts
git commit -m "feat(core): HP efectivo y barrel de exports del dominio"
```

---

## Task 7: `core` — puertos (interfaces) del hexágono

**Files:**
- Create: `packages/shared/src/schemas/character.ts`
- Create: `packages/shared/src/schemas/party.ts`
- Modify: `packages/shared/src/index.ts`
- Create: `packages/core/src/ports/driven/CharacterRepository.ts`
- Create: `packages/core/src/ports/driven/PartyRepository.ts`
- Create: `packages/core/src/ports/driven/UserRepository.ts`
- Create: `packages/core/src/ports/driven/PasswordHasher.ts`
- Create: `packages/core/src/ports/driven/Mailer.ts`
- Create: `packages/core/src/ports/driven/EventPublisher.ts`
- Create: `packages/core/src/ports/driven/Clock.ts`
- Create: `packages/core/src/ports/driven/IdGenerator.ts`

> Estos puertos son **contratos vacíos** que las fases posteriores implementarán y los casos de uso consumirán. No llevan tests propios (son interfaces). Se definen ahora para fijar la frontera del hexágono.

- [ ] **Step 1: Crear `packages/shared/src/schemas/character.ts`**

Campos tomados de `app/models/character.py`. Los campos complejos son arrays validados; el resto, escalares.

```ts
import { z } from "zod";
import { ItemSchema } from "./item.js";
import { ContainerSchema } from "./container.js";

export const CharacterSchema = z.object({
  id: z.number().int(),
  ownerId: z.number().int(),
  name: z.string(),
  background: z.string(),
  strength: z.number().int(),
  strengthMax: z.number().int(),
  dexterity: z.number().int(),
  dexterityMax: z.number().int(),
  willpower: z.number().int(),
  willpowerMax: z.number().int(),
  hp: z.number().int(),
  hpMax: z.number().int(),
  deprived: z.boolean(),
  panicked: z.boolean(),
  gold: z.number().int(),
  items: z.array(ItemSchema),
  containers: z.array(ContainerSchema),
  description: z.string().nullable(),
  traits: z.string().nullable(),
  notes: z.string().nullable(),
  bonds: z.string().nullable(),
  scars: z.string().nullable(),
  omens: z.string().nullable(),
  armor: z.string().nullable(),
  imageUrl: z.string().nullable(),
  partyId: z.number().int().nullable(),
});

export type Character = z.infer<typeof CharacterSchema>;
```

- [ ] **Step 2: Crear `packages/shared/src/schemas/party.ts`**

Campos tomados de `app/models/party.py`.

```ts
import { z } from "zod";
import { ItemSchema } from "./item.js";
import { ContainerSchema } from "./container.js";

export const PartySchema = z.object({
  id: z.number().int(),
  ownerId: z.number().int(),
  name: z.string(),
  description: z.string().nullable(),
  notes: z.string().nullable(),
  members: z.array(z.number().int()),
  subowners: z.array(z.number().int()),
  joinCode: z.string(),
  items: z.array(ItemSchema),
  containers: z.array(ContainerSchema),
  events: z.array(z.string()),
  version: z.number().int(),
});

export type Party = z.infer<typeof PartySchema>;
```

- [ ] **Step 3: Actualizar `packages/shared/src/index.ts`**

```ts
export * from "./schemas/item.js";
export * from "./schemas/container.js";
export * from "./schemas/character.js";
export * from "./schemas/party.js";
```

- [ ] **Step 4: Crear `packages/core/src/ports/driven/CharacterRepository.ts`**

```ts
import type { Character } from "@kw/shared";

export interface CharacterRepository {
  findById(id: number): Promise<Character | null>;
  findByOwner(ownerId: number): Promise<Character[]>;
  save(character: Character): Promise<Character>;
  delete(id: number): Promise<void>;
}
```

- [ ] **Step 5: Crear `packages/core/src/ports/driven/PartyRepository.ts`**

```ts
import type { Party } from "@kw/shared";

export interface PartyRepository {
  findById(id: number): Promise<Party | null>;
  findByJoinCode(joinCode: string): Promise<Party | null>;
  findByMember(userId: number): Promise<Party[]>;
  save(party: Party): Promise<Party>;
  delete(id: number): Promise<void>;
}
```

- [ ] **Step 6: Crear `packages/core/src/ports/driven/UserRepository.ts`**

```ts
export interface UserRecord {
  id: number;
  email: string;
  username: string;
  passwordHash: string;
  confirmed: boolean;
}

export interface UserRepository {
  findById(id: number): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  findByUsername(username: string): Promise<UserRecord | null>;
  save(user: UserRecord): Promise<UserRecord>;
  delete(id: number): Promise<void>;
}
```

- [ ] **Step 7: Crear `packages/core/src/ports/driven/PasswordHasher.ts`**

```ts
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}
```

- [ ] **Step 8: Crear `packages/core/src/ports/driven/Mailer.ts`**

```ts
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface Mailer {
  send(message: EmailMessage): Promise<void>;
}
```

- [ ] **Step 9: Crear `packages/core/src/ports/driven/EventPublisher.ts`**

```ts
export interface DomainEvent {
  type: string;
  payload: unknown;
}

export interface EventPublisher {
  /** Publica un evento a la sala de una partida (p.ej. tirada de dados). */
  publishToParty(partyId: number, event: DomainEvent): Promise<void>;
}
```

- [ ] **Step 10: Crear `packages/core/src/ports/driven/Clock.ts`**

```ts
export interface Clock {
  now(): Date;
}
```

- [ ] **Step 11: Crear `packages/core/src/ports/driven/IdGenerator.ts`**

```ts
export interface IdGenerator {
  /** Código de unión a partida, legible y único. */
  joinCode(): string;
}
```

- [ ] **Step 12: Exportar puertos desde el barrel del core**

Añadir al final de `packages/core/src/index.ts`:

```ts
export type { CharacterRepository } from "./ports/driven/CharacterRepository.js";
export type { PartyRepository } from "./ports/driven/PartyRepository.js";
export type { UserRepository, UserRecord } from "./ports/driven/UserRepository.js";
export type { PasswordHasher } from "./ports/driven/PasswordHasher.js";
export type { Mailer, EmailMessage } from "./ports/driven/Mailer.js";
export type { EventPublisher, DomainEvent } from "./ports/driven/EventPublisher.js";
export type { Clock } from "./ports/driven/Clock.js";
export type { IdGenerator } from "./ports/driven/IdGenerator.js";
```

- [ ] **Step 13: Typecheck de shared y core**

Run: `pnpm --filter @kw/shared typecheck && pnpm --filter @kw/core typecheck`
Expected: sin errores.

- [ ] **Step 14: Commit**

```bash
git add packages/shared packages/core
git commit -m "feat(core): esquemas Character/Party y puertos driven del hexágono"
```

---

## Task 8: Paquete `server` — Prisma + esquema de BD

**Files:**
- Create: `packages/server/package.json`
- Create: `packages/server/tsconfig.json`
- Create: `packages/server/prisma/schema.prisma`
- Create: `packages/server/.env.example`

- [ ] **Step 1: Crear `packages/server/package.json`**

```json
{
  "name": "@kw/server",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "dev": "tsx watch src/main.ts",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev"
  },
  "dependencies": {
    "@kw/core": "workspace:*",
    "@kw/shared": "workspace:*",
    "@prisma/client": "^5.18.0",
    "fastify": "^4.28.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "prisma": "^5.18.0",
    "tsx": "^4.17.0",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Crear `packages/server/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Crear `packages/server/prisma/schema.prisma`**

Modela las 3 tablas del origen. Los campos complejos se guardan como `String` JSON (decisión de diseño: no normalizar).

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id           Int         @id @default(autoincrement())
  createdAt    DateTime    @default(now())
  lastLogin    DateTime    @default(now())
  email        String      @unique
  passwordHash String
  username     String      @unique
  confirmed    Boolean     @default(false)
  characters   Character[]
  parties      Party[]
}

model Character {
  id            Int      @id @default(autoincrement())
  createdAt     DateTime @default(now())
  owner         User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  ownerId       Int
  name          String
  background    String
  strength      Int
  strengthMax   Int
  dexterity     Int
  dexterityMax  Int
  willpower     Int
  willpowerMax  Int
  hp            Int
  hpMax         Int
  deprived      Boolean  @default(false)
  panicked      Boolean  @default(false)
  gold          Int      @default(0)
  items         String   @default("[]")      // JSON
  containers    String   @default("[]")      // JSON
  description   String?
  traits        String?
  notes         String?
  bonds         String?
  scars         String?
  omens         String?
  armor         String?
  imageUrl      String?
  partyId       Int?
}

model Party {
  id          Int      @id @default(autoincrement())
  createdAt   DateTime @default(now())
  owner       User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  ownerId     Int
  name        String
  description String?
  notes       String?
  members     String   @default("[]")        // JSON array de ids
  subowners   String   @default("[]")        // JSON array de ids
  joinCode    String   @unique
  items       String   @default("[]")        // JSON
  containers  String   @default("[]")        // JSON
  events      String   @default("[]")        // JSON
  version     Int      @default(0)
}
```

- [ ] **Step 4: Crear `packages/server/.env.example`**

```
DATABASE_URL="file:./dev.db"
BASE_URL="http://127.0.0.1:8000"
SECRET_KEY="cambia-esto"
PORT=8000
```

- [ ] **Step 5: Instalar deps y generar cliente Prisma**

Run: `pnpm install && pnpm --filter @kw/server exec prisma generate`
Expected: genera `@prisma/client` sin errores.

- [ ] **Step 6: Crear la migración inicial**

Run: `cd packages/server && cp .env.example .env && pnpm exec prisma migrate dev --name init`
Expected: crea `prisma/migrations/.../migration.sql` y `dev.db`.

- [ ] **Step 7: Commit**

```bash
git add packages/server/package.json packages/server/tsconfig.json packages/server/prisma packages/server/.env.example pnpm-lock.yaml
git commit -m "feat(server): esquema Prisma (User/Character/Party) y migración inicial"
```

---

## Task 9: `server` — config de entorno + composition root + Fastify de salud

**Files:**
- Create: `packages/server/src/infrastructure/config/env.ts`
- Create: `packages/server/src/main.ts`

- [ ] **Step 1: Crear `packages/server/src/infrastructure/config/env.ts`**

```ts
import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string(),
  BASE_URL: z.string().default("http://127.0.0.1:8000"),
  SECRET_KEY: z.string().min(1),
  PORT: z.coerce.number().int().default(8000),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return EnvSchema.parse(source);
}
```

- [ ] **Step 2: Crear `packages/server/src/main.ts` (composition root mínimo)**

En esta fase el composition root solo carga la config y levanta Fastify con un endpoint de salud. Las fases siguientes irán instanciando adaptadores (PrismaRepository, Mailer, etc.) e inyectándolos en los casos de uso aquí.

```ts
import Fastify from "fastify";
import { loadEnv } from "./infrastructure/config/env.js";

async function main() {
  const env = loadEnv();
  const app = Fastify({ logger: true });

  app.get("/api/health", async () => ({ status: "ok" }));

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @kw/server typecheck`
Expected: sin errores.

- [ ] **Step 4: Arrancar y comprobar el endpoint de salud**

Run (terminal 1): `cd packages/server && pnpm dev`
Run (terminal 2): `curl http://127.0.0.1:8000/api/health`
Expected: `{"status":"ok"}`. Luego parar el server (Ctrl+C).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src
git commit -m "feat(server): config de entorno y composition root con endpoint de salud"
```

---

## Task 10: Paquete `web` — React + Vite con check de salud

**Files:**
- Create: `packages/web/package.json`
- Create: `packages/web/tsconfig.json`
- Create: `packages/web/vite.config.ts`
- Create: `packages/web/index.html`
- Create: `packages/web/src/main.tsx`
- Create: `packages/web/src/App.tsx`

- [ ] **Step 1: Crear `packages/web/package.json`**

```json
{
  "name": "@kw/web",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.json --noEmit && vite build",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@kw/shared": "workspace:*",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.4",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.2",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Crear `packages/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Crear `packages/web/vite.config.ts`**

Proxy de `/api` al server para desarrollo.

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});
```

- [ ] **Step 4: Crear `packages/web/index.html`**

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Kettlewright</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Crear `packages/web/src/App.tsx`**

```tsx
import { useEffect, useState } from "react";

export function App() {
  const [status, setStatus] = useState("...");

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setStatus(d.status))
      .catch(() => setStatus("sin conexión"));
  }, []);

  return <h1>Kettlewright — API: {status}</h1>;
}
```

- [ ] **Step 6: Crear `packages/web/src/main.tsx`**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 7: Instalar y typecheck**

Run: `pnpm install && pnpm --filter @kw/web typecheck`
Expected: sin errores.

- [ ] **Step 8: Comprobar arranque (con el server corriendo en otra terminal)**

Run: `pnpm --filter @kw/web dev`
Abrir `http://127.0.0.1:5173` → debe mostrar "Kettlewright — API: ok". Parar (Ctrl+C).

- [ ] **Step 9: Commit**

```bash
git add packages/web pnpm-lock.yaml
git commit -m "feat(web): SPA React+Vite con comprobación de salud de la API"
```

---

## Task 11: Datos de juego y verificación final del monorepo

**Files:**
- Create: `data/` (copia de los JSON de origen)
- Create: `README.md`

- [ ] **Step 1: Copiar los JSON de datos de juego del origen**

Copiar `app/static/json/backgrounds/*.json` y `app/static/json/generators/*.json` del repositorio Kettlewright original a `data/backgrounds/` y `data/generators/` respectivamente. (Se consumirán en fases posteriores; aquí solo se versionan.)

- [ ] **Step 2: Crear `README.md` raíz**

```markdown
# Kettlewright (Node.js)

Migración a Node.js de Kettlewright (gestor de personajes/partidas de Cairn), con arquitectura hexagonal.

## Paquetes
- `packages/core` — dominio + casos de uso + puertos (TS puro)
- `packages/shared` — esquemas Zod / tipos
- `packages/server` — Fastify + Prisma + Socket.IO (adaptadores)
- `packages/web` — React + Vite (SPA)

## Desarrollo
\`\`\`
pnpm install
pnpm --filter @kw/server exec prisma generate
pnpm dev
\`\`\`

## Tests
\`\`\`
pnpm test
\`\`\`
```

- [ ] **Step 3: Ejecutar toda la batería de tests del monorepo**

Run: `pnpm test`
Expected: PASS en `@kw/core` (todos los tests de inventario, armadura, HP). Los demás paquetes sin tests todavía no fallan.

- [ ] **Step 4: Typecheck global**

Run: `pnpm typecheck`
Expected: sin errores en ningún paquete.

- [ ] **Step 5: Commit**

```bash
git add data README.md
git commit -m "chore: datos de juego y README; verificación del monorepo"
```

---

## Self-Review (cobertura del spec)

- **Monorepo hexagonal arrancando** → Tasks 1, 8, 9, 10 (core/shared/server/web).
- **Esqueleto hexagonal: puertos + composition root** → Task 7 (puertos), Task 9 (composition root).
- **Prisma + esquema BD** → Task 8.
- **Port de reglas de juego puras con tests** → Tasks 3–6 (slots, sobrecarga, armadura, HP), replicando exactamente el origen.
- **CI de tests / verificación** → Task 11 (`pnpm test`, `pnpm typecheck`).
- **Datos de juego versionados** → Task 11.

**Fuera de alcance de esta fase (van en sus propios planes):** auth real (fase 2), CRUD y creación de personaje (fase 3), inventario/marketplace de aplicación (fase 4), partidas (fase 5), Socket.IO real (fase 6), generadores/import-export (fase 7), i18n (fase 8). Los adaptadores Prisma que implementan los puertos del Task 7 se construyen en la fase que primero los necesita (auth → UserRepository en fase 2).

**Consistencia de tipos:** `Item`/`Container` (Task 2) usados por `inventory.ts`/`armor.ts`/`hp.ts` (Tasks 3–6) y por `Character`/`Party` (Task 7). Puertos (Task 7) referencian `Character`/`Party`/`UserRecord` ya definidos. `effectiveHp` recibe `{hp,hpMax,panicked,items}` consistente en test e implementación.
```

# Fase 3 — Personajes (CRUD + creación multi-paso + datos de juego) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar la gestión completa de personajes con paridad funcional del origen Flask: carga de los datos de juego (backgrounds, bonds, omens, traits, scars), la lógica de creación de personaje multi-paso (tirada de atributos, trasfondo, vínculos, rasgos, oro, retrato, gear inicial), los casos de uso de CRUD en `core/application/character`, el adaptador `PrismaCharacterRepository` con serialización JSON↔Zod, las rutas `/api/characters/*` y `/api/data/backgrounds`, y las vistas React (lista, creación multi-paso, vista y edición).

**Architecture:** Hexagonal. La lógica de creación de personaje y los casos de uso viven en `@kw/core` (TS puro, cero infra). Los datos de juego se exponen al núcleo por el puerto **driven** `GameDataRepository` (implementado en `@kw/server` por `FileGameDataRepository` que lee `data/`). Las tiradas aleatorias se aíslan tras el puerto `Dice` (testeable con un fake determinista). El adaptador `PrismaCharacterRepository` implementa el puerto `CharacterRepository` ya definido en Fase 1, parseando/validando JSON con los esquemas Zod de `@kw/shared`. Las rutas Fastify en `interfaces/http/characterRoutes.ts` invocan los casos de uso (inyectados a mano en `main.ts`). La SPA React (`@kw/web`) consume `/api/characters/*` y `/api/data/backgrounds` vía TanStack Query.

**Tech Stack:** Node 22, pnpm 11 workspaces, TypeScript, Zod, Vitest, Fastify, Prisma (SQLite), React, Vite, TanStack Query, React Router.

> **Nota de paridad:** la lógica replica *exactamente* el comportamiento del origen Flask (`app/blueprints/charcreo.py`, `app/lib/char_utils.py`, `app/lib/data.py`, `app/lib/roll.py`, `app/models/character.py`). En particular: un dado es `random.randint(1, face)` (1..face inclusive); `roll_list` toma `list[roll_dice(len)-1]`; `traits_text` produce el texto literal del origen; el coste/armadura de slots reutiliza las funciones puras ya portadas en Fase 1 (`itemSlotCost`, `armorValue`, `occupiedMainSlots`). Son tests de caracterización: preservar comportamiento, no "mejorarlo".

> **Desviaciones conscientes respecto al origen (documentadas):**
> 1. **Routing por `id` numérico, no por `url_name`.** El origen usa `/users/<username>/characters/<url_name>`. El esquema Prisma y `CharacterSchema` de Fase 1 no tienen `url_name`; introducirlo sería un cambio de esquema fuera del alcance acordado (JSON-en-columnas, modelo ya fijado). La API REST de esta fase enruta por `id` (`/api/characters/:id`) y filtra por propietario de la sesión. La generación de `url_name` no se porta.
> 2. **La edición de items/containers individuales (añadir/mover/transferir/editar item, editar container) es de la Fase 4 (Inventario).** Esta fase produce el inventario inicial en la creación y permite editar los campos escalares del personaje (stats, oro, notas, vínculos, rasgos, cicatrices, presagios, retrato) además de guardar el array `items`/`containers` completo tal cual llega del cliente. El editor granular de inventario llega en Fase 4.
> 3. **El origen renderiza parciales HTMX paso a paso; aquí la creación multi-paso es estado de cliente React** que llama a endpoints de tirada (`/api/characters/roll/*`) que devuelven JSON. La lógica de cada tirada se porta fielmente al núcleo.

---

## Estructura de ficheros (Fase 3)

```
yuuu-cairn/
├─ data/
│  ├─ backgrounds/                       # 20 JSON individuales (ya versionados en Fase 1)
│  ├─ bonds.json                         # { "Bonds": [...] }   (copiado en Fase 3)
│  ├─ omens.json                         # { "Omens": [...] }   (copiado en Fase 3)
│  ├─ traits.json                        # { "Physique": [...], ... } (copiado en Fase 3)
│  └─ scars.json                         # { "Scars": [...] }   (copiado en Fase 3)
├─ packages/
│  ├─ shared/src/schemas/
│  │  ├─ gameData.ts                     # BackgroundSchema, BondSchema, OmenSchema, GameData...
│  │  └─ characterIo.ts                  # CreateCharacterInput, UpdateCharacterInput, RollResult...
│  ├─ core/src/
│  │  ├─ ports/driven/
│  │  │  ├─ GameDataRepository.ts        # puerto: backgrounds/bonds/omens/traits/scars
│  │  │  └─ Dice.ts                      # puerto: roll(face), rollMulti(face,count), pick(list)
│  │  ├─ domain/character/
│  │  │  ├─ traits.ts                    # traitsText, TraitValue (paridad traits_text)
│  │  │  ├─ traits.test.ts
│  │  │  ├─ creation.ts                  # requiredBondsCount, buildStartingItems, buildContainers,
│  │  │  │                               #   itemsFromGear, assignItemIds  (paridad charcreo)
│  │  │  └─ creation.test.ts
│  │  ├─ application/character/
│  │  │  ├─ ListCharacters.ts (+test)
│  │  │  ├─ GetCharacter.ts (+test)
│  │  │  ├─ CreateCharacter.ts (+test)
│  │  │  ├─ UpdateCharacter.ts (+test)
│  │  │  ├─ DeleteCharacter.ts (+test)
│  │  │  ├─ RollCharacter.ts (+test)     # generación aleatoria completa (paridad roll-all)
│  │  │  ├─ errors.ts (+test)            # CharacterError
│  │  │  └─ index.ts
│  │  └─ testing/
│  │     ├─ InMemoryCharacterRepository.ts
│  │     ├─ FakeGameDataRepository.ts
│  │     └─ SequenceDice.ts              # Dice determinista para tests
│  ├─ server/src/
│  │  ├─ infrastructure/
│  │  │  ├─ persistence/prisma/
│  │  │  │  ├─ PrismaCharacterRepository.ts (+test)
│  │  │  ├─ gamedata/FileGameDataRepository.ts (+test)
│  │  │  └─ rng/CryptoDice.ts
│  │  ├─ interfaces/http/
│  │  │  ├─ characterRoutes.ts (+test)
│  │  │  └─ dataRoutes.ts (+test)
│  │  └─ main.ts                         # (Modify) cablear repos/usecases/rutas nuevas
│  └─ web/src/
│     ├─ api/characters.ts               # cliente fetch de /api/characters y /api/data
│     ├─ characters/
│     │  ├─ useCharacters.ts             # hooks TanStack Query
│     │  ├─ CharacterListPage.tsx
│     │  ├─ CharacterViewPage.tsx
│     │  ├─ CharacterEditPage.tsx
│     │  └─ create/
│     │     ├─ CharacterCreatePage.tsx   # orquesta el flujo multi-paso
│     │     └─ steps.tsx                 # subcomponentes de pasos
│     └─ App.tsx                         # (Modify) rutas nuevas
```

---

## Task 1: `shared` — esquemas Zod de datos de juego

**Files:**
- Create: `packages/shared/src/schemas/gameData.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Crear `packages/shared/src/schemas/gameData.ts`**

Estructura tomada del origen (`app/static/json/backgrounds/*.json`, `bonds.json`, `omens.json`, `traits.json`, `scars.json`). Los items de gear son items "ligeros" (sin `id`/`location` todavía: se asignan al construir el personaje). Se usa `passthrough` en los items de gear para conservar `uses`, `charges`, `description`, etc.

```ts
import { z } from "zod";

/** Item tal como aparece en los datos de juego (sin id/location aún). */
export const GearItemSchema = z
  .object({
    name: z.string(),
    tags: z.array(z.string()).default([]),
  })
  .passthrough();
export type GearItem = z.infer<typeof GearItemSchema>;

export const ContainerDefSchema = z
  .object({
    name: z.string(),
    slots: z.number().int(),
  })
  .passthrough();
export type ContainerDef = z.infer<typeof ContainerDefSchema>;

export const TableOptionSchema = z
  .object({
    description: z.string(),
    items: z.array(GearItemSchema).optional(),
    containers: z.array(ContainerDefSchema).optional(),
    bonus_gold: z.union([z.number(), z.string()]).optional(),
  })
  .passthrough();
export type TableOption = z.infer<typeof TableOptionSchema>;

export const BackgroundTableSchema = z.object({
  question: z.string(),
  options: z.array(TableOptionSchema),
});
export type BackgroundTable = z.infer<typeof BackgroundTableSchema>;

export const BackgroundSchema = z
  .object({
    image: z.string().optional(),
    background_description: z.string().default(""),
    names: z.array(z.string()).default([]),
    starting_gear: z.array(GearItemSchema).default([]),
    starting_containers: z.array(ContainerDefSchema).optional(),
    table1: BackgroundTableSchema,
    table2: BackgroundTableSchema,
  })
  .passthrough();
export type Background = z.infer<typeof BackgroundSchema>;

/** Mapa nombre→trasfondo (resultado de consolidar los JSON individuales). */
export const BackgroundsSchema = z.record(z.string(), BackgroundSchema);
export type Backgrounds = z.infer<typeof BackgroundsSchema>;

export const BondSchema = z
  .object({
    description: z.string(),
    gold: z.union([z.number(), z.string()]).optional(),
    items: z.array(GearItemSchema).optional(),
  })
  .passthrough();
export type Bond = z.infer<typeof BondSchema>;

export const OmenSchema = z.object({ description: z.string() }).passthrough();
export type Omen = z.infer<typeof OmenSchema>;

/** traits.json: { "Physique": [...], "Skin": [...], ... } */
export const TraitsSchema = z.record(z.string(), z.array(z.string()));
export type Traits = z.infer<typeof TraitsSchema>;

export const ScarSchema = z.object({
  name: z.string(),
  description: z.string(),
});
export type Scar = z.infer<typeof ScarSchema>;
```

- [ ] **Step 2: Actualizar `packages/shared/src/index.ts`**

Añadir al final:

```ts
export * from "./schemas/gameData.js";
```

(El fichero ya exporta item/container/character/party/auth; se conserva todo y se añade esta línea.)

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @kw/shared typecheck`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/schemas/gameData.ts packages/shared/src/index.ts
git commit -m "feat(shared): esquemas Zod de datos de juego (backgrounds, bonds, omens, traits, scars)"
```

---

## Task 2: `shared` — esquemas de E/S de personaje (create/update/roll)

**Files:**
- Create: `packages/shared/src/schemas/characterIo.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Crear `packages/shared/src/schemas/characterIo.ts`**

DTOs del borde HTTP. `CreateCharacterInput` recoge todo lo necesario para persistir un personaje creado en el cliente (con su inventario inicial ya resuelto). `UpdateCharacterInput` cubre los campos editables (paridad `charedit_save`: stats, gold, textos, panicked, deprived, items, containers).

```ts
import { z } from "zod";
import { ItemSchema } from "./item.js";
import { ContainerSchema } from "./container.js";

export const CreateCharacterInputSchema = z.object({
  name: z.string().min(1).max(64),
  background: z.string().min(1).max(64),
  strengthMax: z.number().int().min(1),
  dexterityMax: z.number().int().min(1),
  willpowerMax: z.number().int().min(1),
  hpMax: z.number().int().min(1),
  gold: z.number().int().min(0).default(0),
  items: z.array(ItemSchema).default([]),
  containers: z.array(ContainerSchema).default([]),
  description: z.string().nullable().default(null),
  traits: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
  bonds: z.string().nullable().default(null),
  omens: z.string().nullable().default(null),
  imageUrl: z.string().nullable().default(null),
});
export type CreateCharacterInput = z.infer<typeof CreateCharacterInputSchema>;

export const UpdateCharacterInputSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  strength: z.number().int().optional(),
  strengthMax: z.number().int().optional(),
  dexterity: z.number().int().optional(),
  dexterityMax: z.number().int().optional(),
  willpower: z.number().int().optional(),
  willpowerMax: z.number().int().optional(),
  hp: z.number().int().optional(),
  hpMax: z.number().int().optional(),
  deprived: z.boolean().optional(),
  panicked: z.boolean().optional(),
  gold: z.number().int().optional(),
  description: z.string().nullable().optional(),
  traits: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  bonds: z.string().nullable().optional(),
  scars: z.string().nullable().optional(),
  omens: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  items: z.array(ItemSchema).optional(),
  containers: z.array(ContainerSchema).optional(),
});
export type UpdateCharacterInput = z.infer<typeof UpdateCharacterInputSchema>;
```

- [ ] **Step 2: Actualizar `packages/shared/src/index.ts`**

Añadir al final:

```ts
export * from "./schemas/characterIo.js";
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @kw/shared typecheck`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/schemas/characterIo.ts packages/shared/src/index.ts
git commit -m "feat(shared): esquemas de E/S de personaje (create/update)"
```

---

## Task 3: `core` — puertos `Dice` y `GameDataRepository`

**Files:**
- Create: `packages/core/src/ports/driven/Dice.ts`
- Create: `packages/core/src/ports/driven/GameDataRepository.ts`
- Modify: `packages/core/src/index.ts`

> Estos puertos son **contratos**: `Dice` aísla la aleatoriedad (testeable con secuencia fija); `GameDataRepository` expone los datos de juego al núcleo. No llevan tests propios (son interfaces).

- [ ] **Step 1: Crear `packages/core/src/ports/driven/Dice.ts`**

Paridad con `app/lib/roll.py`: `roll(face)` = entero en 1..face; `rollMulti(face,count)` devuelve resultados y total; `pick(list)` = `list[roll(len)-1]`.

```ts
export interface Dice {
  /** Un dado: entero en [1, face] inclusive. */
  roll(face: number): number;
  /** count dados de face caras: devuelve resultados y total. */
  rollMulti(face: number, count: number): { results: number[]; total: number };
  /** Elemento aleatorio de la lista (paridad roll_list: list[roll(len)-1]). */
  pick<T>(list: T[]): T;
}
```

- [ ] **Step 2: Crear `packages/core/src/ports/driven/GameDataRepository.ts`**

```ts
import type {
  Backgrounds,
  Background,
  Bond,
  Traits,
  Scar,
} from "@kw/shared";

export interface GameDataRepository {
  backgrounds(): Backgrounds;
  background(name: string): Background | null;
  bonds(): Bond[];
  /** Lista de descripciones de presagios (paridad load_omens). */
  omens(): string[];
  traits(): Traits;
  scars(): Scar[];
}
```

- [ ] **Step 3: Actualizar `packages/core/src/index.ts`**

Añadir junto a los demás `export type` de puertos:

```ts
export type { Dice } from "./ports/driven/Dice.js";
export type { GameDataRepository } from "./ports/driven/GameDataRepository.js";
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @kw/core typecheck`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/ports/driven/Dice.ts packages/core/src/ports/driven/GameDataRepository.ts packages/core/src/index.ts
git commit -m "feat(core): puertos Dice y GameDataRepository"
```

---

## Task 4: `core` — fakes de testing (Dice determinista, repos en memoria)

**Files:**
- Create: `packages/core/src/testing/SequenceDice.ts`
- Create: `packages/core/src/testing/FakeGameDataRepository.ts`
- Create: `packages/core/src/testing/InMemoryCharacterRepository.ts`
- Modify: `packages/core/package.json` (exports de testing)

- [ ] **Step 1: Crear `packages/core/src/testing/SequenceDice.ts`**

Dice determinista: consume una secuencia precargada de resultados; `pick` usa el siguiente valor como índice 1-based (igual que `roll_list`).

```ts
import type { Dice } from "../ports/driven/Dice.js";

/** Dice determinista para tests: devuelve los valores de `seq` en orden. */
export class SequenceDice implements Dice {
  private i = 0;
  constructor(private readonly seq: number[]) {}

  private next(): number {
    if (this.i >= this.seq.length) {
      throw new Error("SequenceDice: secuencia agotada");
    }
    return this.seq[this.i++]!;
  }

  roll(_face: number): number {
    return this.next();
  }

  rollMulti(_face: number, count: number): { results: number[]; total: number } {
    const results: number[] = [];
    let total = 0;
    for (let k = 0; k < count; k++) {
      const v = this.next();
      results.push(v);
      total += v;
    }
    return { results, total };
  }

  pick<T>(list: T[]): T {
    const idx = this.next();
    return list[idx - 1]!;
  }
}
```

- [ ] **Step 2: Crear `packages/core/src/testing/FakeGameDataRepository.ts`**

```ts
import type {
  Backgrounds,
  Background,
  Bond,
  Traits,
  Scar,
} from "@kw/shared";
import type { GameDataRepository } from "../ports/driven/GameDataRepository.js";

export interface FakeGameData {
  backgrounds?: Backgrounds;
  bonds?: Bond[];
  omens?: string[];
  traits?: Traits;
  scars?: Scar[];
}

export class FakeGameDataRepository implements GameDataRepository {
  constructor(private readonly data: FakeGameData = {}) {}

  backgrounds(): Backgrounds {
    return this.data.backgrounds ?? {};
  }
  background(name: string): Background | null {
    return this.backgrounds()[name] ?? null;
  }
  bonds(): Bond[] {
    return this.data.bonds ?? [];
  }
  omens(): string[] {
    return this.data.omens ?? [];
  }
  traits(): Traits {
    return this.data.traits ?? {};
  }
  scars(): Scar[] {
    return this.data.scars ?? [];
  }
}
```

- [ ] **Step 3: Crear `packages/core/src/testing/InMemoryCharacterRepository.ts`**

Paridad con `InMemoryUserRepository`: `id === 0` => alta (asigna id); en otro caso, update.

```ts
import type { Character } from "@kw/shared";
import type { CharacterRepository } from "../ports/driven/CharacterRepository.js";

export class InMemoryCharacterRepository implements CharacterRepository {
  private chars = new Map<number, Character>();
  private seq = 0;

  async findById(id: number): Promise<Character | null> {
    return this.chars.get(id) ?? null;
  }
  async findByOwner(ownerId: number): Promise<Character[]> {
    return [...this.chars.values()].filter((c) => c.ownerId === ownerId);
  }
  async save(character: Character): Promise<Character> {
    let record = character;
    if (record.id === 0) {
      record = { ...record, id: ++this.seq };
    }
    this.chars.set(record.id, record);
    return record;
  }
  async delete(id: number): Promise<void> {
    this.chars.delete(id);
  }
}
```

- [ ] **Step 4: Añadir los exports de testing a `packages/core/package.json`**

Reemplazar el bloque `"exports"` por (conservando las entradas de auth ya existentes y añadiendo las tres nuevas):

```json
  "exports": {
    ".": "./src/index.ts",
    "./testing/InMemoryUserRepository.js": "./src/testing/InMemoryUserRepository.ts",
    "./testing/FakePasswordHasher.js": "./src/testing/FakePasswordHasher.ts",
    "./testing/FakeMailer.js": "./src/testing/FakeMailer.ts",
    "./testing/FakeTokenService.js": "./src/testing/FakeTokenService.ts",
    "./testing/FakeCaptcha.js": "./src/testing/FakeCaptcha.ts",
    "./testing/FixedClock.js": "./src/testing/FixedClock.ts",
    "./testing/SequenceDice.js": "./src/testing/SequenceDice.ts",
    "./testing/FakeGameDataRepository.js": "./src/testing/FakeGameDataRepository.ts",
    "./testing/InMemoryCharacterRepository.js": "./src/testing/InMemoryCharacterRepository.ts"
  },
```

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @kw/core typecheck`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/testing/SequenceDice.ts packages/core/src/testing/FakeGameDataRepository.ts packages/core/src/testing/InMemoryCharacterRepository.ts packages/core/package.json
git commit -m "feat(core): fakes de testing (SequenceDice, FakeGameDataRepository, InMemoryCharacterRepository)"
```

---

## Task 5: `core` — texto de rasgos (traitsText, TDD)

**Files:**
- Create: `packages/core/src/domain/character/traits.test.ts`
- Create: `packages/core/src/domain/character/traits.ts`

- [ ] **Step 1: Escribir el test que falla `traits.test.ts`**

Paridad con `traits_text` (`char_utils.py`): el orden de los rasgos es `[Physique, Skin, Hair, Face, Speech, Clothing, Virtue, Vice]`. El texto literal es el del origen (sin traducción aquí: i18n es Fase 8). Añade la frase de edad solo si `age > 0`.

```ts
import { describe, it, expect } from "vitest";
import { traitsText, type TraitValue } from "./traits.js";

const tv = (name: string, value: string): TraitValue => ({ name, value });

describe("traitsText", () => {
  const traits: TraitValue[] = [
    tv("Physique", "Athletic"),
    tv("Skin", "Tanned"),
    tv("Hair", "Braided"),
    tv("Face", "Broken"),
    tv("Speech", "Booming"),
    tv("Clothing", "Antique"),
    tv("Virtue", "Ambitious"),
    tv("Vice", "Aggressive"),
  ];

  it("genera el texto literal del origen", () => {
    expect(traitsText(0, traits)).toBe(
      "You have a Athletic Physique, Tanned Skin, and Braided Hair. " +
        "Your Face is Broken, your Speech Booming. " +
        "You have Antique Clothing. You are Ambitious and Aggressive. "
    );
  });

  it("añade la frase de edad cuando age > 0", () => {
    expect(traitsText(24, traits)).toContain("You are 24 years old.");
  });

  it("no añade edad cuando age es 0", () => {
    expect(traitsText(0, traits)).not.toContain("years old");
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/core test`
Expected: FAIL — "Cannot find module './traits.js'".

- [ ] **Step 3: Implementar `packages/core/src/domain/character/traits.ts`**

```ts
export interface TraitValue {
  name: string;
  value: string;
}

export const TRAIT_NAMES = [
  "Physique",
  "Skin",
  "Hair",
  "Face",
  "Speech",
  "Clothing",
  "Virtue",
  "Vice",
] as const;

/**
 * Texto de rasgos (paridad traits_text de char_utils.py).
 * `traits` debe ir en el orden de TRAIT_NAMES (8 elementos).
 */
export function traitsText(age: number, traits: TraitValue[]): string {
  const t = traits;
  let txt =
    "You have a " +
    t[0]!.value +
    " " +
    t[0]!.name +
    ", " +
    t[1]!.value +
    " " +
    t[1]!.name +
    ", and " +
    t[2]!.value +
    " " +
    t[2]!.name +
    ". Your " +
    t[3]!.name +
    " is " +
    t[3]!.value +
    ", your " +
    t[4]!.name +
    " " +
    t[4]!.value +
    ". You have " +
    t[5]!.value +
    " " +
    t[5]!.name +
    ". You are " +
    t[6]!.value +
    " and " +
    t[7]!.value +
    ". ";
  if (age && age > 0) {
    txt += `You are ${age} years old.`;
  }
  return txt;
}
```

- [ ] **Step 4: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/core test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/domain/character/traits.ts packages/core/src/domain/character/traits.test.ts
git commit -m "feat(core): texto de rasgos (traitsText) con paridad del origen"
```

---

## Task 6: `core` — lógica de creación (gear, contenedores, bonds, TDD)

**Files:**
- Create: `packages/core/src/domain/character/creation.test.ts`
- Create: `packages/core/src/domain/character/creation.ts`

- [ ] **Step 1: Escribir el test que falla `creation.test.ts`**

Reglas portadas de `charcreo.py` / `char_utils.py`:
- `requiredBondsCount(background, table1Desc)`: 2 si la descripción del trasfondo contiene `"Roll a second time on the Bonds table"` o la opción de table1 contiene `"roll a second time on the Bonds table"`; si no, 1. (Paridad `get_required_bonds_count`.)
- `itemsFromGear(gear)`: normaliza items de gear a `Item` con `tags` (default `[]`), preservando campos extra; **no** asigna id/location aún.
- `assignItemIds(items)`: asigna `id` incremental desde 1 y `location = 0` (paridad `generate_character`).
- `buildContainers(background, t1, t2)`: contenedor `Main` (id 0, 10 slots) + `starting_containers` + containers de table1/table2, con ids incrementales desde 1 (paridad `generate_character`).

```ts
import { describe, it, expect } from "vitest";
import type { Background, GearItem, TableOption } from "@kw/shared";
import {
  requiredBondsCount,
  itemsFromGear,
  assignItemIds,
  buildContainers,
} from "./creation.js";

const bg = (over: Partial<Background>): Background =>
  ({
    background_description: "",
    names: [],
    starting_gear: [],
    table1: { question: "", options: [] },
    table2: { question: "", options: [] },
    ...over,
  }) as Background;

describe("requiredBondsCount", () => {
  it("1 por defecto", () => {
    expect(requiredBondsCount(bg({}), "")).toBe(1);
  });
  it("2 si el trasfondo pide segunda tirada de vínculos", () => {
    expect(
      requiredBondsCount(
        bg({ background_description: "... Roll a second time on the Bonds table ..." }),
        ""
      )
    ).toBe(2);
  });
  it("2 si la opción de table1 pide segunda tirada de vínculos", () => {
    expect(
      requiredBondsCount(bg({}), "You roll a second time on the Bonds table.")
    ).toBe(2);
  });
});

describe("itemsFromGear", () => {
  it("normaliza tags ausentes a [] y conserva extras", () => {
    const gear: GearItem[] = [
      { name: "Lantern", tags: [] },
      { name: "Rations", tags: ["uses"], uses: 3 } as GearItem,
      { name: "Gloves" } as unknown as GearItem,
    ];
    const items = itemsFromGear(gear);
    expect(items).toHaveLength(3);
    expect(items[2]!.tags).toEqual([]);
    expect((items[1] as { uses?: number }).uses).toBe(3);
  });
});

describe("assignItemIds", () => {
  it("asigna ids incrementales desde 1 y location 0", () => {
    const items = assignItemIds([
      { name: "A", tags: [], id: 0, location: 0 },
      { name: "B", tags: [], id: 0, location: 0 },
    ]);
    expect(items.map((i) => i.id)).toEqual([1, 2]);
    expect(items.every((i) => i.location === 0)).toBe(true);
  });
});

describe("buildContainers", () => {
  it("siempre incluye Main (id 0, 10 slots) primero", () => {
    const conts = buildContainers(bg({}), undefined, undefined);
    expect(conts[0]).toEqual({ id: 0, name: "Main", slots: 10 });
  });
  it("añade starting_containers y los de table1/table2 con ids incrementales", () => {
    const background = bg({ starting_containers: [{ name: "Sack", slots: 6 }] });
    const t1: TableOption = { description: "x", containers: [{ name: "Pouch", slots: 2 }] };
    const conts = buildContainers(background, t1, undefined);
    expect(conts.map((c) => c.id)).toEqual([0, 1, 2]);
    expect(conts[1]!.name).toBe("Sack");
    expect(conts[2]!.name).toBe("Pouch");
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/core test`
Expected: FAIL — "Cannot find module './creation.js'".

- [ ] **Step 3: Implementar `packages/core/src/domain/character/creation.ts`**

```ts
import type {
  Background,
  GearItem,
  TableOption,
  Item,
  Container,
} from "@kw/shared";

const SECOND_BOND_BG = "Roll a second time on the Bonds table";
const SECOND_BOND_T1 = "roll a second time on the Bonds table";

/** Número de vínculos requeridos (paridad get_required_bonds_count). */
export function requiredBondsCount(
  background: Background | null,
  table1OptionDesc: string
): number {
  if (!background) return 1;
  if ((background.background_description ?? "").includes(SECOND_BOND_BG)) return 2;
  if (table1OptionDesc && table1OptionDesc.includes(SECOND_BOND_T1)) return 2;
  return 1;
}

/** Normaliza items de gear a Item base (tags por defecto []), sin id/location. */
export function itemsFromGear(gear: GearItem[]): Item[] {
  return gear.map((g) => {
    const tags = Array.isArray(g.tags) ? g.tags : [];
    return { ...g, tags, id: 0, location: 0 } as Item;
  });
}

/** Asigna ids incrementales desde 1 y location 0 (paridad generate_character). */
export function assignItemIds(items: Item[]): Item[] {
  return items.map((it, idx) => ({ ...it, id: idx + 1, location: 0 }));
}

/**
 * Construye la lista de contenedores: Main (id 0, 10 slots) + starting_containers
 * + containers de table1/table2, con ids incrementales desde 1.
 */
export function buildContainers(
  background: Background | null,
  t1: TableOption | undefined,
  t2: TableOption | undefined
): Container[] {
  const containers: Container[] = [{ id: 0, name: "Main", slots: 10 }];
  let idx = 1;
  const push = (defs: { name: string; slots: number }[] | undefined) => {
    if (!defs) return;
    for (const c of defs) {
      containers.push({ ...c, id: idx++ } as Container);
    }
  };
  push(background?.starting_containers);
  push(t1?.containers);
  push(t2?.containers);
  return containers;
}
```

- [ ] **Step 4: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/core test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/domain/character/creation.ts packages/core/src/domain/character/creation.test.ts
git commit -m "feat(core): lógica de creación (gear, contenedores, vínculos requeridos)"
```

---

## Task 7: `core` — errores y casos de uso CRUD básicos (List/Get/Delete, TDD)

**Files:**
- Create: `packages/core/src/application/character/errors.ts`
- Create: `packages/core/src/application/character/ListCharacters.ts`
- Create: `packages/core/src/application/character/GetCharacter.ts`
- Create: `packages/core/src/application/character/DeleteCharacter.ts`
- Create: `packages/core/src/application/character/crud.test.ts`

- [ ] **Step 1: Crear `packages/core/src/application/character/errors.ts`**

Paridad con `AuthError`: error con `code` legible para mapear a HTTP.

```ts
export type CharacterErrorCode = "not_found" | "forbidden" | "invalid_input";

export class CharacterError extends Error {
  constructor(
    public readonly code: CharacterErrorCode,
    message: string
  ) {
    super(message);
    this.name = "CharacterError";
  }
}
```

- [ ] **Step 2: Crear `packages/core/src/application/character/ListCharacters.ts`**

```ts
import type { Character } from "@kw/shared";
import type { CharacterRepository } from "../../ports/driven/CharacterRepository.js";

export class ListCharacters {
  constructor(private readonly characters: CharacterRepository) {}

  async execute(ownerId: number): Promise<Character[]> {
    return this.characters.findByOwner(ownerId);
  }
}
```

- [ ] **Step 3: Crear `packages/core/src/application/character/GetCharacter.ts`**

Devuelve el personaje solo si pertenece al propietario indicado; en otro caso `not_found` (no se filtra owner con 403 para no revelar existencia, paridad con `first_or_404` del origen).

```ts
import type { Character } from "@kw/shared";
import type { CharacterRepository } from "../../ports/driven/CharacterRepository.js";
import { CharacterError } from "./errors.js";

export interface GetCharacterQuery {
  id: number;
  ownerId: number;
}

export class GetCharacter {
  constructor(private readonly characters: CharacterRepository) {}

  async execute(q: GetCharacterQuery): Promise<Character> {
    const character = await this.characters.findById(q.id);
    if (!character || character.ownerId !== q.ownerId) {
      throw new CharacterError("not_found", "Character not found");
    }
    return character;
  }
}
```

- [ ] **Step 4: Crear `packages/core/src/application/character/DeleteCharacter.ts`**

```ts
import type { CharacterRepository } from "../../ports/driven/CharacterRepository.js";
import { CharacterError } from "./errors.js";

export interface DeleteCharacterCommand {
  id: number;
  ownerId: number;
}

export class DeleteCharacter {
  constructor(private readonly characters: CharacterRepository) {}

  async execute(cmd: DeleteCharacterCommand): Promise<void> {
    const character = await this.characters.findById(cmd.id);
    if (!character || character.ownerId !== cmd.ownerId) {
      throw new CharacterError("not_found", "Character not found");
    }
    await this.characters.delete(cmd.id);
  }
}
```

- [ ] **Step 5: Escribir el test `crud.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import type { Character } from "@kw/shared";
import { InMemoryCharacterRepository } from "../../testing/InMemoryCharacterRepository.js";
import { ListCharacters } from "./ListCharacters.js";
import { GetCharacter } from "./GetCharacter.js";
import { DeleteCharacter } from "./DeleteCharacter.js";
import { CharacterError } from "./errors.js";

const baseChar = (over: Partial<Character>): Character => ({
  id: 0,
  ownerId: 1,
  name: "Hero",
  background: "Aurifex",
  strength: 10,
  strengthMax: 10,
  dexterity: 10,
  dexterityMax: 10,
  willpower: 10,
  willpowerMax: 10,
  hp: 5,
  hpMax: 5,
  deprived: false,
  panicked: false,
  gold: 0,
  items: [],
  containers: [],
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
});

describe("CRUD de personajes", () => {
  let repo: InMemoryCharacterRepository;
  beforeEach(() => {
    repo = new InMemoryCharacterRepository();
  });

  it("ListCharacters devuelve solo los del propietario", async () => {
    await repo.save(baseChar({ ownerId: 1, name: "A" }));
    await repo.save(baseChar({ ownerId: 2, name: "B" }));
    const list = await new ListCharacters(repo).execute(1);
    expect(list.map((c) => c.name)).toEqual(["A"]);
  });

  it("GetCharacter devuelve el personaje del propietario", async () => {
    const saved = await repo.save(baseChar({ ownerId: 1 }));
    const got = await new GetCharacter(repo).execute({ id: saved.id, ownerId: 1 });
    expect(got.id).toBe(saved.id);
  });

  it("GetCharacter lanza not_found si el owner no coincide", async () => {
    const saved = await repo.save(baseChar({ ownerId: 1 }));
    await expect(
      new GetCharacter(repo).execute({ id: saved.id, ownerId: 999 })
    ).rejects.toBeInstanceOf(CharacterError);
  });

  it("DeleteCharacter elimina el personaje del propietario", async () => {
    const saved = await repo.save(baseChar({ ownerId: 1 }));
    await new DeleteCharacter(repo).execute({ id: saved.id, ownerId: 1 });
    expect(await repo.findById(saved.id)).toBeNull();
  });

  it("DeleteCharacter lanza not_found si no existe", async () => {
    await expect(
      new DeleteCharacter(repo).execute({ id: 42, ownerId: 1 })
    ).rejects.toBeInstanceOf(CharacterError);
  });
});
```

- [ ] **Step 6: Ejecutar el test**

Run: `pnpm --filter @kw/core test`
Expected: PASS (los casos de uso recién creados con sus tests verdes).

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/application/character/errors.ts packages/core/src/application/character/ListCharacters.ts packages/core/src/application/character/GetCharacter.ts packages/core/src/application/character/DeleteCharacter.ts packages/core/src/application/character/crud.test.ts
git commit -m "feat(core): casos de uso List/Get/Delete de personaje + CharacterError"
```

---

## Task 8: `core` — CreateCharacter y UpdateCharacter (TDD)

**Files:**
- Create: `packages/core/src/application/character/CreateCharacter.ts`
- Create: `packages/core/src/application/character/UpdateCharacter.ts`
- Create: `packages/core/src/application/character/createUpdate.test.ts`

- [ ] **Step 1: Escribir el test que falla `createUpdate.test.ts`**

`CreateCharacter` (paridad `charcreo_save`): construye un `Character` nuevo con `hp=hpMax`, atributos actuales = max, `deprived/panicked=false`, `armor` calculado con `armorValue(items)`, `scars=""`, persiste para el `ownerId`. `UpdateCharacter` (paridad `charedit_save`): aplica solo los campos presentes; si llegan `items`, recalcula `armor` con `armorValue`.

```ts
import { describe, it, expect, beforeEach } from "vitest";
import type { Item } from "@kw/shared";
import { InMemoryCharacterRepository } from "../../testing/InMemoryCharacterRepository.js";
import { CreateCharacter } from "./CreateCharacter.js";
import { UpdateCharacter } from "./UpdateCharacter.js";
import { CharacterError } from "./errors.js";

const armorItem = (id: number): Item => ({
  id,
  name: "Mail",
  location: 0,
  tags: ["2 Armor"],
});

describe("CreateCharacter", () => {
  let repo: InMemoryCharacterRepository;
  beforeEach(() => {
    repo = new InMemoryCharacterRepository();
  });

  it("crea con hp=hpMax, atributos = max, armor calculado y owner asignado", async () => {
    const created = await new CreateCharacter(repo).execute({
      ownerId: 7,
      input: {
        name: "Rune",
        background: "Aurifex",
        strengthMax: 12,
        dexterityMax: 11,
        willpowerMax: 9,
        hpMax: 4,
        gold: 5,
        items: [armorItem(1)],
        containers: [{ id: 0, name: "Main", slots: 10 }],
        description: null,
        traits: null,
        notes: null,
        bonds: null,
        omens: null,
        imageUrl: null,
      },
    });
    expect(created.id).toBeGreaterThan(0);
    expect(created.ownerId).toBe(7);
    expect(created.hp).toBe(4);
    expect(created.strength).toBe(12);
    expect(created.strengthMax).toBe(12);
    expect(created.deprived).toBe(false);
    expect(created.panicked).toBe(false);
    expect(created.armor).toBe("2");
    expect(created.scars).toBe("");
  });
});

describe("UpdateCharacter", () => {
  let repo: InMemoryCharacterRepository;
  beforeEach(() => {
    repo = new InMemoryCharacterRepository();
  });

  async function seed() {
    return new CreateCharacter(repo).execute({
      ownerId: 1,
      input: {
        name: "Rune",
        background: "Aurifex",
        strengthMax: 10,
        dexterityMax: 10,
        willpowerMax: 10,
        hpMax: 6,
        gold: 0,
        items: [],
        containers: [{ id: 0, name: "Main", slots: 10 }],
        description: null,
        traits: null,
        notes: null,
        bonds: null,
        omens: null,
        imageUrl: null,
      },
    });
  }

  it("aplica campos parciales", async () => {
    const c = await seed();
    const updated = await new UpdateCharacter(repo).execute({
      id: c.id,
      ownerId: 1,
      input: { hp: 3, gold: 42, notes: "hola" },
    });
    expect(updated.hp).toBe(3);
    expect(updated.gold).toBe(42);
    expect(updated.notes).toBe("hola");
    expect(updated.name).toBe("Rune"); // sin tocar
  });

  it("recalcula armor cuando llegan items", async () => {
    const c = await seed();
    const updated = await new UpdateCharacter(repo).execute({
      id: c.id,
      ownerId: 1,
      input: { items: [armorItem(1)] },
    });
    expect(updated.armor).toBe("2");
  });

  it("lanza not_found si el owner no coincide", async () => {
    const c = await seed();
    await expect(
      new UpdateCharacter(repo).execute({ id: c.id, ownerId: 999, input: { hp: 1 } })
    ).rejects.toBeInstanceOf(CharacterError);
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/core test`
Expected: FAIL — "Cannot find module './CreateCharacter.js'".

- [ ] **Step 3: Implementar `packages/core/src/application/character/CreateCharacter.ts`**

```ts
import type { Character, CreateCharacterInput } from "@kw/shared";
import type { CharacterRepository } from "../../ports/driven/CharacterRepository.js";
import { armorValue } from "../../domain/character/armor.js";

export interface CreateCharacterCommand {
  ownerId: number;
  input: CreateCharacterInput;
}

export class CreateCharacter {
  constructor(private readonly characters: CharacterRepository) {}

  async execute(cmd: CreateCharacterCommand): Promise<Character> {
    const i = cmd.input;
    const character: Character = {
      id: 0,
      ownerId: cmd.ownerId,
      name: i.name,
      background: i.background,
      strength: i.strengthMax,
      strengthMax: i.strengthMax,
      dexterity: i.dexterityMax,
      dexterityMax: i.dexterityMax,
      willpower: i.willpowerMax,
      willpowerMax: i.willpowerMax,
      hp: i.hpMax,
      hpMax: i.hpMax,
      deprived: false,
      panicked: false,
      gold: i.gold,
      items: i.items,
      containers: i.containers,
      description: i.description,
      traits: i.traits,
      notes: i.notes,
      bonds: i.bonds,
      scars: "",
      omens: i.omens,
      armor: String(armorValue(i.items)),
      imageUrl: i.imageUrl,
      partyId: null,
    };
    return this.characters.save(character);
  }
}
```

- [ ] **Step 4: Implementar `packages/core/src/application/character/UpdateCharacter.ts`**

```ts
import type { Character, UpdateCharacterInput } from "@kw/shared";
import type { CharacterRepository } from "../../ports/driven/CharacterRepository.js";
import { armorValue } from "../../domain/character/armor.js";
import { CharacterError } from "./errors.js";

export interface UpdateCharacterCommand {
  id: number;
  ownerId: number;
  input: UpdateCharacterInput;
}

export class UpdateCharacter {
  constructor(private readonly characters: CharacterRepository) {}

  async execute(cmd: UpdateCharacterCommand): Promise<Character> {
    const current = await this.characters.findById(cmd.id);
    if (!current || current.ownerId !== cmd.ownerId) {
      throw new CharacterError("not_found", "Character not found");
    }
    const next: Character = { ...current, ...cmd.input };
    // Si cambian los items, recalcular armadura (paridad charedit_save).
    if (cmd.input.items) {
      next.armor = String(armorValue(cmd.input.items));
    }
    return this.characters.save(next);
  }
}
```

- [ ] **Step 5: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/core test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/application/character/CreateCharacter.ts packages/core/src/application/character/UpdateCharacter.ts packages/core/src/application/character/createUpdate.test.ts
git commit -m "feat(core): casos de uso CreateCharacter y UpdateCharacter"
```

---

## Task 9: `core` — RollCharacter (generación aleatoria completa, TDD)

**Files:**
- Create: `packages/core/src/application/character/RollCharacter.ts`
- Create: `packages/core/src/application/character/RollCharacter.test.ts`

- [ ] **Step 1: Escribir el test que falla `RollCharacter.test.ts`**

`RollCharacter` (paridad `generate_character` / `charcreo_roll_all`): dado un `GameDataRepository` y un `Dice`, produce un `CreateCharacterInput` listo para guardar: elige trasfondo (o usa el indicado), nombre, opción de table1/table2 (acumulando sus items y oro bonus), un vínculo (y un segundo si `requiredBondsCount===2`), un presagio, rasgos, oro base 3d6 + bonus de vínculos, edad 2d20+10, atributos 3d6 (str/dex/wil) y hp 1d6. Construye items con ids y containers. Con `SequenceDice` el resultado es determinista.

```ts
import { describe, it, expect } from "vitest";
import type { Backgrounds, Bond, Traits } from "@kw/shared";
import { FakeGameDataRepository } from "../../testing/FakeGameDataRepository.js";
import { SequenceDice } from "../../testing/SequenceDice.js";
import { RollCharacter } from "./RollCharacter.js";

const backgrounds: Backgrounds = {
  Aurifex: {
    background_description: "An artisan of the arcane.",
    names: ["Hestia", "Basil"],
    starting_gear: [{ name: "Lantern", tags: [] }],
    starting_containers: [{ name: "Sack", slots: 6 }],
    table1: {
      question: "What went wrong?",
      options: [
        { description: "Explosion.", items: [{ name: "Snuff", tags: ["uses"] }] },
        { description: "Pet lost." },
      ],
    },
    table2: {
      question: "What marvel?",
      options: [
        { description: "Gel.", items: [{ name: "Gel", tags: [] }] },
        { description: "Sphere." },
      ],
    },
  },
};

const bonds: Bond[] = [
  { description: "A gem.", gold: 5, items: [{ name: "Gem", tags: [] }] },
  { description: "A debt." },
];

const omens: string[] = ["The river runs black.", "A star falls."];

const traits: Traits = {
  Physique: ["Athletic", "Brawny"],
  Skin: ["Tanned", "Pale"],
  Hair: ["Braided", "Bald"],
  Face: ["Broken", "Soft"],
  Speech: ["Booming", "Quiet"],
  Clothing: ["Antique", "Fine"],
  Virtue: ["Ambitious", "Loyal"],
  Vice: ["Aggressive", "Greedy"],
};

describe("RollCharacter", () => {
  it("genera un personaje completo de forma determinista", async () => {
    const data = new FakeGameDataRepository({ backgrounds, bonds, omens, traits });
    // Secuencia de tiradas en el orden en que el caso de uso las consume.
    // Ver implementación: background pick, name pick, table1 pick, table2 pick,
    // bond pick, omen pick, 8 traits picks, gold 3d6, age 2d20, str 3d6, dex 3d6,
    // wil 3d6, hp 1d6.
    const dice = new SequenceDice([
      1, // pick background -> Aurifex
      1, // pick name -> Hestia
      1, // pick table1 option -> Explosion (items Snuff)
      1, // pick table2 option -> Gel
      1, // pick bond -> A gem (gold 5, item Gem)
      1, // pick omen -> river
      1, 1, 1, 1, 1, 1, 1, 1, // 8 traits
      2, 2, 2, // gold 3d6 = 6
      5, 5, // age 2d20 = 10 -> +10 = 20
      3, 3, 3, // str 3d6 = 9
      4, 4, 4, // dex = 12
      2, 2, 2, // wil = 6
      6, // hp 1d6 = 6
    ]);

    const result = await new RollCharacter(data, dice).execute({ background: "" });

    expect(result.background).toBe("Aurifex");
    expect(result.name).toBe("Hestia");
    expect(result.strengthMax).toBe(9);
    expect(result.dexterityMax).toBe(12);
    expect(result.willpowerMax).toBe(6);
    expect(result.hpMax).toBe(6);
    expect(result.gold).toBe(6 + 5); // 3d6 + gold del vínculo
    expect(result.bonds).toBe("A gem.");
    expect(result.omens).toBe("The river runs black.");
    // items: gear (Lantern) + table1 (Snuff) + table2 (Gel) + bond (Gem)
    expect(result.items.map((i) => i.name)).toEqual(["Lantern", "Snuff", "Gel", "Gem"]);
    expect(result.items.map((i) => i.id)).toEqual([1, 2, 3, 4]);
    // containers: Main + Sack
    expect(result.containers.map((c) => c.name)).toEqual(["Main", "Sack"]);
    expect(result.traits).toContain("years old");
  });

  it("usa el trasfondo indicado si se pasa uno", async () => {
    const data = new FakeGameDataRepository({ backgrounds, bonds, omens, traits });
    const dice = new SequenceDice([
      1, // name
      1, 1, // table1, table2
      1, // bond
      1, // omen
      1, 1, 1, 1, 1, 1, 1, 1, // traits
      1, 1, 1, // gold
      1, 1, // age
      1, 1, 1, // str
      1, 1, 1, // dex
      1, 1, 1, // wil
      1, // hp
    ]);
    const result = await new RollCharacter(data, dice).execute({ background: "Aurifex" });
    expect(result.background).toBe("Aurifex");
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/core test`
Expected: FAIL — "Cannot find module './RollCharacter.js'".

- [ ] **Step 3: Implementar `packages/core/src/application/character/RollCharacter.ts`**

Paridad fiel con `generate_character` (`char_utils.py`): orden de consumo de tiradas = background, name, table1, table2, bond, omen, traits (8), gold(3d6), age(2d20+10), str(3d6), dex(3d6), wil(3d6), hp(1d6). El segundo vínculo solo si `requiredBondsCount===2`. Oro = 3d6 + gold de vínculos.

```ts
import type {
  CreateCharacterInput,
  Background,
  Bond,
  Item,
  GearItem,
} from "@kw/shared";
import type { GameDataRepository } from "../../ports/driven/GameDataRepository.js";
import type { Dice } from "../../ports/driven/Dice.js";
import {
  requiredBondsCount,
  itemsFromGear,
  assignItemIds,
  buildContainers,
} from "../../domain/character/creation.js";
import { traitsText, TRAIT_NAMES, type TraitValue } from "../../domain/character/traits.js";

export interface RollCharacterQuery {
  /** Nombre de trasfondo a usar; vacío = aleatorio. */
  background: string;
}

function bondGold(bond: Bond | undefined): number {
  if (!bond || bond.gold === undefined || bond.gold === "") return 0;
  return typeof bond.gold === "number" ? bond.gold : parseInt(bond.gold, 10) || 0;
}

export class RollCharacter {
  constructor(
    private readonly data: GameDataRepository,
    private readonly dice: Dice
  ) {}

  async execute(q: RollCharacterQuery): Promise<CreateCharacterInput> {
    const backgrounds = this.data.backgrounds();
    const keys = Object.keys(backgrounds);

    // 1. Trasfondo (indicado o aleatorio)
    let key: string;
    if (q.background && backgrounds[q.background]) {
      key = q.background;
    } else {
      key = this.dice.pick(keys);
    }
    const background: Background = backgrounds[key]!;

    // 2. Nombre
    const name = this.dice.pick(background.names);

    // 3-4. Opciones de tablas (acumulan items y oro bonus)
    const t1 = this.dice.pick(background.table1.options);
    const t2 = this.dice.pick(background.table2.options);

    // 5. Vínculo(s)
    const bonds = this.data.bonds();
    const bond1 = this.dice.pick(bonds);
    const need = requiredBondsCount(background, t1.description);
    let bond2: Bond | undefined;
    if (need === 2) {
      const remaining = bonds.filter((b) => b.description !== bond1.description);
      bond2 = this.dice.pick(remaining.length > 0 ? remaining : bonds);
    }

    // 6. Presagio
    const omen = this.dice.pick(this.data.omens());

    // 7. Rasgos
    const traitsData = this.data.traits();
    const tts: TraitValue[] = TRAIT_NAMES.map((tn) => ({
      name: tn,
      value: this.dice.pick(traitsData[tn] ?? [""]),
    }));

    // 8. Oro base 3d6
    const goldRoll = this.dice.rollMulti(6, 3).total;

    // 9. Edad 2d20 + 10
    const age = this.dice.rollMulti(20, 2).total + 10;

    // 10. Atributos
    const strengthMax = this.dice.rollMulti(6, 3).total;
    const dexterityMax = this.dice.rollMulti(6, 3).total;
    const willpowerMax = this.dice.rollMulti(6, 3).total;
    const hpMax = this.dice.rollMulti(6, 1).total;

    // Items: gear + table1 + table2 + bonds (en ese orden)
    const gear: GearItem[] = [
      ...background.starting_gear,
      ...(t1.items ?? []),
      ...(t2.items ?? []),
      ...(bond1.items ?? []),
      ...(bond2?.items ?? []),
    ];
    const items: Item[] = assignItemIds(itemsFromGear(gear));

    // Contenedores
    const containers = buildContainers(background, t1, t2);

    // Oro total
    const gold = goldRoll + bondGold(bond1) + bondGold(bond2);

    // Vínculos como texto (paridad toJSON: bond + '\n\n' + bond2)
    let bondsText = bond1.description;
    if (bond2) bondsText += "\n\n" + bond2.description;

    // Notas (paridad: pregunta + opción de cada tabla)
    const notes =
      background.table1.question +
      "\n" +
      t1.description +
      "\n" +
      background.table2.question +
      "\n" +
      t2.description;

    return {
      name,
      background: key,
      strengthMax,
      dexterityMax,
      willpowerMax,
      hpMax,
      gold,
      items,
      containers,
      description: background.background_description,
      traits: traitsText(age, tts),
      notes,
      bonds: bondsText,
      omens: omen,
      imageUrl: "default-portrait.webp",
    };
  }
}
```

- [ ] **Step 4: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/core test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/application/character/RollCharacter.ts packages/core/src/application/character/RollCharacter.test.ts
git commit -m "feat(core): RollCharacter (generación aleatoria con paridad de generate_character)"
```

---

## Task 10: `core` — barrel de `application/character` y exports del núcleo

**Files:**
- Create: `packages/core/src/application/character/index.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Crear `packages/core/src/application/character/index.ts`**

```ts
export { CharacterError } from "./errors.js";
export type { CharacterErrorCode } from "./errors.js";
export { ListCharacters } from "./ListCharacters.js";
export { GetCharacter } from "./GetCharacter.js";
export type { GetCharacterQuery } from "./GetCharacter.js";
export { DeleteCharacter } from "./DeleteCharacter.js";
export type { DeleteCharacterCommand } from "./DeleteCharacter.js";
export { CreateCharacter } from "./CreateCharacter.js";
export type { CreateCharacterCommand } from "./CreateCharacter.js";
export { UpdateCharacter } from "./UpdateCharacter.js";
export type { UpdateCharacterCommand } from "./UpdateCharacter.js";
export { RollCharacter } from "./RollCharacter.js";
export type { RollCharacterQuery } from "./RollCharacter.js";
```

- [ ] **Step 2: Actualizar `packages/core/src/index.ts`**

Añadir al final (junto a los exports de dominio y auth ya presentes):

```ts
// Character — dominio puro
export * from "./domain/character/traits.js";
export * from "./domain/character/creation.js";

// Character — casos de uso
export * from "./application/character/index.js";
```

- [ ] **Step 3: Typecheck y tests del core**

Run: `pnpm --filter @kw/core typecheck && pnpm --filter @kw/core test`
Expected: sin errores de tipos; todos los tests del core en verde.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/application/character/index.ts packages/core/src/index.ts
git commit -m "feat(core): barrel de casos de uso de personaje y exports del núcleo"
```

---

## Task 11: `server` — adaptador FileGameDataRepository (TDD)

**Files:**
- Create: `packages/server/src/infrastructure/gamedata/FileGameDataRepository.ts`
- Create: `packages/server/src/infrastructure/gamedata/FileGameDataRepository.test.ts`

> Paridad con `app/lib/data.py`: consolida los JSON de `data/backgrounds/*.json` (merge de dicts, igual que `consolidate_json_files`), y lee `bonds.json` (`{"Bonds":[...]}`), `omens.json` (`{"Omens":[...]}` → lista de descripciones), `traits.json`, `scars.json` (`{"Scars":[...]}`). Carga **una vez** y cachea (el origen consolida al arrancar).

- [ ] **Step 1: Escribir el test que falla `FileGameDataRepository.test.ts`**

Crea un directorio temporal con un par de backgrounds y los ficheros de bonds/omens/traits/scars; verifica la consolidación y los parseos.

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileGameDataRepository } from "./FileGameDataRepository.js";

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "kw-data-"));
  mkdirSync(join(dir, "backgrounds"));
  writeFileSync(
    join(dir, "backgrounds", "aurifex.json"),
    JSON.stringify({
      Aurifex: {
        background_description: "An artisan.",
        names: ["Hestia"],
        starting_gear: [{ name: "Lantern", tags: [] }],
        table1: { question: "q1", options: [{ description: "o1" }] },
        table2: { question: "q2", options: [{ description: "o2" }] },
      },
    })
  );
  writeFileSync(
    join(dir, "backgrounds", "cutpurse.json"),
    JSON.stringify({
      Cutpurse: {
        background_description: "A thief.",
        names: ["Sly"],
        starting_gear: [],
        table1: { question: "q1", options: [{ description: "o1" }] },
        table2: { question: "q2", options: [{ description: "o2" }] },
      },
    })
  );
  writeFileSync(
    join(dir, "bonds.json"),
    JSON.stringify({ Bonds: [{ description: "A gem.", gold: 5 }] })
  );
  writeFileSync(
    join(dir, "omens.json"),
    JSON.stringify({ Omens: [{ description: "The river runs black." }] })
  );
  writeFileSync(
    join(dir, "traits.json"),
    JSON.stringify({ Physique: ["Athletic"], Skin: ["Tanned"] })
  );
  writeFileSync(
    join(dir, "scars.json"),
    JSON.stringify({ Scars: [{ name: "Lasting Scar", description: "Roll 1d6." }] })
  );
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("FileGameDataRepository", () => {
  it("consolida los backgrounds individuales en un mapa", () => {
    const repo = new FileGameDataRepository(dir);
    const bkgs = repo.backgrounds();
    expect(Object.keys(bkgs).sort()).toEqual(["Aurifex", "Cutpurse"]);
    expect(repo.background("Aurifex")?.names).toEqual(["Hestia"]);
  });

  it("parsea bonds, omens (a lista de descripciones), traits y scars", () => {
    const repo = new FileGameDataRepository(dir);
    expect(repo.bonds()[0]!.description).toBe("A gem.");
    expect(repo.omens()).toEqual(["The river runs black."]);
    expect(repo.traits().Physique).toEqual(["Athletic"]);
    expect(repo.scars()[0]!.name).toBe("Lasting Scar");
  });

  it("background devuelve null para un nombre inexistente", () => {
    const repo = new FileGameDataRepository(dir);
    expect(repo.background("Nope")).toBeNull();
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/server test FileGameDataRepository`
Expected: FAIL — "Cannot find module './FileGameDataRepository.js'".

- [ ] **Step 3: Implementar `packages/server/src/infrastructure/gamedata/FileGameDataRepository.ts`**

```ts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  BackgroundsSchema,
  BondSchema,
  TraitsSchema,
  ScarSchema,
  type Backgrounds,
  type Background,
  type Bond,
  type Traits,
  type Scar,
} from "@kw/shared";
import { z } from "zod";
import type { GameDataRepository } from "@kw/core";

const BondsFileSchema = z.object({ Bonds: z.array(BondSchema) });
const OmensFileSchema = z.object({
  Omens: z.array(z.object({ description: z.string() }).passthrough()),
});
const ScarsFileSchema = z.object({ Scars: z.array(ScarSchema) });

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

export class FileGameDataRepository implements GameDataRepository {
  private _backgrounds: Backgrounds | null = null;
  private _bonds: Bond[] | null = null;
  private _omens: string[] | null = null;
  private _traits: Traits | null = null;
  private _scars: Scar[] | null = null;

  constructor(private readonly dataDir: string) {}

  /** Consolida data/backgrounds/*.json en un único mapa (paridad consolidate_json_files). */
  backgrounds(): Backgrounds {
    if (this._backgrounds) return this._backgrounds;
    const dir = join(this.dataDir, "backgrounds");
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".json") && f !== "background_data.json")
      .sort();
    const merged: Record<string, unknown> = {};
    for (const f of files) {
      const data = readJson(join(dir, f));
      if (data && typeof data === "object" && !Array.isArray(data)) {
        Object.assign(merged, data as Record<string, unknown>);
      }
    }
    this._backgrounds = BackgroundsSchema.parse(merged);
    return this._backgrounds;
  }

  background(name: string): Background | null {
    return this.backgrounds()[name] ?? null;
  }

  bonds(): Bond[] {
    if (this._bonds) return this._bonds;
    const parsed = BondsFileSchema.parse(readJson(join(this.dataDir, "bonds.json")));
    this._bonds = parsed.Bonds;
    return this._bonds;
  }

  omens(): string[] {
    if (this._omens) return this._omens;
    const parsed = OmensFileSchema.parse(readJson(join(this.dataDir, "omens.json")));
    this._omens = parsed.Omens.map((o) => o.description);
    return this._omens;
  }

  traits(): Traits {
    if (this._traits) return this._traits;
    this._traits = TraitsSchema.parse(readJson(join(this.dataDir, "traits.json")));
    return this._traits;
  }

  scars(): Scar[] {
    if (this._scars) return this._scars;
    const parsed = ScarsFileSchema.parse(readJson(join(this.dataDir, "scars.json")));
    this._scars = parsed.Scars;
    return this._scars;
  }
}
```

- [ ] **Step 4: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/server test FileGameDataRepository`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/infrastructure/gamedata/FileGameDataRepository.ts packages/server/src/infrastructure/gamedata/FileGameDataRepository.test.ts
git commit -m "feat(server): FileGameDataRepository (consolida backgrounds + carga bonds/omens/traits/scars)"
```

---

## Task 12: `server` — adaptador CryptoDice

**Files:**
- Create: `packages/server/src/infrastructure/rng/CryptoDice.ts`

> Implementa `Dice` con `randomInt` de `node:crypto`. Paridad numérica con `roll_dice` (1..face inclusive) y `roll_list`. No lleva test propio (es aleatorio); se verifica indirectamente vía las rutas. Su corrección estructural se apoya en la cobertura de `SequenceDice` en los casos de uso.

- [ ] **Step 1: Implementar `packages/server/src/infrastructure/rng/CryptoDice.ts`**

```ts
import { randomInt } from "node:crypto";
import type { Dice } from "@kw/core";

export class CryptoDice implements Dice {
  /** randomInt(min, max) es [min, max); +1 para incluir face. */
  roll(face: number): number {
    return randomInt(1, face + 1);
  }

  rollMulti(face: number, count: number): { results: number[]; total: number } {
    const results: number[] = [];
    let total = 0;
    for (let i = 0; i < count; i++) {
      const v = this.roll(face);
      results.push(v);
      total += v;
    }
    return { results, total };
  }

  pick<T>(list: T[]): T {
    return list[this.roll(list.length) - 1]!;
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @kw/server typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/infrastructure/rng/CryptoDice.ts
git commit -m "feat(server): adaptador CryptoDice (Dice con node:crypto)"
```

---

## Task 13: `server` — PrismaCharacterRepository con serialización JSON↔Zod (TDD)

**Files:**
- Create: `packages/server/src/infrastructure/persistence/prisma/PrismaCharacterRepository.ts`
- Create: `packages/server/src/infrastructure/persistence/prisma/PrismaCharacterRepository.test.ts`

> Paridad con el modelo `Character`: `items`/`containers` se guardan como **String JSON** en columnas (esquema Prisma de Fase 1). Al leer, se parsea y **valida con Zod** (`ItemSchema`/`ContainerSchema`); al escribir, se serializa. `id === 0` => create; en otro caso, update.

- [ ] **Step 1: Escribir el test que falla `PrismaCharacterRepository.test.ts`**

Sigue el patrón de `PrismaUserRepository.test.ts` (SQLite temporal con `prisma db push`). Crea un usuario propietario primero (FK `ownerId`).

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import type { Character } from "@kw/shared";
import { PrismaCharacterRepository } from "./PrismaCharacterRepository.js";

let dir: string;
let prisma: PrismaClient;
let ownerId: number;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "kw-char-"));
  const dbUrl = `file:${join(dir, "test.db")}`;
  execSync("pnpm exec prisma db push --skip-generate", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: "ignore",
  });
  prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  const user = await prisma.user.create({
    data: { email: "o@e.com", username: "owner", passwordHash: "h", confirmed: true },
  });
  ownerId = user.id;
});

afterAll(async () => {
  await prisma.$disconnect();
  rmSync(dir, { recursive: true, force: true });
});

const baseChar = (over: Partial<Character>): Character => ({
  id: 0,
  ownerId,
  name: "Hero",
  background: "Aurifex",
  strength: 10,
  strengthMax: 10,
  dexterity: 10,
  dexterityMax: 10,
  willpower: 10,
  willpowerMax: 10,
  hp: 5,
  hpMax: 5,
  deprived: false,
  panicked: false,
  gold: 3,
  items: [{ id: 1, name: "Lantern", location: 0, tags: [] }],
  containers: [{ id: 0, name: "Main", slots: 10 }],
  description: "desc",
  traits: null,
  notes: null,
  bonds: null,
  scars: "",
  omens: null,
  armor: "0",
  imageUrl: null,
  partyId: null,
  ...over,
});

describe("PrismaCharacterRepository", () => {
  it("guarda un personaje nuevo y lo recupera con items/containers parseados", async () => {
    const repo = new PrismaCharacterRepository(prisma);
    const saved = await repo.save(baseChar({ name: "Rune" }));
    expect(saved.id).toBeGreaterThan(0);

    const got = await repo.findById(saved.id);
    expect(got?.name).toBe("Rune");
    expect(got?.items).toHaveLength(1);
    expect(got?.items[0]!.name).toBe("Lantern");
    expect(got?.containers[0]!.slots).toBe(10);
  });

  it("findByOwner devuelve los del propietario", async () => {
    const repo = new PrismaCharacterRepository(prisma);
    await repo.save(baseChar({ name: "X" }));
    const list = await repo.findByOwner(ownerId);
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.every((c) => c.ownerId === ownerId)).toBe(true);
  });

  it("actualiza un personaje existente (id != 0)", async () => {
    const repo = new PrismaCharacterRepository(prisma);
    const saved = await repo.save(baseChar({ name: "Y", gold: 1 }));
    await repo.save({ ...saved, gold: 99 });
    const reloaded = await repo.findById(saved.id);
    expect(reloaded?.gold).toBe(99);
  });

  it("delete elimina el personaje", async () => {
    const repo = new PrismaCharacterRepository(prisma);
    const saved = await repo.save(baseChar({ name: "Z" }));
    await repo.delete(saved.id);
    expect(await repo.findById(saved.id)).toBeNull();
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/server test PrismaCharacterRepository`
Expected: FAIL — "Cannot find module './PrismaCharacterRepository.js'".

- [ ] **Step 3: Implementar `packages/server/src/infrastructure/persistence/prisma/PrismaCharacterRepository.ts`**

```ts
import type { PrismaClient } from "@prisma/client";
import {
  ItemSchema,
  ContainerSchema,
  type Character,
  type Item,
  type Container,
} from "@kw/shared";
import { z } from "zod";
import type { CharacterRepository } from "@kw/core";

const ItemsSchema = z.array(ItemSchema);
const ContainersSchema = z.array(ContainerSchema);

type Row = {
  id: number;
  ownerId: number;
  name: string;
  background: string;
  strength: number;
  strengthMax: number;
  dexterity: number;
  dexterityMax: number;
  willpower: number;
  willpowerMax: number;
  hp: number;
  hpMax: number;
  deprived: boolean;
  panicked: boolean;
  gold: number;
  items: string;
  containers: string;
  description: string | null;
  traits: string | null;
  notes: string | null;
  bonds: string | null;
  scars: string | null;
  omens: string | null;
  armor: string | null;
  imageUrl: string | null;
  partyId: number | null;
};

function parseItems(raw: string): Item[] {
  return ItemsSchema.parse(JSON.parse(raw));
}
function parseContainers(raw: string): Container[] {
  return ContainersSchema.parse(JSON.parse(raw));
}

function toEntity(row: Row): Character {
  return {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    background: row.background,
    strength: row.strength,
    strengthMax: row.strengthMax,
    dexterity: row.dexterity,
    dexterityMax: row.dexterityMax,
    willpower: row.willpower,
    willpowerMax: row.willpowerMax,
    hp: row.hp,
    hpMax: row.hpMax,
    deprived: row.deprived,
    panicked: row.panicked,
    gold: row.gold,
    items: parseItems(row.items),
    containers: parseContainers(row.containers),
    description: row.description,
    traits: row.traits,
    notes: row.notes,
    bonds: row.bonds,
    scars: row.scars,
    omens: row.omens,
    armor: row.armor,
    imageUrl: row.imageUrl,
    partyId: row.partyId,
  };
}

function toData(c: Character) {
  return {
    ownerId: c.ownerId,
    name: c.name,
    background: c.background,
    strength: c.strength,
    strengthMax: c.strengthMax,
    dexterity: c.dexterity,
    dexterityMax: c.dexterityMax,
    willpower: c.willpower,
    willpowerMax: c.willpowerMax,
    hp: c.hp,
    hpMax: c.hpMax,
    deprived: c.deprived,
    panicked: c.panicked,
    gold: c.gold,
    items: JSON.stringify(ItemsSchema.parse(c.items)),
    containers: JSON.stringify(ContainersSchema.parse(c.containers)),
    description: c.description,
    traits: c.traits,
    notes: c.notes,
    bonds: c.bonds,
    scars: c.scars,
    omens: c.omens,
    armor: c.armor,
    imageUrl: c.imageUrl,
    partyId: c.partyId,
  };
}

export class PrismaCharacterRepository implements CharacterRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: number): Promise<Character | null> {
    const row = await this.prisma.character.findUnique({ where: { id } });
    return row ? toEntity(row as Row) : null;
  }

  async findByOwner(ownerId: number): Promise<Character[]> {
    const rows = await this.prisma.character.findMany({ where: { ownerId } });
    return rows.map((r) => toEntity(r as Row));
  }

  async save(character: Character): Promise<Character> {
    const data = toData(character);
    if (character.id === 0) {
      const created = await this.prisma.character.create({ data });
      return toEntity(created as Row);
    }
    const updated = await this.prisma.character.update({
      where: { id: character.id },
      data,
    });
    return toEntity(updated as Row);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.character.delete({ where: { id } });
  }
}
```

- [ ] **Step 4: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/server test PrismaCharacterRepository`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/infrastructure/persistence/prisma/PrismaCharacterRepository.ts packages/server/src/infrastructure/persistence/prisma/PrismaCharacterRepository.test.ts
git commit -m "feat(server): PrismaCharacterRepository con serialización JSON<->Zod"
```

---

## Task 14: `server` — rutas HTTP de personajes (TDD)

**Files:**
- Create: `packages/server/src/interfaces/http/characterRoutes.ts`
- Create: `packages/server/src/interfaces/http/characterRoutes.test.ts`

> Patrón idéntico a `authRoutes.ts`: plugin Fastify que recibe los casos de uso por parámetro, valida el body con Zod del borde, mapea `CharacterError` a HTTP, y exige sesión (`req.session.user`). Rutas:
> - `GET /api/characters` → lista del usuario.
> - `POST /api/characters` → crear (body `CreateCharacterInput`).
> - `GET /api/characters/:id` → ver uno (propio).
> - `PATCH /api/characters/:id` → actualizar.
> - `DELETE /api/characters/:id` → borrar.
> - `POST /api/characters/roll` → generar `CreateCharacterInput` aleatorio (no persiste; el cliente decide).

- [ ] **Step 1: Escribir el test que falla `characterRoutes.test.ts`**

Levanta Fastify con sesión (como `authRoutes.test.ts`), inyecta manualmente `req.session.user` mediante una ruta de login de prueba, y ejercita el CRUD. Usa fakes de core.

```ts
import { describe, it, expect, beforeEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import session from "@fastify/session";
import {
  ListCharacters,
  GetCharacter,
  CreateCharacter,
  UpdateCharacter,
  DeleteCharacter,
  RollCharacter,
} from "@kw/core";
import { InMemoryCharacterRepository } from "@kw/core/testing/InMemoryCharacterRepository.js";
import { FakeGameDataRepository } from "@kw/core/testing/FakeGameDataRepository.js";
import { SequenceDice } from "@kw/core/testing/SequenceDice.js";
import type { SessionUser } from "@kw/shared";
import { buildCharacterRoutes } from "./characterRoutes.js";

const sampleBackgrounds = {
  Aurifex: {
    background_description: "An artisan.",
    names: ["Hestia"],
    starting_gear: [{ name: "Lantern", tags: [] }],
    table1: { question: "q1", options: [{ description: "o1" }] },
    table2: { question: "q2", options: [{ description: "o2" }] },
  },
};
const sampleTraits = {
  Physique: ["Athletic"],
  Skin: ["Tanned"],
  Hair: ["Braided"],
  Face: ["Broken"],
  Speech: ["Booming"],
  Clothing: ["Antique"],
  Virtue: ["Ambitious"],
  Vice: ["Aggressive"],
};

async function buildApp() {
  const characters = new InMemoryCharacterRepository();
  const gameData = new FakeGameDataRepository({
    backgrounds: sampleBackgrounds,
    bonds: [{ description: "A gem.", gold: 5 }],
    omens: ["The river runs black."],
    traits: sampleTraits,
  });
  const dice = new SequenceDice([
    1, // name
    1, 1, // table1, table2
    1, // bond
    1, // omen
    1, 1, 1, 1, 1, 1, 1, 1, // traits
    1, 1, 1, // gold
    1, 1, // age
    1, 1, 1, // str
    1, 1, 1, // dex
    1, 1, 1, // wil
    1, // hp
  ]);

  const uc = {
    list: new ListCharacters(characters),
    get: new GetCharacter(characters),
    create: new CreateCharacter(characters),
    update: new UpdateCharacter(characters),
    remove: new DeleteCharacter(characters),
    roll: new RollCharacter(gameData, dice),
  };

  const app = Fastify();
  await app.register(cookie);
  await app.register(session, {
    secret: "test-secret-test-secret-test-secret",
    cookieName: "kw_session",
    cookie: { secure: false, httpOnly: true, path: "/" },
  });
  // ruta de prueba para fijar la sesión
  app.post<{ Body: SessionUser }>("/test-login", async (req, reply) => {
    req.session.user = req.body;
    return reply.send({ ok: true });
  });
  await app.register(buildCharacterRoutes(uc), { prefix: "/api/characters" });
  await app.ready();
  return { app, characters };
}

async function login(app: FastifyInstance, user: SessionUser): Promise<string> {
  const res = await app.inject({ method: "POST", url: "/test-login", payload: user });
  const setCookie = res.headers["set-cookie"];
  return Array.isArray(setCookie) ? setCookie[0]! : (setCookie as string);
}

const owner: SessionUser = { id: 1, username: "owner", email: "o@e.com" };

const createPayload = {
  name: "Rune",
  background: "Aurifex",
  strengthMax: 10,
  dexterityMax: 10,
  willpowerMax: 10,
  hpMax: 6,
  gold: 0,
  items: [],
  containers: [{ id: 0, name: "Main", slots: 10 }],
};

describe("character routes", () => {
  let ctx: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    ctx = await buildApp();
  });

  it("rechaza sin sesión con 401", async () => {
    const res = await ctx.app.inject({ method: "GET", url: "/api/characters" });
    expect(res.statusCode).toBe(401);
  });

  it("crea, lista, lee, actualiza y borra un personaje", async () => {
    const cookie = await login(ctx.app, owner);

    const created = await ctx.app.inject({
      method: "POST",
      url: "/api/characters",
      headers: { cookie },
      payload: createPayload,
    });
    expect(created.statusCode).toBe(201);
    const id = created.json().character.id as number;
    expect(id).toBeGreaterThan(0);
    expect(created.json().character.hp).toBe(6);

    const list = await ctx.app.inject({
      method: "GET",
      url: "/api/characters",
      headers: { cookie },
    });
    expect(list.json().characters).toHaveLength(1);

    const got = await ctx.app.inject({
      method: "GET",
      url: `/api/characters/${id}`,
      headers: { cookie },
    });
    expect(got.json().character.name).toBe("Rune");

    const patched = await ctx.app.inject({
      method: "PATCH",
      url: `/api/characters/${id}`,
      headers: { cookie },
      payload: { gold: 50 },
    });
    expect(patched.json().character.gold).toBe(50);

    const deleted = await ctx.app.inject({
      method: "DELETE",
      url: `/api/characters/${id}`,
      headers: { cookie },
    });
    expect(deleted.statusCode).toBe(200);
  });

  it("404 al leer un personaje de otro usuario", async () => {
    const cookieA = await login(ctx.app, owner);
    const created = await ctx.app.inject({
      method: "POST",
      url: "/api/characters",
      headers: { cookie: cookieA },
      payload: createPayload,
    });
    const id = created.json().character.id as number;

    const other: SessionUser = { id: 2, username: "other", email: "x@e.com" };
    const cookieB = await login(ctx.app, other);
    const got = await ctx.app.inject({
      method: "GET",
      url: `/api/characters/${id}`,
      headers: { cookie: cookieB },
    });
    expect(got.statusCode).toBe(404);
  });

  it("roll devuelve un CreateCharacterInput sin persistir", async () => {
    const cookie = await login(ctx.app, owner);
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/characters/roll",
      headers: { cookie },
      payload: { background: "Aurifex" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().draft.background).toBe("Aurifex");
    expect(res.json().draft.name).toBe("Hestia");
    // no se persistió nada
    const list = await ctx.app.inject({
      method: "GET",
      url: "/api/characters",
      headers: { cookie },
    });
    expect(list.json().characters).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/server test characterRoutes`
Expected: FAIL — "Cannot find module './characterRoutes.js'".

- [ ] **Step 3: Implementar `packages/server/src/interfaces/http/characterRoutes.ts`**

```ts
import type { FastifyPluginAsync } from "fastify";
import "@fastify/session";
import {
  CharacterError,
  type ListCharacters,
  type GetCharacter,
  type CreateCharacter,
  type UpdateCharacter,
  type DeleteCharacter,
  type RollCharacter,
} from "@kw/core";
import {
  CreateCharacterInputSchema,
  UpdateCharacterInputSchema,
} from "@kw/shared";
import { z } from "zod";

export interface CharacterUseCases {
  list: ListCharacters;
  get: GetCharacter;
  create: CreateCharacter;
  update: UpdateCharacter;
  remove: DeleteCharacter;
  roll: RollCharacter;
}

const ParamsSchema = z.object({ id: z.coerce.number().int() });
const RollBodySchema = z.object({ background: z.string().default("") });

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

export function buildCharacterRoutes(uc: CharacterUseCases): FastifyPluginAsync {
  const plugin: FastifyPluginAsync = async (app) => {
    app.setErrorHandler((err, _req, reply) => {
      if (err instanceof CharacterError) {
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

    // Guard de sesión común
    app.addHook("preHandler", async (req, reply) => {
      if (!req.session.user) {
        return reply
          .status(401)
          .send({ code: "unauthenticated", message: "Not logged in" });
      }
    });

    app.get("/", async (req, reply) => {
      const characters = await uc.list.execute(req.session.user!.id);
      return reply.send({ characters });
    });

    app.post("/", async (req, reply) => {
      const input = CreateCharacterInputSchema.parse(req.body);
      const character = await uc.create.execute({
        ownerId: req.session.user!.id,
        input,
      });
      return reply.status(201).send({ character });
    });

    app.post("/roll", async (req, reply) => {
      const { background } = RollBodySchema.parse(req.body);
      const draft = await uc.roll.execute({ background });
      return reply.send({ draft });
    });

    app.get("/:id", async (req, reply) => {
      const { id } = ParamsSchema.parse(req.params);
      const character = await uc.get.execute({ id, ownerId: req.session.user!.id });
      return reply.send({ character });
    });

    app.patch("/:id", async (req, reply) => {
      const { id } = ParamsSchema.parse(req.params);
      const input = UpdateCharacterInputSchema.parse(req.body);
      const character = await uc.update.execute({
        id,
        ownerId: req.session.user!.id,
        input,
      });
      return reply.send({ character });
    });

    app.delete("/:id", async (req, reply) => {
      const { id } = ParamsSchema.parse(req.params);
      await uc.remove.execute({ id, ownerId: req.session.user!.id });
      return reply.send({ ok: true });
    });
  };
  return plugin;
}
```

- [ ] **Step 4: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/server test characterRoutes`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/interfaces/http/characterRoutes.ts packages/server/src/interfaces/http/characterRoutes.test.ts
git commit -m "feat(server): rutas /api/characters/* (CRUD + roll) con guard de sesión"
```

---

## Task 15: `server` — rutas de datos de juego (/api/data, TDD)

**Files:**
- Create: `packages/server/src/interfaces/http/dataRoutes.ts`
- Create: `packages/server/src/interfaces/http/dataRoutes.test.ts`

> Expone los datos de juego para alimentar la creación en el front:
> - `GET /api/data/backgrounds` → mapa de trasfondos.
> - `GET /api/data/bonds`, `GET /api/data/omens`, `GET /api/data/traits`, `GET /api/data/scars`.
> Públicas (sin guard de sesión): son datos de referencia estáticos, igual que el origen las sirve en la página de creación.

- [ ] **Step 1: Escribir el test que falla `dataRoutes.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import Fastify from "fastify";
import { FakeGameDataRepository } from "@kw/core/testing/FakeGameDataRepository.js";
import { buildDataRoutes } from "./dataRoutes.js";

async function buildApp() {
  const gameData = new FakeGameDataRepository({
    backgrounds: {
      Aurifex: {
        background_description: "An artisan.",
        names: ["Hestia"],
        starting_gear: [],
        table1: { question: "q1", options: [{ description: "o1" }] },
        table2: { question: "q2", options: [{ description: "o2" }] },
      },
    },
    bonds: [{ description: "A gem." }],
    omens: ["The river runs black."],
    traits: { Physique: ["Athletic"] },
    scars: [{ name: "Lasting Scar", description: "Roll 1d6." }],
  });
  const app = Fastify();
  await app.register(buildDataRoutes(gameData), { prefix: "/api/data" });
  await app.ready();
  return app;
}

describe("data routes", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });

  it("GET /api/data/backgrounds devuelve el mapa de trasfondos", async () => {
    const res = await app.inject({ method: "GET", url: "/api/data/backgrounds" });
    expect(res.statusCode).toBe(200);
    expect(res.json().backgrounds.Aurifex.names).toEqual(["Hestia"]);
  });

  it("GET /api/data/bonds, omens, traits, scars", async () => {
    expect(
      (await app.inject({ method: "GET", url: "/api/data/bonds" })).json().bonds[0].description
    ).toBe("A gem.");
    expect(
      (await app.inject({ method: "GET", url: "/api/data/omens" })).json().omens
    ).toEqual(["The river runs black."]);
    expect(
      (await app.inject({ method: "GET", url: "/api/data/traits" })).json().traits.Physique
    ).toEqual(["Athletic"]);
    expect(
      (await app.inject({ method: "GET", url: "/api/data/scars" })).json().scars[0].name
    ).toBe("Lasting Scar");
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/server test dataRoutes`
Expected: FAIL — "Cannot find module './dataRoutes.js'".

- [ ] **Step 3: Implementar `packages/server/src/interfaces/http/dataRoutes.ts`**

```ts
import type { FastifyPluginAsync } from "fastify";
import type { GameDataRepository } from "@kw/core";

export function buildDataRoutes(data: GameDataRepository): FastifyPluginAsync {
  const plugin: FastifyPluginAsync = async (app) => {
    app.get("/backgrounds", async (_req, reply) =>
      reply.send({ backgrounds: data.backgrounds() })
    );
    app.get("/bonds", async (_req, reply) => reply.send({ bonds: data.bonds() }));
    app.get("/omens", async (_req, reply) => reply.send({ omens: data.omens() }));
    app.get("/traits", async (_req, reply) => reply.send({ traits: data.traits() }));
    app.get("/scars", async (_req, reply) => reply.send({ scars: data.scars() }));
  };
  return plugin;
}
```

- [ ] **Step 4: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/server test dataRoutes`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/interfaces/http/dataRoutes.ts packages/server/src/interfaces/http/dataRoutes.test.ts
git commit -m "feat(server): rutas /api/data/* (backgrounds, bonds, omens, traits, scars)"
```

---

## Task 16: `server` — cablear en el composition root (main.ts)

**Files:**
- Modify: `packages/server/src/main.ts`
- Modify: `packages/server/src/infrastructure/config/env.ts`

- [ ] **Step 1: Añadir `DATA_DIR` al esquema de env**

En `packages/server/src/infrastructure/config/env.ts`, añadir dentro de `EnvSchema` (junto a `DATABASE_URL`):

```ts
  DATA_DIR: z.string().default("../../data"),
```

> Por defecto apunta a `data/` en la raíz del monorepo, relativo a `packages/server`. En producción se ajusta por env.

- [ ] **Step 2: Importar los nuevos adaptadores y casos de uso en `main.ts`**

Añadir a los imports de `main.ts` (junto a los de auth):

```ts
import { PrismaCharacterRepository } from "./infrastructure/persistence/prisma/PrismaCharacterRepository.js";
import { FileGameDataRepository } from "./infrastructure/gamedata/FileGameDataRepository.js";
import { CryptoDice } from "./infrastructure/rng/CryptoDice.js";
import { buildCharacterRoutes } from "./interfaces/http/characterRoutes.js";
import { buildDataRoutes } from "./interfaces/http/dataRoutes.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
```

Y ampliar el import de `@kw/core` (que ya trae los casos de uso de auth) con:

```ts
import {
  // ...los de auth ya existentes...
  ListCharacters,
  GetCharacter,
  CreateCharacter,
  UpdateCharacter,
  DeleteCharacter,
  RollCharacter,
} from "@kw/core";
```

> Nota para el worker: fusiona estos nombres dentro del bloque `import { ... } from "@kw/core"` ya presente en `main.ts`; no dupliques el import.

- [ ] **Step 3: Instanciar adaptadores y casos de uso de personaje**

En `main.ts`, tras el bloque de adaptadores driven de auth (después de crear `captcha`), añadir:

```ts
  // ---- adaptadores de personajes/datos de juego ----
  const characters = new PrismaCharacterRepository(prisma);
  const here = resolve(fileURLToPath(import.meta.url), "..");
  const dataDir = resolve(here, env.DATA_DIR);
  const gameData = new FileGameDataRepository(dataDir);
  const dice = new CryptoDice();

  const characterUseCases = {
    list: new ListCharacters(characters),
    get: new GetCharacter(characters),
    create: new CreateCharacter(characters),
    update: new UpdateCharacter(characters),
    remove: new DeleteCharacter(characters),
    roll: new RollCharacter(gameData, dice),
  };
```

- [ ] **Step 4: Registrar las rutas nuevas**

En `main.ts`, tras `await app.register(buildAuthRoutes(authUseCases), { prefix: "/api/auth" });`, añadir:

```ts
  await app.register(buildCharacterRoutes(characterUseCases), {
    prefix: "/api/characters",
  });
  await app.register(buildDataRoutes(gameData), { prefix: "/api/data" });
```

- [ ] **Step 5: Typecheck del server**

Run: `pnpm --filter @kw/server typecheck`
Expected: sin errores.

- [ ] **Step 6: Arrancar y comprobar las rutas**

Run (terminal 1): `cd packages/server && pnpm dev`
Run (terminal 2):
```bash
curl http://127.0.0.1:8000/api/data/backgrounds | head -c 120
curl -i http://127.0.0.1:8000/api/characters
```
Expected: `/api/data/backgrounds` devuelve JSON con trasfondos; `/api/characters` sin sesión devuelve `401`. Parar el server (Ctrl+C).

- [ ] **Step 7: Commit**

```bash
git add packages/server/src/main.ts packages/server/src/infrastructure/config/env.ts
git commit -m "feat(server): cablear personajes y datos de juego en el composition root"
```

---

## Task 17: `web` — cliente de API de personajes y datos

**Files:**
- Create: `packages/web/src/api/characters.ts`

- [ ] **Step 1: Crear `packages/web/src/api/characters.ts`**

Reutiliza el patrón de `api/auth.ts` (`ApiError`, `credentials: include`).

```ts
import type {
  Character,
  CreateCharacterInput,
  UpdateCharacterInput,
  Backgrounds,
  Bond,
  Traits,
  Scar,
} from "@kw/shared";
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

export const charactersApi = {
  list: () =>
    getJson<{ characters: Character[] }>("/api/characters").then((d) => d.characters),
  get: (id: number) =>
    getJson<{ character: Character }>(`/api/characters/${id}`).then((d) => d.character),
  create: (input: CreateCharacterInput) =>
    send<{ character: Character }>("POST", "/api/characters", input).then(
      (d) => d.character
    ),
  update: (id: number, input: UpdateCharacterInput) =>
    send<{ character: Character }>("PATCH", `/api/characters/${id}`, input).then(
      (d) => d.character
    ),
  remove: (id: number) => send<{ ok: true }>("DELETE", `/api/characters/${id}`),
  roll: (background: string) =>
    send<{ draft: CreateCharacterInput }>("POST", "/api/characters/roll", {
      background,
    }).then((d) => d.draft),
};

export const dataApi = {
  backgrounds: () =>
    getJson<{ backgrounds: Backgrounds }>("/api/data/backgrounds").then(
      (d) => d.backgrounds
    ),
  bonds: () => getJson<{ bonds: Bond[] }>("/api/data/bonds").then((d) => d.bonds),
  omens: () => getJson<{ omens: string[] }>("/api/data/omens").then((d) => d.omens),
  traits: () => getJson<{ traits: Traits }>("/api/data/traits").then((d) => d.traits),
  scars: () => getJson<{ scars: Scar[] }>("/api/data/scars").then((d) => d.scars),
};
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @kw/web typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/api/characters.ts
git commit -m "feat(web): cliente de API de personajes y datos de juego"
```

---

## Task 18: `web` — hooks TanStack Query de personajes

**Files:**
- Create: `packages/web/src/characters/useCharacters.ts`

- [ ] **Step 1: Crear `packages/web/src/characters/useCharacters.ts`**

```ts
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  CreateCharacterInput,
  UpdateCharacterInput,
} from "@kw/shared";
import { charactersApi, dataApi } from "../api/characters.js";

export function useCharacters() {
  return useQuery({
    queryKey: ["characters"],
    queryFn: charactersApi.list,
  });
}

export function useCharacter(id: number) {
  return useQuery({
    queryKey: ["characters", id],
    queryFn: () => charactersApi.get(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useCreateCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCharacterInput) => charactersApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["characters"] }),
  });
}

export function useUpdateCharacter(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCharacterInput) => charactersApi.update(id, input),
    onSuccess: (character) => {
      qc.setQueryData(["characters", id], character);
      qc.invalidateQueries({ queryKey: ["characters"] });
    },
  });
}

export function useDeleteCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => charactersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["characters"] }),
  });
}

export function useRollCharacter() {
  return useMutation({
    mutationFn: (background: string) => charactersApi.roll(background),
  });
}

export function useBackgrounds() {
  return useQuery({ queryKey: ["data", "backgrounds"], queryFn: dataApi.backgrounds });
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @kw/web typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/characters/useCharacters.ts
git commit -m "feat(web): hooks TanStack Query de personajes y datos"
```

---

## Task 19: `web` — lista de personajes y vista de personaje

**Files:**
- Create: `packages/web/src/characters/CharacterListPage.tsx`
- Create: `packages/web/src/characters/CharacterViewPage.tsx`

- [ ] **Step 1: Crear `packages/web/src/characters/CharacterListPage.tsx`**

```tsx
import { Link } from "react-router-dom";
import { useCharacters, useDeleteCharacter } from "./useCharacters.js";

export function CharacterListPage() {
  const { data: characters, isLoading, error } = useCharacters();
  const del = useDeleteCharacter();

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>Failed to load characters.</p>;

  return (
    <div>
      <h1>Characters</h1>
      <p>
        <Link to="/characters/new">+ New character</Link>
      </p>
      {characters && characters.length === 0 ? (
        <p>No characters yet.</p>
      ) : (
        <ul>
          {characters?.map((c) => (
            <li key={c.id}>
              <Link to={`/characters/${c.id}`}>{c.name}</Link> — {c.background}{" "}
              <button
                onClick={() => del.mutate(c.id)}
                disabled={del.isPending}
                aria-label={`Delete ${c.name}`}
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

- [ ] **Step 2: Crear `packages/web/src/characters/CharacterViewPage.tsx`**

```tsx
import { Link, useParams } from "react-router-dom";
import { useCharacter } from "./useCharacters.js";

export function CharacterViewPage() {
  const { id } = useParams();
  const charId = Number(id);
  const { data: character, isLoading, error } = useCharacter(charId);

  if (isLoading) return <p>Loading…</p>;
  if (error || !character) return <p>Character not found.</p>;

  return (
    <div>
      <h1>{character.name}</h1>
      <p>
        <Link to="/characters">← Back</Link> ·{" "}
        <Link to={`/characters/${character.id}/edit`}>Edit</Link>
      </p>
      <p>Background: {character.background}</p>
      <ul>
        <li>
          STR {character.strength}/{character.strengthMax}
        </li>
        <li>
          DEX {character.dexterity}/{character.dexterityMax}
        </li>
        <li>
          WIL {character.willpower}/{character.willpowerMax}
        </li>
        <li>
          HP {character.hp}/{character.hpMax}
        </li>
        <li>Armor: {character.armor ?? "0"}</li>
        <li>Gold: {character.gold}</li>
      </ul>
      {character.bonds && (
        <section>
          <h2>Bonds</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{character.bonds}</p>
        </section>
      )}
      {character.omens && (
        <section>
          <h2>Omens</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{character.omens}</p>
        </section>
      )}
      {character.traits && (
        <section>
          <h2>Traits</h2>
          <p>{character.traits}</p>
        </section>
      )}
      <section>
        <h2>Inventory</h2>
        <ul>
          {character.items.map((it) => (
            <li key={it.id}>
              {it.name}
              {it.tags.length > 0 ? ` (${it.tags.join(", ")})` : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @kw/web typecheck`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/characters/CharacterListPage.tsx packages/web/src/characters/CharacterViewPage.tsx
git commit -m "feat(web): lista y vista de personaje"
```

---

## Task 20: `web` — edición de personaje

**Files:**
- Create: `packages/web/src/characters/CharacterEditPage.tsx`

- [ ] **Step 1: Crear `packages/web/src/characters/CharacterEditPage.tsx`**

Edita los campos escalares editables (paridad `charedit_save`): name, stats actuales y max, gold, deprived, panicked, description/traits/notes/bonds/scars/omens. Items/containers se editan en la Fase 4.

```tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { UpdateCharacterInput } from "@kw/shared";
import { useCharacter, useUpdateCharacter } from "./useCharacters.js";

export function CharacterEditPage() {
  const { id } = useParams();
  const charId = Number(id);
  const navigate = useNavigate();
  const { data: character, isLoading } = useCharacter(charId);
  const update = useUpdateCharacter(charId);
  const [form, setForm] = useState<UpdateCharacterInput>({});

  useEffect(() => {
    if (character) {
      setForm({
        name: character.name,
        strength: character.strength,
        strengthMax: character.strengthMax,
        dexterity: character.dexterity,
        dexterityMax: character.dexterityMax,
        willpower: character.willpower,
        willpowerMax: character.willpowerMax,
        hp: character.hp,
        hpMax: character.hpMax,
        deprived: character.deprived,
        panicked: character.panicked,
        gold: character.gold,
        description: character.description,
        traits: character.traits,
        notes: character.notes,
        bonds: character.bonds,
        scars: character.scars,
        omens: character.omens,
      });
    }
  }, [character]);

  if (isLoading || !character) return <p>Loading…</p>;

  const num =
    (key: keyof UpdateCharacterInput) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: Number(e.target.value) }));
  const str =
    (key: keyof UpdateCharacterInput) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  const bool =
    (key: keyof UpdateCharacterInput) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.checked }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await update.mutateAsync(form);
    navigate(`/characters/${charId}`);
  };

  return (
    <form onSubmit={onSubmit}>
      <h1>Edit {character.name}</h1>
      <label>
        Name <input value={form.name ?? ""} onChange={str("name")} />
      </label>
      <fieldset>
        <legend>Attributes</legend>
        <label>
          STR <input type="number" value={form.strength ?? 0} onChange={num("strength")} />
          / <input type="number" value={form.strengthMax ?? 0} onChange={num("strengthMax")} />
        </label>
        <label>
          DEX <input type="number" value={form.dexterity ?? 0} onChange={num("dexterity")} />
          / <input type="number" value={form.dexterityMax ?? 0} onChange={num("dexterityMax")} />
        </label>
        <label>
          WIL <input type="number" value={form.willpower ?? 0} onChange={num("willpower")} />
          / <input type="number" value={form.willpowerMax ?? 0} onChange={num("willpowerMax")} />
        </label>
        <label>
          HP <input type="number" value={form.hp ?? 0} onChange={num("hp")} />
          / <input type="number" value={form.hpMax ?? 0} onChange={num("hpMax")} />
        </label>
      </fieldset>
      <label>
        Gold <input type="number" value={form.gold ?? 0} onChange={num("gold")} />
      </label>
      <label>
        <input type="checkbox" checked={form.deprived ?? false} onChange={bool("deprived")} />{" "}
        Deprived
      </label>
      <label>
        <input type="checkbox" checked={form.panicked ?? false} onChange={bool("panicked")} />{" "}
        Panicked
      </label>
      <label>
        Description
        <textarea value={form.description ?? ""} onChange={str("description")} />
      </label>
      <label>
        Traits
        <textarea value={form.traits ?? ""} onChange={str("traits")} />
      </label>
      <label>
        Bonds
        <textarea value={form.bonds ?? ""} onChange={str("bonds")} />
      </label>
      <label>
        Omens
        <textarea value={form.omens ?? ""} onChange={str("omens")} />
      </label>
      <label>
        Scars
        <textarea value={form.scars ?? ""} onChange={str("scars")} />
      </label>
      <label>
        Notes
        <textarea value={form.notes ?? ""} onChange={str("notes")} />
      </label>
      <button type="submit" disabled={update.isPending}>
        Save
      </button>
      {update.isError && <p role="alert">Failed to save.</p>}
    </form>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @kw/web typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/characters/CharacterEditPage.tsx
git commit -m "feat(web): edición de campos escalares de personaje"
```

---

## Task 21: `web` — creación de personaje multi-paso

**Files:**
- Create: `packages/web/src/characters/create/CharacterCreatePage.tsx`

> Flujo multi-paso con estado de cliente. Paso 1: elegir trasfondo (de `/api/data/backgrounds`) o "Roll all" (llama a `/api/characters/roll`). Paso 2: revisar/ajustar nombre, atributos, oro y textos del borrador. Paso 3: guardar (`POST /api/characters`) y navegar a la vista. La lógica de tirada vive en el servidor (paridad); el front solo orquesta pasos y edición.

- [ ] **Step 1: Crear `packages/web/src/characters/create/CharacterCreatePage.tsx`**

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CreateCharacterInput } from "@kw/shared";
import {
  useBackgrounds,
  useRollCharacter,
  useCreateCharacter,
} from "../useCharacters.js";

type Step = "background" | "review";

const emptyDraft = (background: string): CreateCharacterInput => ({
  name: "",
  background,
  strengthMax: 10,
  dexterityMax: 10,
  willpowerMax: 10,
  hpMax: 1,
  gold: 0,
  items: [],
  containers: [{ id: 0, name: "Main", slots: 10 }],
  description: null,
  traits: null,
  notes: null,
  bonds: null,
  omens: null,
  imageUrl: "default-portrait.webp",
});

export function CharacterCreatePage() {
  const navigate = useNavigate();
  const { data: backgrounds } = useBackgrounds();
  const roll = useRollCharacter();
  const create = useCreateCharacter();

  const [step, setStep] = useState<Step>("background");
  const [selected, setSelected] = useState("");
  const [draft, setDraft] = useState<CreateCharacterInput | null>(null);

  const rollWith = async (background: string) => {
    const d = await roll.mutateAsync(background);
    setDraft(d);
    setStep("review");
  };

  const startManual = () => {
    setDraft(emptyDraft(selected));
    setStep("review");
  };

  const onSave = async () => {
    if (!draft) return;
    const created = await create.mutateAsync(draft);
    navigate(`/characters/${created.id}`);
  };

  if (step === "background") {
    return (
      <div>
        <h1>New character</h1>
        <button onClick={() => rollWith("")} disabled={roll.isPending}>
          Roll a random character
        </button>
        <h2>…or pick a background</h2>
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Select…</option>
          {backgrounds &&
            Object.keys(backgrounds).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
        </select>
        <button onClick={() => rollWith(selected)} disabled={!selected || roll.isPending}>
          Roll this background
        </button>
        <button onClick={startManual} disabled={!selected}>
          Fill manually
        </button>
      </div>
    );
  }

  if (!draft) return null;

  const setField = <K extends keyof CreateCharacterInput>(
    key: K,
    value: CreateCharacterInput[K]
  ) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  return (
    <div>
      <h1>Review character</h1>
      <p>Background: {draft.background}</p>
      <label>
        Name
        <input
          value={draft.name}
          onChange={(e) => setField("name", e.target.value)}
        />
      </label>
      <fieldset>
        <legend>Attributes (max)</legend>
        <label>
          STR
          <input
            type="number"
            value={draft.strengthMax}
            onChange={(e) => setField("strengthMax", Number(e.target.value))}
          />
        </label>
        <label>
          DEX
          <input
            type="number"
            value={draft.dexterityMax}
            onChange={(e) => setField("dexterityMax", Number(e.target.value))}
          />
        </label>
        <label>
          WIL
          <input
            type="number"
            value={draft.willpowerMax}
            onChange={(e) => setField("willpowerMax", Number(e.target.value))}
          />
        </label>
        <label>
          HP
          <input
            type="number"
            value={draft.hpMax}
            onChange={(e) => setField("hpMax", Number(e.target.value))}
          />
        </label>
      </fieldset>
      <label>
        Gold
        <input
          type="number"
          value={draft.gold}
          onChange={(e) => setField("gold", Number(e.target.value))}
        />
      </label>
      <section>
        <h2>Starting gear</h2>
        <ul>
          {draft.items.map((it) => (
            <li key={it.id}>
              {it.name}
              {it.tags.length > 0 ? ` (${it.tags.join(", ")})` : ""}
            </li>
          ))}
        </ul>
      </section>
      {draft.bonds && (
        <p>
          <strong>Bonds:</strong> {draft.bonds}
        </p>
      )}
      {draft.omens && (
        <p>
          <strong>Omens:</strong> {draft.omens}
        </p>
      )}
      <div>
        <button onClick={() => setStep("background")}>← Back</button>
        <button onClick={onSave} disabled={!draft.name || create.isPending}>
          Save character
        </button>
      </div>
      {create.isError && <p role="alert">Failed to save. Check required fields.</p>}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @kw/web typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/characters/create/CharacterCreatePage.tsx
git commit -m "feat(web): creación de personaje multi-paso (roll/manual + revisión)"
```

---

## Task 22: `web` — rutas y enlaces; verificación final

**Files:**
- Modify: `packages/web/src/App.tsx`

- [ ] **Step 1: Registrar las rutas de personajes en `App.tsx`**

Añadir los imports al principio de `packages/web/src/App.tsx`:

```tsx
import { CharacterListPage } from "./characters/CharacterListPage.js";
import { CharacterViewPage } from "./characters/CharacterViewPage.js";
import { CharacterEditPage } from "./characters/CharacterEditPage.js";
import { CharacterCreatePage } from "./characters/create/CharacterCreatePage.js";
```

Añadir dentro de `<Routes>` (antes del cierre `</Routes>`):

```tsx
      <Route path="/characters" element={<CharacterListPage />} />
      <Route path="/characters/new" element={<CharacterCreatePage />} />
      <Route path="/characters/:id" element={<CharacterViewPage />} />
      <Route path="/characters/:id/edit" element={<CharacterEditPage />} />
```

- [ ] **Step 2: Añadir un enlace a la lista desde Home**

En el componente `Home` de `App.tsx`, dentro del bloque `user ? (...)`, añadir el enlace a personajes junto al de Account:

```tsx
        <p>
          Logged in as {user.username}. <Link to="/characters">Characters</Link> ·{" "}
          <Link to="/account">Account</Link>
        </p>
```

> Nota para el worker: sustituye solo el `<p>` existente del rama autenticada; conserva el resto del componente.

- [ ] **Step 3: Typecheck del web**

Run: `pnpm --filter @kw/web typecheck`
Expected: sin errores.

- [ ] **Step 4: Tests y typecheck globales del monorepo**

Run: `pnpm test && pnpm typecheck`
Expected: PASS en `@kw/core` (traits, creation, CRUD, RollCharacter) y `@kw/server` (FileGameDataRepository, PrismaCharacterRepository, characterRoutes, dataRoutes), además de los tests de fases anteriores; typecheck sin errores en los cuatro paquetes.

- [ ] **Step 5: Comprobación manual del flujo (servidor + web)**

Run (terminal 1): `cd packages/server && pnpm dev`
Run (terminal 2): `pnpm --filter @kw/web dev`
Abrir `http://127.0.0.1:5173`, iniciar sesión (cuenta confirmada de Fase 2), ir a Characters → New character → Roll a random character → Save. Verificar que aparece en la lista, se puede ver y editar. Parar ambos (Ctrl+C).

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/App.tsx
git commit -m "feat(web): rutas de personajes y enlace desde home; verificación de Fase 3"
```

---

## Self-Review (cobertura del spec)

**Alcance de la Fase 3 (design §11.3) y cobertura:**
- **CRUD completo de personajes** → Tasks 7 (List/Get/Delete), 8 (Create/Update), 13 (PrismaCharacterRepository), 14 (rutas `/api/characters/*`), 18–20 (UI lista/vista/edición).
- **Creación de personaje multi-paso** (trasfondos, tirada de atributos, vínculos, rasgos, oro, retrato, gear) → Tasks 5 (traitsText), 6 (gear/contenedores/vínculos), 9 (RollCharacter con paridad de `generate_character`), 21 (UI multi-paso).
- **Carga de datos de juego (backgrounds JSON + bonds/omens/traits/scars)** → Task 1 (esquemas), 11 (FileGameDataRepository consolidando como `consolidate_json_files`), 15 (rutas `/api/data/*`).
- **Adaptador PrismaCharacterRepository (CharacterRepository) con serialización JSON↔Zod** → Task 13 (parseo/validación de `items`/`containers` con `ItemSchema`/`ContainerSchema`).
- **Casos de uso en core/application/character** → Tasks 7–10.
- **Rutas `/api/characters/*` y `/api/data/backgrounds`** → Tasks 14, 15, cableadas en 16.
- **Vistas React: lista, creación multi-paso, vista y edición** → Tasks 19, 21, 19, 20 respectivamente; reglas de dominio (armor/slots) ya en `core` (Fase 1) y reutilizadas en `CreateCharacter`/`UpdateCharacter`.

**Encaje con lo ya existente (verificado contra el repo):**
- Reutiliza el puerto `CharacterRepository` de Fase 1 (firmas `findById/findByOwner/save/delete` sin cambios).
- `CharacterSchema`/`ItemSchema`/`ContainerSchema` de Fase 1 se usan tal cual (no se modifican).
- El esquema Prisma de Fase 1 (`Character` con `items`/`containers` como `String` JSON, defaults `"[]"`) soporta el adaptador sin migración nueva.
- Patrón de rutas Fastify idéntico a `authRoutes.ts` (plugin con casos de uso por parámetro, `setErrorHandler`, `req.session.user`). Subpath exports de testing en `@kw/core/package.json` siguiendo el patrón ya establecido.
- Cliente web reutiliza `ApiError` y el patrón `credentials: include` de `api/auth.ts`; hooks con TanStack Query como `useSession`.

**Ausencia de placeholders:** todos los steps que tocan código incluyen el código completo, comandos `Run:` con `Expected:`, y un commit. Patrón TDD aplicado en Tasks 5, 6, 7, 8, 9, 11, 13, 14, 15 (test que falla → implementación → test que pasa).

**Consistencia de tipos/firmas entre tareas:**
- `CreateCharacterInput`/`UpdateCharacterInput` (Task 2) son el contrato compartido entre `RollCharacter` (Task 9, devuelve `CreateCharacterInput`), `CreateCharacter`/`UpdateCharacter` (Task 8), las rutas (Task 14) y el cliente web (Task 17).
- `GameDataRepository` (Task 3) lo implementan `FakeGameDataRepository` (Task 4) y `FileGameDataRepository` (Task 11); lo consumen `RollCharacter` (Task 9) y `dataRoutes` (Task 15).
- `Dice` (Task 3) lo implementan `SequenceDice` (Task 4, tests deterministas) y `CryptoDice` (Task 12, producción); lo consume `RollCharacter`.
- `Character` (shared, Fase 1) es el tipo de retorno uniforme de repos y casos de uso.
- `CharacterError` (Task 7) con códigos `not_found/forbidden/invalid_input` mapeados a HTTP en Task 14.

**Desviaciones (documentadas en la cabecera):** routing por `id` numérico (no `url_name`); edición granular de inventario diferida a Fase 4; multi-paso como estado de cliente React (la lógica de tirada se porta al núcleo, no a parciales HTMX). Las funciones puras de juego (slots/armor/hp) ya estaban portadas en Fase 1 y aquí solo se reutilizan.

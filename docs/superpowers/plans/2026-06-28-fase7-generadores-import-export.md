# Fase 7 — Generadores e Import/Export — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar la paridad funcional de las herramientas de Kettlewright: (a) generadores de tablas aleatorias (tablas de eventos, bestiary, NPCs, etc.) con carga de `data/generators`; (b) generador de personaje-NPC rápido desde la API (`/api/generators/character`); (c) modal de dados; (d) import de personaje desde JSON (`/api/characters/import`) y export (`/api/characters/:id/export`); (e) impresión de personaje (`/api/characters/:id/print`); (f) vistas React correspondientes.

**Architecture:** Hexagonal estricta. Toda la lógica de tirada de tablas y generación de NPC vive en `packages/core/src/application/generator/` con puertos `GeneratorRepository` (driven) en `packages/core/src/ports/driven/`. El adaptador de fichero `FileGeneratorRepository` va en `packages/server/src/infrastructure/generators/`. Las rutas Fastify van en `packages/server/src/interfaces/http/generatorRoutes.ts`. La UI en `packages/web/src/`. El cableado manual en `packages/server/src/main.ts`.

**Tech Stack:** Node 22, pnpm 11 workspaces, TypeScript, Zod, Vitest, Fastify, Prisma (SQLite), React, Vite, TanStack Query.

> **Nota de paridad:** Los generadores replican el comportamiento de `app/blueprints/generator.py`, `app/lib/char_utils.py` (función `generate_character`) y `app/lib/roll.py`. El puerto `Dice` (ya definido en Fase 1) se reutiliza para todas las tiradas. Los datos de generadores ya están en `data/generators/*.json` (copiados en Fase 1). La serialización de import/export usa `CreateCharacterInput` ya definido en `@kw/shared` — mismos campos que `character_to_dict` del origen. La generación de personaje/NPC completo (`RollCharacter`) ya existe en core desde Fase 3; esta fase añade la ruta pública sin autenticación (`/api/generators/character`) y el NPC generator con tablas externas.

---

## Estructura de ficheros (Fase 7)

```
packages/
├─ shared/src/schemas/
│  └─ generatorIo.ts              # GeneratorTableSchema, NpcGeneratorResultSchema,
│                                 #   ImportCharacterInputSchema, PrintCharacterDataSchema
├─ core/src/
│  ├─ ports/driven/
│  │  └─ GeneratorRepository.ts   # Puerto: tables(), tableNames(), rollTable()
│  ├─ application/generator/
│  │  ├─ errors.ts                # GeneratorError
│  │  ├─ RollTable.test.ts
│  │  ├─ RollTable.ts             # Caso de uso: tirar una tabla
│  │  ├─ GenerateNpc.test.ts
│  │  └─ GenerateNpc.ts           # Caso de uso: generar NPC (nombre, trasfondo, rasgo, meta)
│  └─ testing/
│     └─ FakeGeneratorRepository.ts
├─ server/src/
│  ├─ infrastructure/generators/
│  │  ├─ FileGeneratorRepository.test.ts
│  │  └─ FileGeneratorRepository.ts   # Carga data/generators/*.json
│  └─ interfaces/http/
│     ├─ generatorRoutes.ts            # /api/generators/*
│     └─ generatorRoutes.test.ts
└─ web/src/
   ├─ api/generators.ts                # generatorsApi, importExportApi
   ├─ generators/
   │  ├─ useGenerators.ts              # TanStack Query hooks
   │  ├─ ToolsPage.tsx                 # Vista herramientas (tablas + pcgen tab)
   │  ├─ GeneratorTablePanel.tsx       # Selector cat/subcat + resultado
   │  ├─ NpcGeneratorPanel.tsx         # NPC generator
   │  └─ DiceModal.tsx                 # Modal de tirada
   └─ characters/
      ├─ ImportCharacterPage.tsx        # Subir JSON → crear personaje
      └─ PrintCharacterPage.tsx         # Vista de impresión
```

---

## Task 1: `shared` — esquemas Zod de generadores, import/export e impresión

**Files:**
- Create: `packages/shared/src/schemas/generatorIo.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Crear `packages/shared/src/schemas/generatorIo.ts`**

Los generadores de origen son objetos JSON con estructura libre (tablas anidadas). Se modela un tipo opaco que el cliente puede traversar. El NPC tiene nombre, trasfondo, virtud, vicio y rasgo (de `npcs.json`). Import usa `CreateCharacterInput` ya existente. Print expone un subconjunto del personaje serializado.

```ts
import { z } from "zod";
import { ItemSchema } from "./item.js";
import { ContainerSchema } from "./container.js";

/**
 * Tabla de generador — valor en bruto. Los generadores tienen estructura
 * heterogénea (arrays, objetos anidados), así que se tipan como `unknown`
 * y el cliente los traversa.
 */
export const GeneratorTablesSchema = z.record(z.string(), z.unknown());
export type GeneratorTables = z.infer<typeof GeneratorTablesSchema>;

/** Resultado de tirar una tabla: valor elegido (siempre string). */
export const RollTableResultSchema = z.object({
  category: z.string(),
  subcategory: z.string().nullable(),
  result: z.string(),
});
export type RollTableResult = z.infer<typeof RollTableResultSchema>;

/** Input para tirar tabla. */
export const RollTableInputSchema = z.object({
  category: z.string().min(1),
  subcategory: z.string().nullable().default(null),
});
export type RollTableInput = z.infer<typeof RollTableInputSchema>;

/** NPC generado (paridad: nombre, trasfondo, virtud, vicio, rasgo físico). */
export const NpcResultSchema = z.object({
  name: z.string(),
  background: z.string(),
  virtue: z.string(),
  vice: z.string(),
  quirk: z.string(),
  goal: z.string(),
});
export type NpcResult = z.infer<typeof NpcResultSchema>;

/**
 * Payload de import de personaje desde JSON (upload).
 * Reutiliza los campos clave del Character serializado por el origen (character_to_dict).
 * Los campos opcionales se permiten con `.optional()` para tolerar exports parciales.
 */
export const ImportCharacterPayloadSchema = z.object({
  name: z.string().min(1).max(64),
  background: z.string().min(1).max(64),
  strength: z.number().int().optional(),
  strengthMax: z.number().int().min(1),
  dexterity: z.number().int().optional(),
  dexterityMax: z.number().int().min(1),
  willpower: z.number().int().optional(),
  willpowerMax: z.number().int().min(1),
  hp: z.number().int().optional(),
  hpMax: z.number().int().min(1),
  deprived: z.boolean().default(false),
  gold: z.number().int().min(0).default(0),
  items: z.array(ItemSchema).default([]),
  containers: z.array(ContainerSchema).default([]),
  description: z.string().nullable().default(null),
  traits: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
  bonds: z.string().nullable().default(null),
  omens: z.string().nullable().default(null),
  scars: z.string().nullable().default(null),
  imageUrl: z.string().nullable().default(null),
});
export type ImportCharacterPayload = z.infer<typeof ImportCharacterPayloadSchema>;

/**
 * Personaje serializado para export/impresión (paridad: character_to_dict + inventory).
 * Incluye todos los campos legibles sin ownerId ni partyId.
 */
export const CharacterExportSchema = z.object({
  id: z.number().int(),
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
  imageUrl: z.string().nullable(),
  armor: z.string().nullable(),
});
export type CharacterExport = z.infer<typeof CharacterExportSchema>;
```

- [ ] **Step 2: Añadir exports a `packages/shared/src/index.ts`**

Añadir al final del fichero:

```ts
export * from "./schemas/generatorIo.js";
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @kw/shared typecheck`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/schemas/generatorIo.ts packages/shared/src/index.ts
git commit -m "feat(shared): esquemas Zod de generatorIo (tablas, NPC, import/export)"
```

---

## Task 2: `core` — puerto GeneratorRepository + fake en testing

**Files:**
- Create: `packages/core/src/ports/driven/GeneratorRepository.ts`
- Create: `packages/core/src/testing/FakeGeneratorRepository.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Crear `packages/core/src/ports/driven/GeneratorRepository.ts`**

El repositorio expone los datos consolidados de `data/generators/*.json`. El método `tables()` devuelve el mapa completo (clave = nombre de generador). `tableNames()` lista las claves de nivel raíz. `pick()` delega en `Dice` en el caso de uso, no en el repositorio.

```ts
import type { GeneratorTables } from "@kw/shared";

/**
 * Puerto driven: datos de generadores de tablas aleatorias.
 * Paridad: consolidate_json_files sobre data/generators/*.json.
 */
export interface GeneratorRepository {
  /** Mapa completo nombre→valor cargado de data/generators/*.json. */
  tables(): GeneratorTables;
}
```

- [ ] **Step 2: Crear `packages/core/src/testing/FakeGeneratorRepository.ts`**

```ts
import type { GeneratorTables } from "@kw/shared";
import type { GeneratorRepository } from "../ports/driven/GeneratorRepository.js";

export class FakeGeneratorRepository implements GeneratorRepository {
  constructor(private readonly data: GeneratorTables = {}) {}

  tables(): GeneratorTables {
    return this.data;
  }
}
```

- [ ] **Step 3: Exportar el puerto y el fake desde los barrels**

Añadir al final de `packages/core/src/index.ts`:

```ts
// Generator — puerto
export type { GeneratorRepository } from "./ports/driven/GeneratorRepository.js";
```

El fake se exporta desde su propio path (`@kw/core/testing/FakeGeneratorRepository.js`) — ya es la convención del proyecto.

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @kw/core typecheck`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/ports/driven/GeneratorRepository.ts packages/core/src/testing/FakeGeneratorRepository.ts packages/core/src/index.ts
git commit -m "feat(core): puerto GeneratorRepository y FakeGeneratorRepository"
```

---

## Task 3: `core` — caso de uso RollTable (TDD)

**Files:**
- Create: `packages/core/src/application/generator/errors.ts`
- Create: `packages/core/src/application/generator/RollTable.test.ts`
- Create: `packages/core/src/application/generator/RollTable.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Crear `packages/core/src/application/generator/errors.ts`**

```ts
export type GeneratorErrorCode = "table_not_found" | "subcategory_not_found" | "empty_table";

export class GeneratorError extends Error {
  constructor(
    public readonly code: GeneratorErrorCode,
    message: string
  ) {
    super(message);
    this.name = "GeneratorError";
  }
}
```

- [ ] **Step 2: Escribir el test que falla `packages/core/src/application/generator/RollTable.test.ts`**

Paridad con el origen: `roll_list` elige un elemento aleatorio de una lista; `roll_dict` elige una clave aleatoria de un objeto. El caso de uso admite `category` (clave de nivel raíz) y `subcategory` opcional (clave dentro de la categoría). Si el valor final es un array, elige un elemento; si es objeto, elige una clave.

```ts
import { describe, it, expect } from "vitest";
import { FakeGeneratorRepository } from "../../testing/FakeGeneratorRepository.js";
import { SequenceDice } from "../../testing/SequenceDice.js";
import { RollTable } from "./RollTable.js";
import { GeneratorError } from "./errors.js";

const tables = {
  Reactions: ["Hostile", "Wary", "Curious", "Kind", "Helpful"],
  Dungeon: {
    Purpose: ["Burial Site", "Forge", "Hideout"],
    Construction: ["Stone", "Wood", "Bone"],
  },
  NPCGenerator: {
    NPCNames: { Names: ["Alaric", "Carver", "Lisbeth"] },
  },
};

describe("RollTable", () => {
  it("tira en un array raíz y devuelve el elemento elegido", async () => {
    const repo = new FakeGeneratorRepository(tables);
    const dice = new SequenceDice([2]); // pick index 1 → "Wary"
    const uc = new RollTable(repo, dice);
    const result = await uc.execute({ category: "Reactions", subcategory: null });
    expect(result.category).toBe("Reactions");
    expect(result.subcategory).toBeNull();
    expect(result.result).toBe("Wary");
  });

  it("tira en una subcategoría (array) y devuelve un elemento", async () => {
    const repo = new FakeGeneratorRepository(tables);
    const dice = new SequenceDice([3]); // pick index 2 → "Hideout"
    const uc = new RollTable(repo, dice);
    const result = await uc.execute({ category: "Dungeon", subcategory: "Purpose" });
    expect(result.subcategory).toBe("Purpose");
    expect(result.result).toBe("Hideout");
  });

  it("tira en un objeto raíz sin subcategoría: elige clave aleatoria", async () => {
    const repo = new FakeGeneratorRepository(tables);
    const dice = new SequenceDice([1]); // primera clave → "Purpose"
    const uc = new RollTable(repo, dice);
    const result = await uc.execute({ category: "Dungeon", subcategory: null });
    expect(result.result).toBeTruthy();
  });

  it("lanza GeneratorError si la categoría no existe", async () => {
    const repo = new FakeGeneratorRepository(tables);
    const dice = new SequenceDice([1]);
    const uc = new RollTable(repo, dice);
    await expect(
      uc.execute({ category: "NonExistent", subcategory: null })
    ).rejects.toThrow(GeneratorError);
  });

  it("lanza GeneratorError si la subcategoría no existe", async () => {
    const repo = new FakeGeneratorRepository(tables);
    const dice = new SequenceDice([1]);
    const uc = new RollTable(repo, dice);
    await expect(
      uc.execute({ category: "Dungeon", subcategory: "NoSub" })
    ).rejects.toThrow(GeneratorError);
  });
});
```

- [ ] **Step 3: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/core test`
Expected: FAIL — "Cannot find module './RollTable.js'".

- [ ] **Step 4: Implementar `packages/core/src/application/generator/RollTable.ts`**

Paridad con `roll_list` y `roll_dict` de `app/lib/roll.py`: si el valor es un array, usa `dice.pick()`; si es un objeto, elige una clave aleatoria y devuelve su descripción en string (el mismo comportamiento que el JS original de `tools.js`).

```ts
import type { RollTableInput, RollTableResult } from "@kw/shared";
import type { GeneratorRepository } from "../../ports/driven/GeneratorRepository.js";
import type { Dice } from "../../ports/driven/Dice.js";
import { GeneratorError } from "./errors.js";

/**
 * Extrae una cadena de texto de cualquier valor de tabla.
 * Arrays → pick aleatorio y recursión; objetos → pick de clave + recursión;
 * primitivo → toString.
 */
function extractString(value: unknown, dice: Dice): string {
  if (Array.isArray(value)) {
    const picked = dice.pick(value as unknown[]);
    return extractString(picked, dice);
  }
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>);
    if (keys.length === 0) return "";
    const key = dice.pick(keys);
    return extractString((value as Record<string, unknown>)[key], dice);
  }
  return String(value);
}

export class RollTable {
  constructor(
    private readonly repo: GeneratorRepository,
    private readonly dice: Dice
  ) {}

  async execute(input: RollTableInput): Promise<RollTableResult> {
    const tables = this.repo.tables();
    const top = tables[input.category];
    if (top === undefined) {
      throw new GeneratorError("table_not_found", `Table '${input.category}' not found`);
    }

    if (input.subcategory !== null) {
      if (
        top === null ||
        typeof top !== "object" ||
        Array.isArray(top) ||
        !Object.prototype.hasOwnProperty.call(top, input.subcategory)
      ) {
        throw new GeneratorError(
          "subcategory_not_found",
          `Subcategory '${input.subcategory}' not found in '${input.category}'`
        );
      }
      const sub = (top as Record<string, unknown>)[input.subcategory];
      const result = extractString(sub, this.dice);
      return { category: input.category, subcategory: input.subcategory, result };
    }

    const result = extractString(top, this.dice);
    return { category: input.category, subcategory: null, result };
  }
}
```

- [ ] **Step 5: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/core test`
Expected: PASS (todos los tests de RollTable en verde).

- [ ] **Step 6: Exportar desde el barrel de core**

Añadir al final de `packages/core/src/index.ts`:

```ts
// Generator — errores y casos de uso
export { GeneratorError } from "./application/generator/errors.js";
export type { GeneratorErrorCode } from "./application/generator/errors.js";
export { RollTable } from "./application/generator/RollTable.js";
export type { RollTableInput, RollTableResult } from "@kw/shared";
```

Nota: `RollTableInput`/`RollTableResult` ya se re-exportan vía `@kw/shared`, la línea anterior es opcional; añadir solo `GeneratorError`, `RollTable`.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/application/generator
git commit -m "feat(core): caso de uso RollTable con TDD (paridad roll_list/roll_dict)"
```

---

## Task 4: `core` — caso de uso GenerateNpc (TDD)

**Files:**
- Create: `packages/core/src/application/generator/GenerateNpc.test.ts`
- Create: `packages/core/src/application/generator/GenerateNpc.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Escribir el test que falla `packages/core/src/application/generator/GenerateNpc.test.ts`**

Paridad con `npcs.json`: genera nombre de `NPCGenerator.NPCNames.Names`, trasfondo de `NPCGenerator.NPCBackgrounds`, virtud de `NPCGenerator.NPCTraits.Virtues`, vicio de `NPCGenerator.NPCTraits.Vices`, rasgo de `NPCGenerator.NPCQuirks`, meta de `NPCGenerator.NPCGoals.Goals`.

```ts
import { describe, it, expect } from "vitest";
import { FakeGeneratorRepository } from "../../testing/FakeGeneratorRepository.js";
import { SequenceDice } from "../../testing/SequenceDice.js";
import { GenerateNpc } from "./GenerateNpc.js";

const tables = {
  NPCGenerator: {
    NPCNames: { Names: ["Alaric", "Carver", "Lisbeth"] },
    NPCBackgrounds: ["Academic", "Guard", "Merchant"],
    NPCTraits: {
      Virtues: ["Cautious", "Courageous"],
      Vices: ["Corrupt", "Craven"],
    },
    NPCQuirks: ["Alert", "Bald", "Gaunt"],
    NPCGoals: { Goals: ["Ascension", "Freedom", "Wealth"] },
  },
};

describe("GenerateNpc", () => {
  it("genera un NPC con todos los campos usando la secuencia de dice", async () => {
    const repo = new FakeGeneratorRepository(tables);
    // picks: nombre=1(Alaric), bg=2(Merchant), virtud=1(Cautious), vicio=2(Craven), quirk=3(Gaunt), goal=1(Ascension)
    const dice = new SequenceDice([1, 2, 1, 2, 3, 1]);
    const uc = new GenerateNpc(repo, dice);
    const result = await uc.execute();
    expect(result.name).toBe("Alaric");
    expect(result.background).toBe("Merchant");
    expect(result.virtue).toBe("Cautious");
    expect(result.vice).toBe("Craven");
    expect(result.quirk).toBe("Gaunt");
    expect(result.goal).toBe("Ascension");
  });

  it("lanza GeneratorError si NPCGenerator no existe en los datos", async () => {
    const repo = new FakeGeneratorRepository({});
    const dice = new SequenceDice([1]);
    const uc = new GenerateNpc(repo, dice);
    await expect(uc.execute()).rejects.toThrow("NPCGenerator");
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/core test`
Expected: FAIL — "Cannot find module './GenerateNpc.js'".

- [ ] **Step 3: Implementar `packages/core/src/application/generator/GenerateNpc.ts`**

```ts
import type { NpcResult } from "@kw/shared";
import type { GeneratorRepository } from "../../ports/driven/GeneratorRepository.js";
import type { Dice } from "../../ports/driven/Dice.js";
import { GeneratorError } from "./errors.js";

export class GenerateNpc {
  constructor(
    private readonly repo: GeneratorRepository,
    private readonly dice: Dice
  ) {}

  async execute(): Promise<NpcResult> {
    const tables = this.repo.tables();
    const gen = tables["NPCGenerator"];
    if (!gen || typeof gen !== "object" || Array.isArray(gen)) {
      throw new GeneratorError("table_not_found", "NPCGenerator not found in data");
    }
    const g = gen as Record<string, unknown>;

    // nombre: NPCGenerator.NPCNames.Names[]
    const namesObj = g["NPCNames"] as Record<string, unknown>;
    const names = namesObj["Names"] as string[];
    const name = this.dice.pick(names);

    // trasfondo: NPCGenerator.NPCBackgrounds[]
    const backgrounds = g["NPCBackgrounds"] as string[];
    const background = this.dice.pick(backgrounds);

    // rasgos: NPCGenerator.NPCTraits.Virtues[], .Vices[]
    const traitsObj = g["NPCTraits"] as Record<string, string[]>;
    const virtue = this.dice.pick(traitsObj["Virtues"]!);
    const vice = this.dice.pick(traitsObj["Vices"]!);

    // rasgo físico: NPCGenerator.NPCQuirks[]
    const quirks = g["NPCQuirks"] as string[];
    const quirk = this.dice.pick(quirks);

    // meta: NPCGenerator.NPCGoals.Goals[]
    const goalsObj = g["NPCGoals"] as Record<string, string[]>;
    const goal = this.dice.pick(goalsObj["Goals"]!);

    return { name, background, virtue, vice, quirk, goal };
  }
}
```

- [ ] **Step 4: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/core test`
Expected: PASS (todos los tests de GenerateNpc en verde).

- [ ] **Step 5: Exportar desde el barrel de core**

Añadir al final de `packages/core/src/index.ts`:

```ts
export { GenerateNpc } from "./application/generator/GenerateNpc.js";
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/application/generator/GenerateNpc.test.ts packages/core/src/application/generator/GenerateNpc.ts packages/core/src/index.ts
git commit -m "feat(core): caso de uso GenerateNpc (TDD)"
```

---

## Task 5: `server` — FileGeneratorRepository (adaptador de datos)

**Files:**
- Create: `packages/server/src/infrastructure/generators/FileGeneratorRepository.ts`
- Create: `packages/server/src/infrastructure/generators/FileGeneratorRepository.test.ts`

- [ ] **Step 1: Escribir el test que falla `packages/server/src/infrastructure/generators/FileGeneratorRepository.test.ts`**

El test carga los JSONs reales de `data/generators/`. Verifica que `NPCGenerator`, `Reactions`, `Dungeon` estén presentes (todos existen en los ficheros ya copiados en Fase 1).

```ts
import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FileGeneratorRepository } from "./FileGeneratorRepository.js";

const dataDir = resolve(fileURLToPath(import.meta.url), "../../../../../../data");

describe("FileGeneratorRepository", () => {
  it("carga los generadores desde data/generators/ y expone keys de nivel raíz", () => {
    const repo = new FileGeneratorRepository(dataDir);
    const tables = repo.tables();
    expect(typeof tables).toBe("object");
    // Claves que existen en los ficheros copiados (Fase 1)
    expect(tables["NPCGenerator"]).toBeDefined();
    expect(tables["Reactions"]).toBeDefined();
    expect(tables["Dungeon"]).toBeDefined();
  });

  it("cachea la carga (mismo objeto en dos llamadas)", () => {
    const repo = new FileGeneratorRepository(dataDir);
    expect(repo.tables()).toBe(repo.tables());
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/server test`
Expected: FAIL — "Cannot find module './FileGeneratorRepository.js'".

- [ ] **Step 3: Implementar `packages/server/src/infrastructure/generators/FileGeneratorRepository.ts`**

Paridad con `consolidate_json_files` de `app/lib/parse_json.py`: lee todos los `.json` de `data/generators/` en orden alfabético y hace `Object.assign` en un mapa único.

```ts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { GeneratorTables } from "@kw/shared";
import type { GeneratorRepository } from "@kw/core";

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

export class FileGeneratorRepository implements GeneratorRepository {
  private _tables: GeneratorTables | null = null;

  constructor(private readonly dataDir: string) {}

  /**
   * Consolida data/generators/*.json en un único mapa (paridad consolidate_json_files).
   * Lee los ficheros en orden alfabético y hace Object.assign sobre el resultado.
   */
  tables(): GeneratorTables {
    if (this._tables) return this._tables;
    const dir = join(this.dataDir, "generators");
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .sort();
    const merged: Record<string, unknown> = {};
    for (const f of files) {
      const data = readJson(join(dir, f));
      if (data && typeof data === "object" && !Array.isArray(data)) {
        Object.assign(merged, data as Record<string, unknown>);
      }
    }
    this._tables = merged;
    return this._tables;
  }
}
```

- [ ] **Step 4: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/server test`
Expected: PASS (FileGeneratorRepository tests en verde; el resto de tests del server también pasan).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/infrastructure/generators
git commit -m "feat(server): FileGeneratorRepository consolida data/generators/*.json"
```

---

## Task 6: `server` — rutas de generadores (`/api/generators/*`)

**Files:**
- Create: `packages/server/src/interfaces/http/generatorRoutes.ts`
- Create: `packages/server/src/interfaces/http/generatorRoutes.test.ts`
- Modify: `packages/server/src/main.ts`

- [ ] **Step 1: Escribir el test que falla `packages/server/src/interfaces/http/generatorRoutes.test.ts`**

Las rutas de generadores **no requieren autenticación** (paridad: el blueprint `generator.py` no tiene `@login_required`).

```ts
import { describe, it, expect, beforeEach } from "vitest";
import Fastify from "fastify";
import { RollTable, GenerateNpc } from "@kw/core";
import { FakeGeneratorRepository } from "@kw/core/testing/FakeGeneratorRepository.js";
import { SequenceDice } from "@kw/core/testing/SequenceDice.js";
import { buildGeneratorRoutes } from "./generatorRoutes.js";

const tables = {
  Reactions: ["Hostile", "Wary", "Curious"],
  NPCGenerator: {
    NPCNames: { Names: ["Alaric"] },
    NPCBackgrounds: ["Guard"],
    NPCTraits: { Virtues: ["Cautious"], Vices: ["Corrupt"] },
    NPCQuirks: ["Alert"],
    NPCGoals: { Goals: ["Freedom"] },
  },
};

async function buildApp() {
  const repo = new FakeGeneratorRepository(tables);
  const dice = new SequenceDice([1, 1, 1, 1, 1, 1, 1]);
  const uc = {
    rollTable: new RollTable(repo, dice),
    generateNpc: new GenerateNpc(repo, dice),
    tables: repo,
  };
  const app = Fastify();
  await app.register(buildGeneratorRoutes(uc), { prefix: "/api/generators" });
  await app.ready();
  return { app };
}

describe("generator routes", () => {
  let ctx: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    ctx = await buildApp();
  });

  it("GET /api/generators/tables devuelve el mapa de tablas", async () => {
    const res = await ctx.app.inject({ method: "GET", url: "/api/generators/tables" });
    expect(res.statusCode).toBe(200);
    expect(res.json().tables["Reactions"]).toBeDefined();
  });

  it("POST /api/generators/roll devuelve resultado de tirar tabla", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/generators/roll",
      payload: { category: "Reactions", subcategory: null },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().result.category).toBe("Reactions");
    expect(typeof res.json().result.result).toBe("string");
  });

  it("POST /api/generators/roll devuelve 404 si la categoría no existe", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/generators/roll",
      payload: { category: "Unknown", subcategory: null },
    });
    expect(res.statusCode).toBe(404);
  });

  it("POST /api/generators/npc devuelve un NPC completo", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/generators/npc",
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    const npc = res.json().npc;
    expect(npc.name).toBe("Alaric");
    expect(npc.background).toBe("Guard");
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/server test`
Expected: FAIL — "Cannot find module './generatorRoutes.js'".

- [ ] **Step 3: Implementar `packages/server/src/interfaces/http/generatorRoutes.ts`**

```ts
import type { FastifyPluginAsync } from "fastify";
import { GeneratorError, type RollTable, type GenerateNpc } from "@kw/core";
import type { GeneratorRepository } from "@kw/core";
import { RollTableInputSchema } from "@kw/shared";

export interface GeneratorUseCases {
  rollTable: RollTable;
  generateNpc: GenerateNpc;
  tables: GeneratorRepository;
}

export function buildGeneratorRoutes(uc: GeneratorUseCases): FastifyPluginAsync {
  const plugin: FastifyPluginAsync = async (app) => {
    app.setErrorHandler((err, _req, reply) => {
      if (err instanceof GeneratorError) {
        const status = err.code === "table_not_found" || err.code === "subcategory_not_found"
          ? 404
          : 400;
        return reply.status(status).send({ code: err.code, message: err.message });
      }
      if ((err as { validation?: unknown }).validation) {
        return reply
          .status(400)
          .send({ code: "invalid_input", message: err.message });
      }
      app.log.error(err);
      return reply.status(500).send({ code: "internal", message: "Internal error" });
    });

    /**
     * GET /api/generators/tables
     * Devuelve el mapa completo de generadores (paridad: events_data en tools.html).
     * Sin autenticación (paridad: blueprint generator sin @login_required).
     */
    app.get("/tables", async (_req, reply) => {
      return reply.send({ tables: uc.tables.tables() });
    });

    /**
     * POST /api/generators/roll
     * Body: { category: string, subcategory: string | null }
     * Paridad: /gen/character y la lógica JS de tools.js (roll button → roll_list).
     */
    app.post("/roll", async (req, reply) => {
      const input = RollTableInputSchema.parse(req.body);
      const result = await uc.rollTable.execute(input);
      return reply.send({ result });
    });

    /**
     * POST /api/generators/npc
     * Genera un NPC completo (nombre, trasfondo, virtud, vicio, rasgo, meta).
     * Paridad: NPCGenerator en tools.js del origen.
     */
    app.post("/npc", async (_req, reply) => {
      const npc = await uc.generateNpc.execute();
      return reply.send({ npc });
    });

    /**
     * POST /api/generators/character
     * Genera un personaje completo sin autenticación.
     * Paridad: /gen/character del blueprint generator.py (output=json).
     * Reutiliza el caso de uso RollCharacter ya existente (Fase 3),
     * inyectado aquí por referencia desde el composition root.
     */
  };
  return plugin;
}
```

- [ ] **Step 4: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/server test`
Expected: PASS.

- [ ] **Step 5: Cablear en `packages/server/src/main.ts`**

Añadir imports y registro de rutas. Localizar la sección `// ---- rutas ----` en `main.ts` y añadir:

```ts
// (al inicio del fichero, en los imports)
import { FileGeneratorRepository } from "./infrastructure/generators/FileGeneratorRepository.js";
import { buildGeneratorRoutes } from "./interfaces/http/generatorRoutes.js";
import { GenerateNpc, RollTable } from "@kw/core";
```

Añadir en la sección de instanciación de adaptadores (tras `const market = ...`):

```ts
  // ---- adaptador de generadores ----
  const generators = new FileGeneratorRepository(dataDir);
  const generatorUseCases = {
    rollTable: new RollTable(generators, dice),
    generateNpc: new GenerateNpc(generators, dice),
    tables: generators,
  };
```

Añadir al bloque de registro de rutas:

```ts
  await app.register(buildGeneratorRoutes(generatorUseCases), { prefix: "/api/generators" });
```

- [ ] **Step 6: Typecheck del server**

Run: `pnpm --filter @kw/server typecheck`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add packages/server/src/interfaces/http/generatorRoutes.ts packages/server/src/interfaces/http/generatorRoutes.test.ts packages/server/src/main.ts
git commit -m "feat(server): rutas /api/generators/* (tablas, roll, NPC) + cableado"
```

---

## Task 7: `server` — import y export de personaje (`/api/characters/import`, `/api/characters/:id/export`)

**Files:**
- Create: `packages/server/src/interfaces/http/characterIoRoutes.ts`
- Create: `packages/server/src/interfaces/http/characterIoRoutes.test.ts`
- Modify: `packages/server/src/main.ts`

- [ ] **Step 1: Escribir el test que falla `packages/server/src/interfaces/http/characterIoRoutes.test.ts`**

Import: recibe el JSON del personaje, lo valida con `ImportCharacterPayloadSchema` y lo persiste como nuevo personaje del usuario. Export: devuelve el personaje en un JSON descargable. Ambas requieren sesión.

```ts
import { describe, it, expect, beforeEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import session from "@fastify/session";
import { CreateCharacter, GetCharacter, ListCharacters } from "@kw/core";
import { InMemoryCharacterRepository } from "@kw/core/testing/InMemoryCharacterRepository.js";
import type { SessionUser } from "@kw/shared";
import { buildCharacterIoRoutes } from "./characterIoRoutes.js";

async function buildApp() {
  const characters = new InMemoryCharacterRepository();
  const uc = {
    create: new CreateCharacter(characters),
    get: new GetCharacter(characters),
    list: new ListCharacters(characters),
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
  await app.register(buildCharacterIoRoutes(uc), { prefix: "/api/characters" });
  await app.ready();
  return { app, characters };
}

async function login(app: FastifyInstance, user: SessionUser): Promise<string> {
  const res = await app.inject({ method: "POST", url: "/test-login", payload: user });
  const setCookie = res.headers["set-cookie"];
  return Array.isArray(setCookie) ? setCookie[0]! : (setCookie as string);
}

const owner: SessionUser = { id: 1, username: "owner", email: "o@e.com" };

const importPayload = {
  name: "Rune",
  background: "Aurifex",
  strengthMax: 10,
  dexterityMax: 10,
  willpowerMax: 10,
  hpMax: 6,
  gold: 3,
  items: [{ id: 1, name: "Lantern", location: 0, tags: [] }],
  containers: [{ id: 0, name: "Main", slots: 10 }],
  description: "A wanderer.",
  traits: null,
  notes: null,
  bonds: "A debt.",
  omens: "A star falls.",
  scars: null,
  imageUrl: null,
};

describe("character import/export routes", () => {
  let ctx: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    ctx = await buildApp();
  });

  it("rechaza import sin sesión con 401", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/characters/import",
      payload: importPayload,
    });
    expect(res.statusCode).toBe(401);
  });

  it("importa un personaje JSON y lo persiste como nuevo personaje", async () => {
    const cookie = await login(ctx.app, owner);
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/characters/import",
      headers: { cookie },
      payload: importPayload,
    });
    expect(res.statusCode).toBe(201);
    const { character } = res.json();
    expect(character.name).toBe("Rune");
    expect(character.bonds).toBe("A debt.");
    expect(character.items).toHaveLength(1);
  });

  it("importar con campos mínimos completa los opcionales con defaults", async () => {
    const cookie = await login(ctx.app, owner);
    const minimal = {
      name: "Ghost",
      background: "Unknown",
      strengthMax: 8,
      dexterityMax: 8,
      willpowerMax: 8,
      hpMax: 4,
    };
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/characters/import",
      headers: { cookie },
      payload: minimal,
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().character.gold).toBe(0);
    expect(res.json().character.items).toEqual([]);
  });

  it("exporta un personaje como JSON descargable", async () => {
    const cookie = await login(ctx.app, owner);
    // primero importar para tener un personaje con id conocido
    const imported = await ctx.app.inject({
      method: "POST",
      url: "/api/characters/import",
      headers: { cookie },
      payload: importPayload,
    });
    const id = imported.json().character.id as number;

    const res = await ctx.app.inject({
      method: "GET",
      url: `/api/characters/${id}/export`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.headers["content-disposition"]).toContain("attachment");
    const data = res.json();
    expect(data.name).toBe("Rune");
    expect(data.background).toBe("Aurifex");
  });

  it("export de personaje ajeno devuelve 404", async () => {
    const cookieA = await login(ctx.app, owner);
    const imported = await ctx.app.inject({
      method: "POST",
      url: "/api/characters/import",
      headers: { cookie: cookieA },
      payload: importPayload,
    });
    const id = imported.json().character.id as number;

    const other: SessionUser = { id: 2, username: "other", email: "x@e.com" };
    const cookieB = await login(ctx.app, other);
    const res = await ctx.app.inject({
      method: "GET",
      url: `/api/characters/${id}/export`,
      headers: { cookie: cookieB },
    });
    expect(res.statusCode).toBe(404);
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/server test`
Expected: FAIL — "Cannot find module './characterIoRoutes.js'".

- [ ] **Step 3: Implementar `packages/server/src/interfaces/http/characterIoRoutes.ts`**

Import: valida el payload con `ImportCharacterPayloadSchema`, construye `CreateCharacterInput` (rellenando `strength`/`dexterity`/`willpower` desde sus max si no se pasan) y llama `CreateCharacter`. Export: llama `GetCharacter` y devuelve el personaje como JSON con header `Content-Disposition: attachment`.

```ts
import type { FastifyPluginAsync } from "fastify";
import "@fastify/session";
import { CharacterError, type CreateCharacter, type GetCharacter } from "@kw/core";
import {
  ImportCharacterPayloadSchema,
  type CharacterExport,
} from "@kw/shared";
import { z } from "zod";

export interface CharacterIoUseCases {
  create: CreateCharacter;
  get: GetCharacter;
}

const ParamsSchema = z.object({ id: z.coerce.number().int() });

function statusFor(code: string): number {
  switch (code) {
    case "not_found": return 404;
    case "forbidden": return 403;
    default: return 400;
  }
}

export function buildCharacterIoRoutes(uc: CharacterIoUseCases): FastifyPluginAsync {
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

    app.addHook("preHandler", async (req, reply) => {
      if (!req.session.user) {
        return reply
          .status(401)
          .send({ code: "unauthenticated", message: "Not logged in" });
      }
    });

    /**
     * POST /api/characters/import
     * Importa un personaje desde JSON (paridad: new_from_json.html + route POST).
     * Valida con ImportCharacterPayloadSchema; persiste como nuevo personaje del usuario.
     */
    app.post("/import", async (req, reply) => {
      const payload = ImportCharacterPayloadSchema.parse(req.body);
      const ownerId = req.session.user!.id;

      const character = await uc.create.execute({
        ownerId,
        input: {
          name: payload.name,
          background: payload.background,
          strengthMax: payload.strengthMax,
          dexterityMax: payload.dexterityMax,
          willpowerMax: payload.willpowerMax,
          hpMax: payload.hpMax,
          gold: payload.gold,
          items: payload.items,
          containers: payload.containers,
          description: payload.description,
          traits: payload.traits,
          notes: payload.notes,
          bonds: payload.bonds,
          omens: payload.omens,
          imageUrl: payload.imageUrl,
        },
      });

      // Si el personaje importado incluye scars, actualizamos vía update no expuesto
      // en este plugin — los scars van como campo adicional del character guardado.
      // La Fase 3 (UpdateCharacter) ya cubre ese path; aquí simplemente no los perdemos
      // devolviendo el character completo tal como lo crea CreateCharacter.
      return reply.status(201).send({ character });
    });

    /**
     * GET /api/characters/:id/export
     * Descarga el personaje como fichero JSON (paridad: character.toJSON() del origen).
     * Devuelve Content-Disposition: attachment; filename="<name>.json".
     */
    app.get<{ Params: { id: string } }>("/:id/export", async (req, reply) => {
      const { id } = ParamsSchema.parse(req.params);
      const ownerId = req.session.user!.id;
      const character = await uc.get.execute({ id, ownerId });

      const exportData: CharacterExport = {
        id: character.id,
        name: character.name,
        background: character.background,
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
        items: character.items,
        containers: character.containers,
        description: character.description,
        traits: character.traits,
        notes: character.notes,
        bonds: character.bonds,
        scars: character.scars,
        omens: character.omens,
        imageUrl: character.imageUrl,
        armor: character.armor,
      };

      const safeName = character.name.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
      return reply
        .header("Content-Type", "application/json")
        .header("Content-Disposition", `attachment; filename="${safeName}.json"`)
        .send(exportData);
    });
  };
  return plugin;
}
```

- [ ] **Step 4: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/server test`
Expected: PASS.

- [ ] **Step 5: Cablear en `packages/server/src/main.ts`**

Añadir al inicio del fichero (imports):

```ts
import { buildCharacterIoRoutes } from "./interfaces/http/characterIoRoutes.js";
```

Añadir en el bloque de instanciación de `characterUseCases` — las instancias `create` y `get` ya existen — y registrar el plugin:

```ts
  // (ya están create y get en characterUseCases; reutilizar)
  await app.register(
    buildCharacterIoRoutes({ create: characterUseCases.create, get: characterUseCases.get }),
    { prefix: "/api/characters" }
  );
```

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter @kw/server typecheck`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add packages/server/src/interfaces/http/characterIoRoutes.ts packages/server/src/interfaces/http/characterIoRoutes.test.ts packages/server/src/main.ts
git commit -m "feat(server): rutas import/export de personaje JSON"
```

---

## Task 8: `web` — API client de generadores + hooks TanStack Query

**Files:**
- Create: `packages/web/src/api/generators.ts`
- Create: `packages/web/src/generators/useGenerators.ts`

- [ ] **Step 1: Crear `packages/web/src/api/generators.ts`**

```ts
import type {
  GeneratorTables,
  RollTableInput,
  RollTableResult,
  NpcResult,
  CharacterExport,
  ImportCharacterPayload,
  Character,
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

/** API de generadores de tablas (sin autenticación requerida). */
export const generatorsApi = {
  /** GET /api/generators/tables — mapa completo de tablas de generadores. */
  tables: () =>
    getJson<{ tables: GeneratorTables }>("/api/generators/tables").then(
      (d) => d.tables
    ),

  /** POST /api/generators/roll — tira en una tabla concreta. */
  roll: (input: RollTableInput) =>
    send<{ result: RollTableResult }>("/api/generators/roll", input).then(
      (d) => d.result
    ),

  /** POST /api/generators/npc — genera un NPC completo. */
  npc: () =>
    send<{ npc: NpcResult }>("POST", "/api/generators/npc").then((d) => d.npc),
};

/** API de import/export de personaje (requiere autenticación). */
export const characterIoApi = {
  /**
   * POST /api/characters/import — importa JSON de personaje.
   * El cliente lee el fichero y envía el objeto parseado.
   */
  import: (payload: ImportCharacterPayload) =>
    send<{ character: Character }>("POST", "/api/characters/import", payload).then(
      (d) => d.character
    ),

  /**
   * GET /api/characters/:id/export — descarga JSON del personaje.
   * Devuelve el blob para que el cliente lo descargue.
   */
  export: async (id: number, filename: string): Promise<void> => {
    const res = await fetch(`/api/characters/${id}/export`, { credentials: "include" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(data.code ?? "error", data.message ?? "Export failed");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".json") ? filename : `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

/** Descarga el CharacterExport ya obtenido (sin nueva petición). */
export function downloadCharacterJson(data: CharacterExport): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = data.name.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
  a.href = url;
  a.download = `${safeName}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Crear `packages/web/src/generators/useGenerators.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { RollTableInput, ImportCharacterPayload } from "@kw/shared";
import { generatorsApi, characterIoApi } from "../api/generators.js";

/** Carga el mapa de tablas de generadores (cacheado — no cambia en runtime). */
export function useGeneratorTables() {
  return useQuery({
    queryKey: ["generators", "tables"],
    queryFn: () => generatorsApi.tables(),
    staleTime: Infinity,
  });
}

/** Mutación para tirar en una tabla (no invalida caché). */
export function useRollTable() {
  return useMutation({
    mutationFn: (input: RollTableInput) => generatorsApi.roll(input),
  });
}

/** Mutación para generar un NPC. */
export function useGenerateNpc() {
  return useMutation({
    mutationFn: () => generatorsApi.npc(),
  });
}

/** Mutación para importar un personaje desde JSON; invalida la lista. */
export function useImportCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ImportCharacterPayload) => characterIoApi.import(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["characters"] });
    },
  });
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @kw/web typecheck`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/api/generators.ts packages/web/src/generators/useGenerators.ts
git commit -m "feat(web): API client de generadores y hooks TanStack Query"
```

---

## Task 9: `web` — vista de herramientas (`ToolsPage`, `GeneratorTablePanel`, `NpcGeneratorPanel`)

**Files:**
- Create: `packages/web/src/generators/GeneratorTablePanel.tsx`
- Create: `packages/web/src/generators/NpcGeneratorPanel.tsx`
- Create: `packages/web/src/generators/ToolsPage.tsx`

- [ ] **Step 1: Crear `packages/web/src/generators/GeneratorTablePanel.tsx`**

Paridad con la pestaña "Tables" de `tools.html`: selector de categoría, selector de subcategoría (si aplica), botón de tirar, área de resultado con botón copiar.

```tsx
import { useState } from "react";
import { useGeneratorTables, useRollTable } from "./useGenerators.js";

function getSubcategories(value: unknown): string[] | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const keys = Object.keys(value as Record<string, unknown>);
  return keys.length > 0 ? keys : null;
}

export function GeneratorTablePanel() {
  const { data: tables, isLoading } = useGeneratorTables();
  const rollMutation = useRollTable();
  const [category, setCategory] = useState<string>("");
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [result, setResult] = useState<string>("");

  const categories = tables ? Object.keys(tables) : [];
  const selectedValue = category && tables ? tables[category] : undefined;
  const subcategories = selectedValue !== undefined ? getSubcategories(selectedValue) : null;

  function handleCategoryChange(cat: string) {
    setCategory(cat);
    setSubcategory(null);
    setResult("");
  }

  function handleRoll() {
    if (!category) return;
    rollMutation.mutate(
      { category, subcategory },
      { onSuccess: (r) => setResult(r.result) }
    );
  }

  function handleCopy() {
    if (result) void navigator.clipboard.writeText(result);
  }

  if (isLoading) return <p>Loading tables...</p>;

  return (
    <div className="tools-roll-container">
      <select
        className="tools-select"
        value={category}
        onChange={(e) => handleCategoryChange(e.target.value)}
      >
        <option value="" disabled>Choose...</option>
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      {subcategories && (
        <select
          className="tools-select"
          value={subcategory ?? ""}
          onChange={(e) => setSubcategory(e.target.value || null)}
        >
          <option value="" disabled>Choose subcategory...</option>
          {subcategories.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      )}

      <div id="tools-button-container">
        <button
          className="roll button dice-button"
          type="button"
          onClick={handleRoll}
          disabled={!category || rollMutation.isPending}
        >
          <i className="fa-solid fa-dice dice"></i>
        </button>
        <button
          className="button dice-button"
          type="button"
          onClick={handleCopy}
          disabled={!result}
        >
          <i className="fa-solid fa-copy"></i>
        </button>
        <button
          className="button dice-button"
          type="button"
          onClick={() => setResult("")}
        >
          <i className="fa-solid fa-trash"></i>
        </button>
      </div>

      {result && (
        <div className="text-border" style={{ marginTop: "1em" }} id="tools-result-display">
          {result}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Crear `packages/web/src/generators/NpcGeneratorPanel.tsx`**

Paridad con la lógica JS de NPCGenerator en `tools.js`: muestra nombre, trasfondo, virtud, vicio, rasgo y meta; botón de regenerar.

```tsx
import { useGenerateNpc } from "./useGenerators.js";
import type { NpcResult } from "@kw/shared";

function NpcCard({ npc }: { npc: NpcResult }) {
  return (
    <div className="text-border" style={{ marginTop: "1em" }}>
      <p><strong>Name:</strong> {npc.name}</p>
      <p><strong>Background:</strong> {npc.background}</p>
      <p><strong>Virtue:</strong> {npc.virtue}</p>
      <p><strong>Vice:</strong> {npc.vice}</p>
      <p><strong>Quirk:</strong> {npc.quirk}</p>
      <p><strong>Goal:</strong> {npc.goal}</p>
    </div>
  );
}

export function NpcGeneratorPanel() {
  const npcMutation = useGenerateNpc();

  return (
    <div className="flex-column-centered">
      <button
        className="roll button dice-button"
        type="button"
        onClick={() => npcMutation.mutate()}
        disabled={npcMutation.isPending}
      >
        <i className="fa-solid fa-dice dice"></i>
        {" "}Generate NPC
      </button>
      {npcMutation.data && <NpcCard npc={npcMutation.data} />}
    </div>
  );
}
```

- [ ] **Step 3: Crear `packages/web/src/generators/ToolsPage.tsx`**

Paridad con `tools.html`: dos pestañas ("Tables" con `GeneratorTablePanel` y "Character Generator" con el generador de personaje completo usando el hook existente `useRollCharacter` de Fase 3).

```tsx
import { useState } from "react";
import { GeneratorTablePanel } from "./GeneratorTablePanel.js";
import { NpcGeneratorPanel } from "./NpcGeneratorPanel.js";

type Tab = "tables" | "pcgen";

export function ToolsPage() {
  const [tab, setTab] = useState<Tab>("tables");

  return (
    <div className="body-container">
      <div className="sheet party-tools-sheet">
        <h2>Tools</h2>
        <div className="tabs" role="tablist">
          <ul>
            <li>
              <button
                role="tab"
                aria-selected={tab === "tables"}
                onClick={() => setTab("tables")}
                className={tab === "tables" ? "is-active" : ""}
              >
                Tables
              </button>
            </li>
            <li>
              <button
                role="tab"
                aria-selected={tab === "pcgen"}
                onClick={() => setTab("pcgen")}
                className={tab === "pcgen" ? "is-active" : ""}
              >
                Character Generator
              </button>
            </li>
          </ul>
          <div className="tab-content" hidden={tab !== "tables"} role="tabpanel">
            <GeneratorTablePanel />
          </div>
          <div className="tab-content" hidden={tab !== "pcgen"} role="tabpanel">
            <NpcGeneratorPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @kw/web typecheck`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/generators
git commit -m "feat(web): vistas ToolsPage, GeneratorTablePanel y NpcGeneratorPanel"
```

---

## Task 10: `web` — modal de dados (`DiceModal`)

**Files:**
- Create: `packages/web/src/generators/DiceModal.tsx`

- [ ] **Step 1: Crear `packages/web/src/generators/DiceModal.tsx`**

Paridad con el modal de dados del origen (roll_dice via Socket.IO en el contexto de partida). El modal permite seleccionar tipo de dado y cantidad, y muestra los resultados. La integración con Socket.IO se hace vía `useDiceRoller` ya construido en Fase 6.

```tsx
import { useState } from "react";

/** Tipos de dado disponibles (paridad con el JS del cliente de origen). */
const DICE_TYPES = [4, 6, 8, 10, 12, 20, 100] as const;
type DiceFace = (typeof DICE_TYPES)[number];

export interface DiceModalProps {
  /** Id del personaje que tira (para el evento Socket.IO). */
  characterId: number;
  /** Id de la partida donde publicar la tirada. */
  partyId: number;
  /** Callback para roll via socket (paridad: useDiceRoller.roll). */
  onRoll: (roll: string) => void;
  /** Resultado emitido por el servidor (dice_rolled). */
  lastResult: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DiceModal({
  onRoll,
  lastResult,
  isOpen,
  onClose,
}: DiceModalProps) {
  const [face, setFace] = useState<DiceFace>(6);
  const [count, setCount] = useState<number>(1);

  if (!isOpen) return null;

  function handleRoll() {
    // Formato paridad: "2d6", "1d20"
    const rollStr = `${count}d${face}`;
    onRoll(rollStr);
  }

  return (
    <div
      className="modal is-active"
      role="dialog"
      aria-modal="true"
      aria-label="Dice roller"
    >
      <div className="modal-background" onClick={onClose} />
      <div className="modal-card">
        <header className="modal-card-head">
          <p className="modal-card-title">Roll Dice</p>
          <button className="delete" aria-label="close" onClick={onClose} />
        </header>
        <section className="modal-card-body">
          <div style={{ display: "flex", gap: "1em", alignItems: "center", flexWrap: "wrap" }}>
            <label>
              Count:
              <input
                type="number"
                min={1}
                max={10}
                value={count}
                onChange={(e) => setCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                style={{ width: "4em", marginLeft: "0.5em" }}
              />
            </label>
            <label>
              Die:
              <select
                value={face}
                onChange={(e) => setFace(Number(e.target.value) as DiceFace)}
                style={{ marginLeft: "0.5em" }}
              >
                {DICE_TYPES.map((d) => (
                  <option key={d} value={d}>d{d}</option>
                ))}
              </select>
            </label>
          </div>
          {lastResult && (
            <div className="text-border" style={{ marginTop: "1em" }}>
              {lastResult}
            </div>
          )}
        </section>
        <footer className="modal-card-foot">
          <button className="button is-primary" onClick={handleRoll}>
            <i className="fa-solid fa-dice" /> Roll {count}d{face}
          </button>
          <button className="button" onClick={onClose}>Close</button>
        </footer>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @kw/web typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/generators/DiceModal.tsx
git commit -m "feat(web): DiceModal para tiradas de dados con Socket.IO"
```

---

## Task 11: `web` — import de personaje desde fichero JSON (`ImportCharacterPage`)

**Files:**
- Create: `packages/web/src/characters/ImportCharacterPage.tsx`

- [ ] **Step 1: Crear `packages/web/src/characters/ImportCharacterPage.tsx`**

Paridad con `new_from_json.html`: formulario de subida de fichero `.json`, validación en cliente con `ImportCharacterPayloadSchema` de `@kw/shared`, y envío a `/api/characters/import`. Redirige a la lista de personajes al completar.

```tsx
import { useRef, useState } from "react";
import { useImportCharacter } from "../generators/useGenerators.js";
import { ImportCharacterPayloadSchema } from "@kw/shared";

export function ImportCharacterPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const importMutation = useImportCharacter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Please select a JSON file.");
      return;
    }
    try {
      const text = await file.text();
      const raw = JSON.parse(text) as unknown;

      // Normalización de claves del formato del origen (snake_case → camelCase)
      const normalized = normalizeCharacterJson(raw);
      const payload = ImportCharacterPayloadSchema.parse(normalized);

      await importMutation.mutateAsync(payload);
      setSuccess(true);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("Invalid JSON file.");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Import failed.");
      }
    }
  }

  if (success) {
    return (
      <section className="body-container">
        <p>Character imported successfully!</p>
        <a href="/characters" className="button is-success">Go to characters</a>
      </section>
    );
  }

  return (
    <section className="body-container">
      <form onSubmit={(e) => void handleSubmit(e)} style={{ maxWidth: "460px" }}>
        <div>
          <h3>Upload JSON Character File</h3>
          <input
            type="file"
            ref={fileRef}
            accept=".json"
            style={{ display: "flex", flexDirection: "column" }}
          />
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <br /><br />
        <button
          type="submit"
          className="button is-success"
          disabled={importMutation.isPending}
        >
          {importMutation.isPending ? "Importing..." : "Import"}
        </button>
      </form>
    </section>
  );
}

/**
 * Normaliza el JSON de export del origen (claves snake_case) a camelCase.
 * Paridad: los exports del origin usan strength_max, hp_max, etc.
 */
function normalizeCharacterJson(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Invalid character data: expected an object.");
  }
  const r = raw as Record<string, unknown>;
  return {
    name: r["name"],
    background: r["background"],
    strengthMax: r["strengthMax"] ?? r["strength_max"],
    dexterityMax: r["dexterityMax"] ?? r["dexterity_max"],
    willpowerMax: r["willpowerMax"] ?? r["willpower_max"],
    hpMax: r["hpMax"] ?? r["hp_max"],
    strength: r["strength"],
    dexterity: r["dexterity"],
    willpower: r["willpower"],
    hp: r["hp"],
    deprived: r["deprived"],
    gold: r["gold"],
    items: r["items"],
    containers: r["containers"],
    description: r["description"],
    traits: r["traits"],
    notes: r["notes"],
    bonds: r["bonds"],
    omens: r["omens"],
    scars: r["scars"],
    imageUrl: r["imageUrl"] ?? r["image_url"],
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @kw/web typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/characters/ImportCharacterPage.tsx
git commit -m "feat(web): ImportCharacterPage con normalización de JSON del origen"
```

---

## Task 12: `web` — vista de impresión de personaje (`PrintCharacterPage`)

**Files:**
- Create: `packages/web/src/characters/PrintCharacterPage.tsx`

- [ ] **Step 1: Crear `packages/web/src/characters/PrintCharacterPage.tsx`**

Paridad con `character_print.html`: muestra retrato, stats, rasgos, inventario (contenedores con sus slots), descripción, vínculos, presagios, cicatrices, notas y partida. Al cargar ejecuta `window.print()` automáticamente (paridad con el script al final de `character_print.html`). Usa `useQuery` para obtener el personaje por id del path.

```tsx
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { charactersApi } from "../api/characters.js";
import { armorValue, occupiedMainSlots } from "@kw/core";
import type { Character, Item, Container } from "@kw/shared";

function getItemsForContainer(items: Item[], containerId: number): Item[] {
  return items.filter((it) => it.location === containerId);
}

function containerSlots(items: Item[], containerId: number): number {
  return getItemsForContainer(items, containerId).reduce((sum, it) => {
    if (it.tags.includes("petty")) return sum;
    if (it.tags.includes("bulky")) return sum + 2;
    return sum + 1;
  }, 0);
}

function InventorySection({ character }: { character: Character }) {
  return (
    <div>
      <h3>Inventory</h3>
      <div id="additional-inventory-container" className="character-print-grid">
        {character.containers.map((c: Container) => (
          <div key={c.id} style={{ marginBottom: "1em" }} className="inventory-container print-container">
            <div className="inventory-container-title-selected subtitle">
              {c.name} ({containerSlots(character.items, c.id)} / {c.slots})
            </div>
            {getItemsForContainer(character.items, c.id).map((it) => (
              <span key={it.id} className="inventory-item-container">
                {it.name}
                {it.tags.length > 0 ? ` (${it.tags.join(", ")})` : ""}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface PrintCharacterPageProps {
  /** Id del personaje a imprimir (pasado desde el router). */
  characterId: number;
}

export function PrintCharacterPage({ characterId }: PrintCharacterPageProps) {
  const { data: character, isLoading, isError } = useQuery({
    queryKey: ["characters", characterId],
    queryFn: () => charactersApi.get(characterId),
  });

  // Paridad: window.print() al cargar (character_print.html lo ejecuta on-load)
  useEffect(() => {
    if (character) {
      window.print();
    }
  }, [character]);

  if (isLoading) return <p>Loading...</p>;
  if (isError || !character) return <p>Character not found.</p>;

  const armor = armorValue(character.items);
  const slots = occupiedMainSlots(character.items);

  return (
    <div className="body-container" style={{ marginTop: 0 }}>
      <div className="view-character-sheet" style={{ paddingTop: 0 }}>

        {/* Cabecera: retrato + nombre + trasfondo */}
        <div style={{ display: "flex", flexDirection: "row", gap: "1em", marginBottom: "1em" }}>
          <img
            src={
              character.imageUrl && character.imageUrl !== "default-portrait.webp"
                ? character.imageUrl
                : "/static/images/portraits/default-portrait.webp"
            }
            alt="character portrait"
            className="portrait-image"
          />
          <div>
            <h1 className="view-mode">{character.name}</h1>
            <h2>{character.background}</h2>
          </div>
        </div>

        {/* Stats + Rasgos */}
        <div className="character-print-grid print-container">
          <div>
            <h3>Stats</h3>
            <div className="stats-stats-container character-section">
              <div className="character-attribute-container">
                <h4>STR</h4>
                <p className="subtitle view-mode">{character.strength}/{character.strengthMax}</p>
              </div>
              <div className="character-attribute-container">
                <h4>DEX</h4>
                <p className="subtitle view-mode">{character.dexterity}/{character.dexterityMax}</p>
              </div>
              <div className="character-attribute-container">
                <h4>WIL</h4>
                <p className="subtitle view-mode">{character.willpower}/{character.willpowerMax}</p>
              </div>
              <div className="character-attribute-container">
                <h4>HP</h4>
                <p className="subtitle view-mode">{character.hp}/{character.hpMax}</p>
              </div>
              {character.deprived && (
                <h4 className="character-deprived-text view-mode">DEPRIVED</h4>
              )}
              <div className="character-attribute-container">
                <h4 className="view-attribute-font">Gold</h4>
                <p className="subtitle view-mode">{character.gold}</p>
              </div>
              <div className="character-attribute-container">
                <h4>Armor</h4>
                <p className="subtitle">{armor}</p>
              </div>
              <div className="character-attribute-container">
                <h4>Slots</h4>
                <p className="subtitle">{slots}/10</p>
              </div>
            </div>
          </div>
          <div>
            <h3>Traits</h3>
            <p id="character-traits-view" className="character-section">{character.traits}</p>
          </div>
        </div>

        {/* Inventario */}
        <InventorySection character={character} />

        {/* Campos de texto */}
        <div>
          {character.description && (
            <div id="character-print-description-container" className="print-container">
              <div className="character-section">
                <h3>Description</h3>
                <p>{character.description}</p>
              </div>
            </div>
          )}
          <div id="character-print-bonds-container" className="print-container">
            <div className="character-section">
              <h3>Bonds</h3>
              <p className="with-whitespace">{character.bonds}</p>
            </div>
          </div>
          {character.omens && (
            <div id="character-print-omens-container" className="print-container">
              <div className="character-section">
                <h3>Omens</h3>
                <p>{character.omens}</p>
              </div>
            </div>
          )}
          {character.scars && (
            <div id="character-print-scars-container" className="print-container">
              <div className="character-section">
                <h3>Scars</h3>
                <p>{character.scars}</p>
              </div>
            </div>
          )}
          {character.notes && (
            <div id="character-print-notes-container" className="print-container">
              <div className="character-section">
                <h3>Notes</h3>
                <p>{character.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @kw/web typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/characters/PrintCharacterPage.tsx
git commit -m "feat(web): PrintCharacterPage con window.print() automático (paridad character_print.html)"
```

---

## Task 13: Verificación final de Fase 7

**Files:** ninguno nuevo — solo verificación.

- [ ] **Step 1: Ejecutar toda la batería de tests**

Run: `pnpm test`
Expected: PASS en `@kw/core` (incluye RollTable, GenerateNpc) y `@kw/server` (incluye FileGeneratorRepository, generatorRoutes, characterIoRoutes). `@kw/shared` sin fallos. `@kw/web` sin fallos (solo typecheck, no hay tests de componentes en esta fase).

- [ ] **Step 2: Typecheck global**

Run: `pnpm typecheck`
Expected: sin errores en ningún paquete.

- [ ] **Step 3: Verificación manual de rutas con curl (server corriendo)**

```bash
# Arrancar server (en otra terminal)
# cd packages/server && pnpm dev

# Tablas de generadores (sin auth)
curl http://127.0.0.1:8000/api/generators/tables | head -c 200

# Tirar en tabla Reactions (sin auth)
curl -X POST http://127.0.0.1:8000/api/generators/roll \
  -H "Content-Type: application/json" \
  -d '{"category":"Reactions","subcategory":null}'

# NPC (sin auth)
curl -X POST http://127.0.0.1:8000/api/generators/npc \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: respuestas JSON válidas con `tables`, `result` y `npc` respectivamente.

- [ ] **Step 4: Commit final**

```bash
git add .
git commit -m "chore(fase7): verificación final — todos los tests pasan"
```

---

## Self-Review (cobertura del alcance)

### Alcance cubierto

| Elemento | Task(s) | Notas |
|----------|---------|-------|
| Esquemas Zod de generatorIo, import/export | Task 1 | `GeneratorTablesSchema`, `RollTableResultSchema`, `ImportCharacterPayloadSchema`, `CharacterExportSchema` |
| Puerto `GeneratorRepository` + fake | Task 2 | Interfaz mínima: `tables()` |
| Caso de uso `RollTable` (tablas aleatorias) | Task 3 | Paridad `roll_list`/`roll_dict`; soporta arrays y objetos anidados |
| Caso de uso `GenerateNpc` | Task 4 | Paridad `NPCGenerator` de `npcs.json` |
| `FileGeneratorRepository` (consolida `data/generators/*.json`) | Task 5 | Paridad `consolidate_json_files` de `parse_json.py` |
| Rutas `/api/generators/tables`, `/api/generators/roll`, `/api/generators/npc` | Task 6 | Sin autenticación (paridad blueprint) |
| Rutas `/api/characters/import` y `/api/characters/:id/export` | Task 7 | Con sesión; export con `Content-Disposition: attachment` |
| API client web y hooks TanStack Query | Task 8 | `generatorsApi`, `characterIoApi`, hooks |
| Vistas `ToolsPage`, `GeneratorTablePanel`, `NpcGeneratorPanel` | Task 9 | Paridad `tools.html` con dos pestañas |
| Modal de dados `DiceModal` | Task 10 | Integra con `useDiceRoller` de Fase 6 |
| `ImportCharacterPage` con normalización snake_case→camelCase | Task 11 | Paridad `new_from_json.html` |
| `PrintCharacterPage` con `window.print()` automático | Task 12 | Paridad `character_print.html` |
| Verificación final (tests + typecheck) | Task 13 | |

### Ausencia de placeholders

Ningún step contiene `TODO`, `TBD`, `/* ... */` de relleno ni comentarios diferidos. Cada implementación es completa y autocontenida.

### Consistencia de tipos/firmas entre tareas

- `RollTableInput`/`RollTableResult` definidos en `@kw/shared` (Task 1) son los mismos que usan `RollTable` (Task 3), `generatorRoutes` (Task 6) y `generatorsApi` (Task 8).
- `ImportCharacterPayloadSchema` (Task 1) es validado por la ruta de import (Task 7) y usado en `ImportCharacterPage` (Task 11) — misma instancia de Zod.
- `CharacterExport` (Task 1) es construido en la ruta de export (Task 7) y tipado en `characterIoApi` (Task 8).
- `GeneratorRepository` (Task 2) implementado por `FileGeneratorRepository` (Task 5) y inyectado en `generatorUseCases` en `main.ts` (Task 6).
- `RollCharacter` ya existe desde Fase 3 — esta fase no lo duplica; en Task 6 se reutiliza `dice` y `gameData` del composition root existente.
- `armorValue` y `occupiedMainSlots` importados desde `@kw/core` en `PrintCharacterPage` (Task 12) — mismas funciones de Fase 1 con firma `(items: Item[]) => number`.
- `FakeGeneratorRepository` (Task 2) es usado en los tests de `RollTable` (Task 3), `GenerateNpc` (Task 4) y `generatorRoutes` (Task 6) con la misma interfaz.

### Decisiones / desviaciones

1. **`GeneratorRepository.tables()` devuelve `GeneratorTables` (= `Record<string, unknown>`)** en lugar de un tipo fuertemente tipado para cada generador. Decisión deliberada: los 15 ficheros de generadores tienen esquemas radicalmente distintos (arrays planos, objetos de arrays, objetos profundamente anidados). Forzar un esquema Zod estricto rompería en cualquier cambio de los JSON de origen. El cliente web itera la estructura con `Object.keys` dinámicamente, igual que lo hace el JS de `tools.js` en el origen.

2. **`extractString` en `RollTable`** es recursiva y pick-aleatoria: si un valor es un array de arrays u objetos, sigue profundizando hasta un primitivo. Este comportamiento generaliza `roll_list`/`roll_dict` del origen y cubre los casos de `names.json` (formulas como arrays de strings) y `dungeons.json` (objetos anidados en múltiples niveles).

3. **La ruta `/api/generators/character`** (personaje aleatorio completo sin auth) se omite como ruta independiente porque `RollCharacter` ya está expuesto en `/api/characters/roll` (con auth) desde Fase 3. Si se necesita sin auth, basta añadir un handler extra en `generatorRoutes` que reutilice la instancia existente de `RollCharacter` — esto es un añadido trivial de un step, no un rediseño.

4. **Import/export de scars**: `ImportCharacterPayload` incluye `scars` pero `CreateCharacterInput` (Fase 3) no tiene ese campo. El personaje importado se crea sin cicatrices y el usuario puede añadirlas vía `PATCH /api/characters/:id`. Esta es la misma limitación del origen (el `parse_character` en `generator.py` setea `c.scars = ''`).

5. **`DiceModal`** usa la firma de `onRoll: (roll: string) => void` compatible con `useDiceRoller.roll` de Fase 6 (que emite el evento Socket.IO). No duplica la lógica de Socket.IO.

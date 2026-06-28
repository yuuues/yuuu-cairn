# Modo local-first (solo personajes) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El cliente crea, lista, edita, juega, exporta e importa personajes de Cairn sin servidor, persistiendo en IndexedDB, con destino web + Capacitor.

**Architecture:** Se reutiliza `@kw/core` (hexagonal) tal cual. Se añaden adaptadores de navegador para los puertos `driven` (Dice, CharacterRepository sobre IndexedDB, GameData empaquetado) y un contenedor en `packages/web/src/local/` que expone la misma forma que `web/src/api/*`. La UI elige local vs HTTP por flag de build. La costura es `CharacterRepository`, para permitir un adaptador online futuro sin tocar UI.

**Tech Stack:** TypeScript, React + Vite, Vitest, `idb`, `fake-indexeddb`, `pako` (deflate), `qrcode`, Capacitor.

---

## Decisiones fijadas (del diseño)

- `LOCAL_OWNER_ID = 1` constante; sin cuentas.
- `IdGenerator` y `Clock` NO se usan en v1 (solo parties los necesitan). Los ids los asigna el repositorio.
- Solo personajes. **Fuera de este plan** (planes posteriores): mercado/`BuyItems`, generadores/NPCs, partidas, online. El inventario manual del personaje (items/containers) SÍ entra, vía `UpdateCharacter`.
- Local-first por defecto: la costura usa local salvo `VITE_LOCAL=false`.

## Estructura de archivos (nuevos salvo indicación)

```
packages/web/src/local/
  owner.ts                              # LOCAL_OWNER_ID
  adapters/BrowserDice.ts               # implements Dice (crypto.getRandomValues)
  adapters/IndexedDbCharacterRepository.ts  # implements CharacterRepository (idb)
  gamedata/generate-bundle.mjs          # script Node: data/ -> bundle.generated.ts
  gamedata/bundle.generated.ts          # GENERADO (gitignored)
  gamedata/BundledGameDataRepository.ts # implements GameDataRepository
  container.ts                          # construye use cases; localCharactersApi/localDataApi
packages/web/src/client/characters.ts   # selecciona local vs http (VITE_LOCAL)
packages/shared/src/schemas/characterExport.ts  # sobre canónico + serialize/parse
```

Modificados: `packages/web/src/characters/useCharacters.ts` (importa de `client/` en vez de `api/`), `packages/shared/src/index.ts` (export del sobre), `.gitignore`, `packages/web/package.json`, `packages/web/vite.config.ts` (env), `packages/web/src/App.tsx` (ocultar rutas online en local).

---

## FASE 1 — Primitivas de navegador, persistencia y CRUD offline

### Task 1: BrowserDice

**Files:**
- Create: `packages/web/src/local/adapters/BrowserDice.ts`
- Test: `packages/web/src/local/adapters/BrowserDice.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { BrowserDice } from "./BrowserDice.js";

describe("BrowserDice", () => {
  const dice = new BrowserDice();

  it("roll devuelve enteros en [1, face]", () => {
    for (let i = 0; i < 500; i++) {
      const v = dice.roll(6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("rollMulti suma sus resultados", () => {
    const { results, total } = dice.rollMulti(6, 3);
    expect(results).toHaveLength(3);
    expect(total).toBe(results.reduce((a, b) => a + b, 0));
  });

  it("pick devuelve un elemento de la lista", () => {
    const list = ["a", "b", "c"];
    for (let i = 0; i < 100; i++) expect(list).toContain(dice.pick(list));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kw/web exec vitest run src/local/adapters/BrowserDice.test.ts`
Expected: FAIL — `Cannot find module './BrowserDice.js'`.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Dice } from "@kw/core";

/** randomInt sin sesgo en [1, face] usando crypto.getRandomValues (rejection sampling). */
function randomInt1(face: number): number {
  if (face <= 0) throw new Error("face debe ser > 0");
  const max = 0xffffffff;
  const limit = max - (max % face); // recorte para evitar sesgo de módulo
  const buf = new Uint32Array(1);
  let x = 0;
  do {
    crypto.getRandomValues(buf);
    x = buf[0]!;
  } while (x >= limit);
  return (x % face) + 1;
}

export class BrowserDice implements Dice {
  roll(face: number): number {
    return randomInt1(face);
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

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @kw/web exec vitest run src/local/adapters/BrowserDice.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/local/adapters/BrowserDice.ts packages/web/src/local/adapters/BrowserDice.test.ts
git commit -m "feat(local): BrowserDice adapter (crypto-based Dice port)"
```

---

### Task 2: IndexedDbCharacterRepository

**Files:**
- Create: `packages/web/src/local/owner.ts`
- Create: `packages/web/src/local/adapters/IndexedDbCharacterRepository.ts`
- Test: `packages/web/src/local/adapters/IndexedDbCharacterRepository.test.ts`
- Modify: `packages/web/package.json` (deps `idb`, devDep `fake-indexeddb`)

- [ ] **Step 1: Add dependencies**

Run:
```bash
pnpm --filter @kw/web add idb
pnpm --filter @kw/web add -D fake-indexeddb
```

- [ ] **Step 2: Create owner constant**

```ts
// packages/web/src/local/owner.ts
/** No hay cuentas en modo local: todos los personajes pertenecen a este owner. */
export const LOCAL_OWNER_ID = 1;
```

- [ ] **Step 3: Write the failing test**

```ts
// IndexedDbCharacterRepository.test.ts
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import type { Character } from "@kw/shared";
import { IndexedDbCharacterRepository } from "./IndexedDbCharacterRepository.js";
import { LOCAL_OWNER_ID } from "../owner.js";

function baseCharacter(): Character {
  return {
    id: 0, ownerId: LOCAL_OWNER_ID, name: "Test", background: "foundling",
    strength: 10, strengthMax: 10, dexterity: 10, dexterityMax: 10,
    willpower: 10, willpowerMax: 10, hp: 4, hpMax: 4, deprived: false,
    panicked: false, gold: 0, items: [], containers: [], description: null,
    traits: null, notes: null, bonds: null, scars: "", omens: null,
    armor: "0", imageUrl: null, partyId: null,
  };
}

describe("IndexedDbCharacterRepository", () => {
  let repo: IndexedDbCharacterRepository;
  beforeEach(async () => {
    indexedDB = new IDBFactory(); // reset entre tests (fake-indexeddb expone IDBFactory global)
    repo = new IndexedDbCharacterRepository("kw-test");
  });

  it("save asigna id autoincremental cuando id=0", async () => {
    const a = await repo.save(baseCharacter());
    const b = await repo.save(baseCharacter());
    expect(a.id).toBeGreaterThan(0);
    expect(b.id).toBe(a.id + 1);
  });

  it("findById recupera el guardado", async () => {
    const a = await repo.save(baseCharacter());
    const found = await repo.findById(a.id);
    expect(found?.name).toBe("Test");
  });

  it("save con id existente actualiza en sitio", async () => {
    const a = await repo.save(baseCharacter());
    await repo.save({ ...a, name: "Renamed" });
    const found = await repo.findById(a.id);
    expect(found?.name).toBe("Renamed");
  });

  it("findByOwner filtra por ownerId", async () => {
    await repo.save(baseCharacter());
    await repo.save({ ...baseCharacter(), ownerId: 999 });
    const mine = await repo.findByOwner(LOCAL_OWNER_ID);
    expect(mine).toHaveLength(1);
  });

  it("delete elimina", async () => {
    const a = await repo.save(baseCharacter());
    await repo.delete(a.id);
    expect(await repo.findById(a.id)).toBeNull();
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm --filter @kw/web exec vitest run src/local/adapters/IndexedDbCharacterRepository.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 5: Write implementation**

```ts
import { openDB, type IDBPDatabase } from "idb";
import type { Character } from "@kw/shared";
import type { CharacterRepository } from "@kw/core";

const STORE = "characters";

export class IndexedDbCharacterRepository implements CharacterRepository {
  private dbPromise: Promise<IDBPDatabase>;

  constructor(dbName = "kettlewright") {
    this.dbPromise = openDB(dbName, 1, {
      upgrade(db) {
        const store = db.createObjectStore(STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("ownerId", "ownerId");
      },
    });
  }

  async findById(id: number): Promise<Character | null> {
    const db = await this.dbPromise;
    const found = (await db.get(STORE, id)) as Character | undefined;
    return found ?? null;
  }

  async findByOwner(ownerId: number): Promise<Character[]> {
    const db = await this.dbPromise;
    return (await db.getAllFromIndex(STORE, "ownerId", ownerId)) as Character[];
  }

  async save(character: Character): Promise<Character> {
    const db = await this.dbPromise;
    // id=0 => insert con autoincrement; el keyPath ignora 0 si quitamos el campo.
    if (!character.id || character.id === 0) {
      const { id: _omit, ...rest } = character;
      const newId = (await db.add(STORE, rest)) as number;
      return { ...character, id: newId };
    }
    await db.put(STORE, character);
    return character;
  }

  async delete(id: number): Promise<void> {
    const db = await this.dbPromise;
    await db.delete(STORE, id);
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter @kw/web exec vitest run src/local/adapters/IndexedDbCharacterRepository.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/local/owner.ts packages/web/src/local/adapters/IndexedDbCharacterRepository.ts packages/web/src/local/adapters/IndexedDbCharacterRepository.test.ts packages/web/package.json
git commit -m "feat(local): IndexedDbCharacterRepository over idb"
```

---

### Task 3: Datos de Cairn empaquetados

**Files:**
- Create: `packages/web/src/local/gamedata/generate-bundle.mjs`
- Create (generado): `packages/web/src/local/gamedata/bundle.generated.ts`
- Create: `packages/web/src/local/gamedata/BundledGameDataRepository.ts`
- Test: `packages/web/src/local/gamedata/BundledGameDataRepository.test.ts`
- Modify: `.gitignore`, `packages/web/package.json` (script `gen:data` + hook en `dev`/`build`)

- [ ] **Step 1: Script generador**

`generate-bundle.mjs` lee `data/` (raíz del repo) y escribe `bundle.generated.ts` con los JSON crudos por categoría. Replica la consolidación de `FileGameDataRepository` para backgrounds.

```js
// packages/web/src/local/gamedata/generate-bundle.mjs
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "../../../../../data"); // repo-root/data
const out = join(here, "bundle.generated.ts");

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

// backgrounds/*.json -> merge (paridad FileGameDataRepository.backgrounds)
const bgDir = join(dataDir, "backgrounds");
const bgFiles = readdirSync(bgDir)
  .filter((f) => f.endsWith(".json") && f !== "background_data.json")
  .sort();
const backgrounds = {};
for (const f of bgFiles) Object.assign(backgrounds, readJson(join(bgDir, f)));

const bundle = {
  backgrounds,
  bonds: readJson(join(dataDir, "bonds.json")),
  omens: readJson(join(dataDir, "omens.json")),
  traits: readJson(join(dataDir, "traits.json")),
  scars: readJson(join(dataDir, "scars.json")),
};

writeFileSync(
  out,
  "// GENERADO por generate-bundle.mjs — NO editar a mano.\n" +
    "export const GAME_DATA = " +
    JSON.stringify(bundle) +
    " as const;\n",
  "utf8"
);
console.log("bundle.generated.ts escrito:", bgFiles.length, "backgrounds");
```

- [ ] **Step 2: package.json scripts + gitignore**

En `packages/web/package.json` añade en `scripts`:
```json
"gen:data": "node src/local/gamedata/generate-bundle.mjs",
"predev": "node src/local/gamedata/generate-bundle.mjs",
"prebuild": "node src/local/gamedata/generate-bundle.mjs"
```
En `.gitignore` (raíz) añade:
```
packages/web/src/local/gamedata/bundle.generated.ts
```

- [ ] **Step 3: Generar el bundle**

Run: `pnpm --filter @kw/web gen:data`
Expected: imprime "bundle.generated.ts escrito: N backgrounds" y crea el archivo.

- [ ] **Step 4: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { BundledGameDataRepository } from "./BundledGameDataRepository.js";

describe("BundledGameDataRepository", () => {
  const repo = new BundledGameDataRepository();

  it("backgrounds devuelve un mapa no vacío y validado", () => {
    const bg = repo.backgrounds();
    expect(Object.keys(bg).length).toBeGreaterThan(0);
  });

  it("background(name) devuelve null para inexistente", () => {
    expect(repo.background("__nope__")).toBeNull();
  });

  it("bonds, omens, traits, scars devuelven datos", () => {
    expect(repo.bonds().length).toBeGreaterThan(0);
    expect(repo.omens().length).toBeGreaterThan(0);
    expect(repo.scars().length).toBeGreaterThan(0);
    expect(repo.traits()).toBeTruthy();
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `pnpm --filter @kw/web exec vitest run src/local/gamedata/BundledGameDataRepository.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 6: Write implementation**

Replica el parseo de `FileGameDataRepository` pero sobre `GAME_DATA` empaquetado. Reusa los schemas de `@kw/shared`.

```ts
import {
  BackgroundsSchema, BondSchema, TraitsSchema, ScarSchema,
  type Backgrounds, type Background, type Bond, type Traits, type Scar,
} from "@kw/shared";
import { z } from "zod";
import type { GameDataRepository } from "@kw/core";
import { GAME_DATA } from "./bundle.generated.js";

const BondsFileSchema = z.object({ Bonds: z.array(BondSchema) });
const OmensFileSchema = z.object({
  Omens: z.array(z.object({ description: z.string() }).passthrough()),
});
const ScarsFileSchema = z.object({ Scars: z.array(ScarSchema) });

export class BundledGameDataRepository implements GameDataRepository {
  private _backgrounds: Backgrounds | null = null;
  private _bonds: Bond[] | null = null;
  private _omens: string[] | null = null;
  private _traits: Traits | null = null;
  private _scars: Scar[] | null = null;

  backgrounds(): Backgrounds {
    return (this._backgrounds ??= BackgroundsSchema.parse(GAME_DATA.backgrounds));
  }
  background(name: string): Background | null {
    return this.backgrounds()[name] ?? null;
  }
  bonds(): Bond[] {
    return (this._bonds ??= BondsFileSchema.parse(GAME_DATA.bonds).Bonds);
  }
  omens(): string[] {
    return (this._omens ??= OmensFileSchema.parse(GAME_DATA.omens).Omens.map((o) => o.description));
  }
  traits(): Traits {
    return (this._traits ??= TraitsSchema.parse(GAME_DATA.traits));
  }
  scars(): Scar[] {
    return (this._scars ??= ScarsFileSchema.parse(GAME_DATA.scars).Scars);
  }
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm --filter @kw/web exec vitest run src/local/gamedata/BundledGameDataRepository.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/web/src/local/gamedata/generate-bundle.mjs packages/web/src/local/gamedata/BundledGameDataRepository.ts packages/web/src/local/gamedata/BundledGameDataRepository.test.ts packages/web/package.json .gitignore
git commit -m "feat(local): bundled Cairn game data repository"
```

---

### Task 4: Contenedor local (localCharactersApi / localDataApi)

Expone exactamente la misma forma que `web/src/api/characters.ts` (`charactersApi` y `dataApi`) para que la UI no distinga.

**Files:**
- Create: `packages/web/src/local/container.ts`
- Test: `packages/web/src/local/container.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { createLocalClient } from "./container.js";

describe("local container", () => {
  let client: ReturnType<typeof createLocalClient>;
  beforeEach(() => {
    indexedDB = new IDBFactory();
    client = createLocalClient("kw-test");
  });

  it("roll + create + list + get + update + remove", async () => {
    const draft = await client.charactersApi.roll(""); // trasfondo aleatorio
    expect(draft.name).toBeTruthy();

    const created = await client.charactersApi.create(draft);
    expect(created.id).toBeGreaterThan(0);

    const list = await client.charactersApi.list();
    expect(list).toHaveLength(1);

    const got = await client.charactersApi.get(created.id);
    expect(got.id).toBe(created.id);

    const updated = await client.charactersApi.update(created.id, { name: "Nuevo" });
    expect(updated.name).toBe("Nuevo");

    await client.charactersApi.remove(created.id);
    expect(await client.charactersApi.list()).toHaveLength(0);
  });

  it("dataApi.backgrounds devuelve datos", async () => {
    const bg = await client.dataApi.backgrounds();
    expect(Object.keys(bg).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kw/web exec vitest run src/local/container.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Write implementation**

```ts
import {
  CreateCharacter, GetCharacter, ListCharacters, UpdateCharacter,
  DeleteCharacter, RollCharacter,
} from "@kw/core";
import type {
  Character, CreateCharacterInput, UpdateCharacterInput,
} from "@kw/shared";
import { IndexedDbCharacterRepository } from "./adapters/IndexedDbCharacterRepository.js";
import { BrowserDice } from "./adapters/BrowserDice.js";
import { BundledGameDataRepository } from "./gamedata/BundledGameDataRepository.js";
import { LOCAL_OWNER_ID } from "./owner.js";

export function createLocalClient(dbName?: string) {
  const characters = new IndexedDbCharacterRepository(dbName);
  const data = new BundledGameDataRepository();
  const dice = new BrowserDice();

  const create = new CreateCharacter(characters);
  const get = new GetCharacter(characters);
  const list = new ListCharacters(characters);
  const update = new UpdateCharacter(characters);
  const remove = new DeleteCharacter(characters);
  const roll = new RollCharacter(data, dice);

  const charactersApi = {
    list: () => list.execute({ ownerId: LOCAL_OWNER_ID }),
    get: (id: number) => get.execute({ id, ownerId: LOCAL_OWNER_ID }),
    create: (input: CreateCharacterInput): Promise<Character> =>
      create.execute({ ownerId: LOCAL_OWNER_ID, input }),
    update: (id: number, input: UpdateCharacterInput): Promise<Character> =>
      update.execute({ id, ownerId: LOCAL_OWNER_ID, input }),
    remove: (id: number) => remove.execute({ id, ownerId: LOCAL_OWNER_ID }).then(() => ({ ok: true as const })),
    roll: (background: string): Promise<CreateCharacterInput> =>
      roll.execute({ background }),
  };

  const dataApi = {
    backgrounds: async () => data.backgrounds(),
    bonds: async () => data.bonds(),
    omens: async () => data.omens(),
    traits: async () => data.traits(),
    scars: async () => data.scars(),
  };

  return { charactersApi, dataApi };
}
```

> NOTA DE VERIFICACIÓN: las firmas `execute({ ownerId })` / `execute({ id, ownerId })` deben coincidir con las de cada use case en `packages/core/src/application/character/*`. Antes de implementar, abre `GetCharacter.ts`, `ListCharacters.ts`, `UpdateCharacter.ts`, `DeleteCharacter.ts` y ajusta las claves del comando si difieren (p. ej. `query` vs `cmd`). El test del Step 1 falla en rojo si no coinciden.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @kw/web exec vitest run src/local/container.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/local/container.ts packages/web/src/local/container.test.ts
git commit -m "feat(local): composition container (localCharactersApi/localDataApi)"
```

---

### Task 5: Costura cliente — elegir local vs HTTP

**Files:**
- Create: `packages/web/src/client/characters.ts`
- Modify: `packages/web/src/characters/useCharacters.ts` (cambiar import)
- Modify: `packages/web/src/characters/create/*`, `CharacterEditPage.tsx`, etc. (solo si importan `charactersApi`/`dataApi` directo — cambiar a `client/`)

- [ ] **Step 1: Crear la costura**

```ts
// packages/web/src/client/characters.ts
import {
  charactersApi as httpCharactersApi,
  dataApi as httpDataApi,
} from "../api/characters.js";

// Local por defecto; HTTP solo si VITE_LOCAL === "false".
const USE_LOCAL = import.meta.env.VITE_LOCAL !== "false";

let charactersApi = httpCharactersApi;
let dataApi = httpDataApi;

if (USE_LOCAL) {
  const { createLocalClient } = await import("../local/container.js");
  const client = createLocalClient();
  charactersApi = client.charactersApi;
  dataApi = client.dataApi;
}

export { charactersApi, dataApi };
```

> El `await import` dinámico mantiene el código local fuera del bundle cuando `VITE_LOCAL=false`, y el HTTP fuera cuando es local (tree-shaking sobre la rama muerta no aplica al import estático de `httpCharactersApi`; si se quiere excluir también el HTTP del bundle local, convertir ambos a import dinámico en un paso posterior — YAGNI ahora).

- [ ] **Step 2: Apuntar useCharacters a la costura**

En `packages/web/src/characters/useCharacters.ts`, línea 10, cambia:
```ts
import { charactersApi, dataApi } from "../api/characters.js";
```
por:
```ts
import { charactersApi, dataApi } from "../client/characters.js";
```

- [ ] **Step 3: Buscar otros consumidores directos**

Run: `git grep -n "from \"../api/characters" packages/web/src` y `git grep -n "api/characters.js" packages/web/src`
Para cada archivo que importe `charactersApi`/`dataApi` directo desde `api/characters`, cámbialo a `client/characters.js`. (Deja intactos los imports de tipos desde `@kw/shared`.)

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @kw/web typecheck`
Expected: sin errores.

- [ ] **Step 5: Verificación manual offline**

Run: `pnpm --filter @kw/web dev`
Abrir la app, crear un personaje (rolear + guardar), recargar la página y confirmar que **persiste** (IndexedDB). Listar, editar nombre/HP, borrar. Sin red (DevTools → Network offline) debe seguir funcionando.

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/client/characters.ts packages/web/src/characters/useCharacters.ts
git commit -m "feat(local): client seam selects local store by default (VITE_LOCAL)"
```

**FASE 1 COMPLETA:** crear/listar/editar/borrar/rolear personajes offline con persistencia.

---

## FASE 2 — Serialización + export/import por archivo

### Task 6: Sobre canónico en @kw/shared

**Files:**
- Create: `packages/shared/src/schemas/characterExport.ts`
- Modify: `packages/shared/src/index.ts` (export)
- Test: `packages/shared/src/schemas/characterExport.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import {
  serializeCharacter, parseCharacterEnvelope, CHARACTER_SCHEMA_VERSION,
} from "./characterExport.js";
import type { Character } from "./character.js";

const sample = { /* objeto Character mínimo válido */ } as Character;

describe("characterExport", () => {
  it("round-trip serialize -> parse preserva el payload", () => {
    const json = serializeCharacter(sample);
    const env = parseCharacterEnvelope(json);
    expect(env.schemaVersion).toBe(CHARACTER_SCHEMA_VERSION);
    expect(env.payload.name).toBe(sample.name);
  });

  it("rechaza JSON con kind incorrecto", () => {
    expect(() => parseCharacterEnvelope(JSON.stringify({ kind: "x" }))).toThrow();
  });

  it("rechaza schemaVersion futura", () => {
    const bad = JSON.stringify({
      kind: "cairn-character", schemaVersion: 999, exportedAt: "", payload: sample,
    });
    expect(() => parseCharacterEnvelope(bad)).toThrow();
  });
});
```

> Construye `sample` a partir de un `Character` válido (mira `packages/shared/src/schemas/character.ts` para los campos requeridos; reutiliza la forma del test de la Task 2).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kw/shared exec vitest run src/schemas/characterExport.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write implementation**

```ts
import { z } from "zod";
import { CharacterSchema, type Character } from "./character.js";

export const CHARACTER_SCHEMA_VERSION = 1;

export const CharacterEnvelopeSchema = z.object({
  kind: z.literal("cairn-character"),
  schemaVersion: z.number().int().min(1).max(CHARACTER_SCHEMA_VERSION),
  exportedAt: z.string(),
  payload: CharacterSchema,
});
export type CharacterEnvelope = z.infer<typeof CharacterEnvelopeSchema>;

export function serializeCharacter(c: Character, now = new Date()): string {
  const env: CharacterEnvelope = {
    kind: "cairn-character",
    schemaVersion: CHARACTER_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    payload: c,
  };
  return JSON.stringify(env);
}

export function parseCharacterEnvelope(json: string): CharacterEnvelope {
  return CharacterEnvelopeSchema.parse(JSON.parse(json));
}
```

> VERIFICA que `CharacterSchema` se exporta desde `./character.js`. Si el símbolo tiene otro nombre, ajústalo.

- [ ] **Step 4: Export desde index**

En `packages/shared/src/index.ts` añade:
```ts
export * from "./schemas/characterExport.js";
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @kw/shared exec vitest run src/schemas/characterExport.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/schemas/characterExport.ts packages/shared/src/schemas/characterExport.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): versioned character export envelope"
```

---

### Task 7: Export/Import por archivo (UI)

**Files:**
- Create: `packages/web/src/local/exportFile.ts` (download + read helpers)
- Test: `packages/web/src/local/exportFile.test.ts`
- Modify: `packages/web/src/characters/CharacterViewPage.tsx` (botón Exportar)
- Modify: `packages/web/src/characters/ImportCharacterPage.tsx` (usar import por archivo)

- [ ] **Step 1: Write the failing test (parte pura)**

```ts
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { importEnvelopeIntoStore } from "./exportFile.js";
import { createLocalClient } from "./container.js";
import { serializeCharacter } from "@kw/shared";

describe("importEnvelopeIntoStore", () => {
  beforeEach(() => { indexedDB = new IDBFactory(); });

  it("importa un sobre como personaje nuevo con id local", async () => {
    const client = createLocalClient("kw-test");
    const draft = await client.charactersApi.roll("");
    const created = await client.charactersApi.create(draft);
    const json = serializeCharacter(created);

    const imported = await importEnvelopeIntoStore(client.charactersApi, json);
    expect(imported.id).not.toBe(created.id); // id nuevo, no colisiona
    expect((await client.charactersApi.list()).length).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @kw/web exec vitest run src/local/exportFile.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write implementation (parte pura + helpers DOM)**

```ts
import { parseCharacterEnvelope, type CreateCharacterInput } from "@kw/shared";
import type { Character } from "@kw/shared";

type CharactersApi = {
  create: (input: CreateCharacterInput) => Promise<Character>;
};

/** Convierte un Character importado en CreateCharacterInput (descarta id/owner). */
function toCreateInput(c: Character): CreateCharacterInput {
  return {
    name: c.name, background: c.background,
    strengthMax: c.strengthMax, dexterityMax: c.dexterityMax,
    willpowerMax: c.willpowerMax, hpMax: c.hpMax, gold: c.gold,
    items: c.items, containers: c.containers, description: c.description,
    traits: c.traits, notes: c.notes, bonds: c.bonds, omens: c.omens,
    imageUrl: c.imageUrl,
  };
}

export async function importEnvelopeIntoStore(
  api: CharactersApi, json: string
): Promise<Character> {
  const env = parseCharacterEnvelope(json);
  return api.create(toCreateInput(env.payload));
}

/** Descarga un string como archivo (solo navegador). */
export function downloadJson(filename: string, json: string): void {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Lee un File como texto. */
export function readFileText(file: File): Promise<string> {
  return file.text();
}
```

> El `toCreateInput` crea el personaje "fresco" (HP/atributos a max según `CreateCharacter`). Si se quiere preservar el estado exacto (HP actual, scars), un paso posterior puede usar `update` tras `create`. YAGNI para v1: import = nueva hoja.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @kw/web exec vitest run src/local/exportFile.test.ts`
Expected: PASS.

- [ ] **Step 5: Cablear UI**

En `CharacterViewPage.tsx`: añade botón "Exportar" que llama `downloadJson(\`${character.name}.cairn.json\`, serializeCharacter(character))`.
En `ImportCharacterPage.tsx`: input `type=file accept=.json`; al elegir, `readFileText` → `importEnvelopeIntoStore(charactersApi, text)` → invalidar query `["characters"]` y navegar a la hoja. Reutiliza `charactersApi` desde `client/characters.js`.

- [ ] **Step 6: Typecheck + verificación manual**

Run: `pnpm --filter @kw/web typecheck`
Manual: exportar un personaje, borrarlo, importarlo de vuelta desde el archivo, confirmar que reaparece.

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/local/exportFile.ts packages/web/src/local/exportFile.test.ts packages/web/src/characters/CharacterViewPage.tsx packages/web/src/characters/ImportCharacterPage.tsx
git commit -m "feat(local): export/import character by file"
```

**FASE 2 COMPLETA:** backup y portabilidad por archivo.

---

## FASE 3 — QR

### Task 8: Export/Import por QR

**Files:**
- Create: `packages/web/src/local/qr.ts` (encode/decode + size guard)
- Test: `packages/web/src/local/qr.test.ts`
- Modify: `packages/web/package.json` (deps `qrcode`, `pako`; devDeps `@types/qrcode`)
- Modify: UI de export (mostrar QR) e import (escanear/pegar)

- [ ] **Step 1: Dependencias**

Run: `pnpm --filter @kw/web add qrcode pako && pnpm --filter @kw/web add -D @types/qrcode`

- [ ] **Step 2: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { encodeForQr, decodeFromQr, QR_MAX_BYTES } from "./qr.js";

describe("qr codec", () => {
  it("round-trip encode -> decode", () => {
    const payload = JSON.stringify({ kind: "cairn-character", n: 1, text: "hola".repeat(20) });
    const encoded = encodeForQr(payload);
    expect(decodeFromQr(encoded)).toBe(payload);
  });

  it("encoded más corto que el original para textos repetitivos", () => {
    const payload = "a".repeat(2000);
    expect(encodeForQr(payload).length).toBeLessThan(2000);
  });

  it("QR_MAX_BYTES es un límite positivo", () => {
    expect(QR_MAX_BYTES).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @kw/web exec vitest run src/local/qr.test.ts`
Expected: FAIL.

- [ ] **Step 4: Write implementation**

```ts
import { deflate, inflate } from "pako";

/** Capacidad práctica de un QR v40 con ECC bajo (~2.9KB binarios). Margen de seguridad. */
export const QR_MAX_BYTES = 2800;

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** payload JSON -> deflate -> base64 (prefijo "C1:" marca formato). */
export function encodeForQr(payload: string): string {
  const compressed = deflate(payload);
  return "C1:" + bytesToBase64(compressed);
}

export function decodeFromQr(encoded: string): string {
  if (!encoded.startsWith("C1:")) throw new Error("Formato QR no reconocido");
  const bytes = base64ToBytes(encoded.slice(3));
  return inflate(bytes, { to: "string" });
}

export function fitsInQr(encoded: string): boolean {
  return encoded.length <= QR_MAX_BYTES;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @kw/web exec vitest run src/local/qr.test.ts`
Expected: PASS.

- [ ] **Step 6: UI export QR**

En la vista de personaje: botón "QR". `const enc = encodeForQr(serializeCharacter(character))`. Si `!fitsInQr(enc)` → toast "Personaje demasiado grande para QR, usa Exportar archivo". Si cabe → `QRCode.toDataURL(enc)` (lib `qrcode`) y mostrar `<img>` en un modal.

- [ ] **Step 7: UI import QR (web: pegar/subir imagen; nativo: cámara en Fase 4)**

Mínimo web sin cámara: textarea para pegar el contenido `C1:...` (o subir imagen y decodificar con un lector QR — diferible). `decodeFromQr` → `parseCharacterEnvelope` → `importEnvelopeIntoStore`. El escaneo con cámara nativa se cubre en Fase 4 con Capacitor.

- [ ] **Step 8: Commit**

```bash
git add packages/web/src/local/qr.ts packages/web/src/local/qr.test.ts packages/web/package.json
git commit -m "feat(local): QR codec (deflate+base64) with size guard + export UI"
```

**FASE 3 COMPLETA:** export por QR + import por pegado.

---

## FASE 4 — Capacitor + flag de build

### Task 9: Ocultar rutas online en modo local

**Files:**
- Modify: `packages/web/src/App.tsx` (o el router) — condicionar rutas auth/parties/realtime a `!USE_LOCAL`
- Create: `packages/web/src/client/mode.ts` (exporta `USE_LOCAL`)

- [ ] **Step 1: Centralizar el flag**

```ts
// packages/web/src/client/mode.ts
export const USE_LOCAL = import.meta.env.VITE_LOCAL !== "false";
```
Refactor: `client/characters.ts` importa `USE_LOCAL` de aquí.

- [ ] **Step 2: Condicionar rutas**

En `App.tsx`, envuelve las rutas de login/registro/cuenta/parties/join/realtime con `{!USE_LOCAL && (...)}`. Mantén siempre las de personajes, export/import. Verifica que la navegación (AppShell/NavDrawer) no muestre enlaces online en local.

- [ ] **Step 3: Typecheck + verificación**

Run: `pnpm --filter @kw/web typecheck && pnpm --filter @kw/web build`
Manual: en build local no aparecen rutas de cuenta/partidas; las de personajes funcionan.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/client/mode.ts packages/web/src/App.tsx packages/web/src/client/characters.ts
git commit -m "feat(local): hide online routes in local mode"
```

---

### Task 10: Scaffold Capacitor

**Files:**
- Create: `packages/web/capacitor.config.ts`
- Modify: `packages/web/package.json` (deps Capacitor)
- Create: carpetas `android/`/`ios/` (generadas por CLI; `ios/` solo en macOS)

- [ ] **Step 1: Instalar Capacitor**

Run:
```bash
pnpm --filter @kw/web add @capacitor/core @capacitor/filesystem @capacitor/share
pnpm --filter @kw/web add -D @capacitor/cli
```

- [ ] **Step 2: Config**

```ts
// packages/web/capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "es.kcsystem.cairn",
  appName: "Cairn",
  webDir: "dist",
};
export default config;
```

- [ ] **Step 3: Init plataforma Android**

Run (desde `packages/web`):
```bash
pnpm --filter @kw/web build
pnpm --filter @kw/web exec cap add android
pnpm --filter @kw/web exec cap sync
```
Expected: crea `packages/web/android/`. (iOS requiere macOS; omitir en Windows.)

- [ ] **Step 4: Export nativo por filesystem**

En `exportFile.ts`, añade `downloadOrShare(filename, json)`: si `Capacitor.isNativePlatform()` usa `Filesystem.writeFile` + `Share.share`; si no, `downloadJson`. Cablea el botón Exportar a esta función.

```ts
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export async function downloadOrShare(filename: string, json: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) { downloadJson(filename, json); return; }
  const res = await Filesystem.writeFile({
    path: filename, data: json, directory: Directory.Cache, encoding: Encoding.UTF8,
  });
  await Share.share({ url: res.uri, title: filename });
}
```

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @kw/web typecheck`
Expected: sin errores. (No es necesario compilar el APK en este plan; basta con que `cap sync` no falle y el typecheck pase.)

- [ ] **Step 6: Commit**

```bash
git add packages/web/capacitor.config.ts packages/web/package.json packages/web/android
git commit -m "feat(local): Capacitor scaffold + native share export"
```

**FASE 4 COMPLETA:** build local sin rutas online + envoltorio Capacitor con export nativo.

---

## Validación final

- [ ] `pnpm test` (todo el monorepo) en verde.
- [ ] `pnpm --filter @kw/web typecheck` sin errores.
- [ ] `pnpm --filter @kw/web build` genera `dist`.
- [ ] Manual offline: crear → recargar → persiste → editar → exportar archivo → borrar → importar archivo → reaparece → exportar QR (cabe) → importar por pegado.

---

## Self-review (cobertura del spec)

- Adaptadores IndexedDB / Dice / datos empaquetados → Tasks 1-3. ✅
- Contenedor + costura (UI vía use cases, nunca IndexedDB directo) → Tasks 4-5. ✅
- Sobre canónico versionado (un formato) → Task 6; archivo → Task 7; QR → Task 8. ✅
- Capacitor + ocultar online → Tasks 9-10. ✅
- Requisito duro (sin Node en cliente): adaptadores usan `crypto`/`idb`/bundle; `generate-bundle.mjs` corre en build, no en cliente. ✅
- Costura futura online: `CharacterRepository` intacto; sobre reutilizable como wire format. ✅
- **Divergencia consciente con el spec:** mercado (`BuyItems`) y generadores/NPCs quedan FUERA de este plan (el usuario acotó "solo personajes"; el inventario manual entra vía `UpdateCharacter`). Se abordarán en un plan posterior.

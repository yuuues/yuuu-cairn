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

import { defineConfig } from "tsup";

// Bundla el server a un único ESM ejecutable con `node dist/main.js`.
// Clave: los paquetes de workspace (@kw/core, @kw/shared) exponen TS fuente,
// así que se INLINAN en el bundle (noExternal). Prisma Client se mantiene
// externo porque carga el cliente generado + el engine nativo desde node_modules.
export default defineConfig({
  entry: ["src/main.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  outDir: "dist",
  clean: true,
  bundle: true,
  splitting: false,
  sourcemap: false,
  shims: false,
  noExternal: [/^@kw\//],
  external: ["@prisma/client", ".prisma/client"],
});

import type { CapacitorConfig } from "@capacitor/cli";

// NOTA: la plataforma nativa Android no se genera en este repo (requiere Android
// Studio / SDK). Para crearla localmente, ejecuta desde la raíz del monorepo:
//
//   pnpm --filter @kw/web build
//   pnpm --filter @kw/web exec cap add android
//   pnpm --filter @kw/web exec cap sync
//
// Esto creará packages/web/android/. (iOS requiere macOS; omitir en Windows.)
const config: CapacitorConfig = {
  appId: "es.kcsystem.cairn",
  appName: "Cairn",
  webDir: "dist",
};
export default config;

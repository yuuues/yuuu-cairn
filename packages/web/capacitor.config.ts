import type { CapacitorConfig } from "@capacitor/cli";

// Tras cambiar el SPA: `pnpm --filter @kw/web build && pnpm --filter @kw/web exec cap sync`.
// (iOS requiere macOS; omitir en Windows.)
const config: CapacitorConfig = {
  appId: "es.yuuu.cairn",
  appName: "Cairn",
  webDir: "dist",
};
export default config;

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // El seam client/characters.ts usa top-level await (import dinámico del
  // contenedor local). esnext es necesario para que esbuild no falle el build.
  build: {
    target: "esnext",
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});

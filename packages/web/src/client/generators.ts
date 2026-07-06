import { generatorsApi as httpGeneratorsApi } from "../api/generators.js";
import { USE_LOCAL } from "./mode.js";

// Binding vivo: se reasigna en modo local antes del primer render (main.tsx).
let generatorsApi = httpGeneratorsApi;

/** Cablea la API de generadores local (bundle, sin servidor) en modo local. */
export async function initGeneratorsClient(): Promise<void> {
  if (USE_LOCAL) {
    const { createLocalGeneratorsApi } = await import("../local/container.js");
    generatorsApi = createLocalGeneratorsApi();
  }
}

export { generatorsApi };

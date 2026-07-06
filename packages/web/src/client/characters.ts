import {
  charactersApi as httpCharactersApi,
  dataApi as httpDataApi,
} from "../api/characters.js";
import { USE_LOCAL } from "./mode.js";

let charactersApi = httpCharactersApi;
let dataApi = httpDataApi;

/**
 * Inicializa el cliente local ANTES de montar React (lo llama main.tsx).
 *
 * Ojo: esto era un top-level await, pero en el bundle de producción el chunk
 * de container.js importa código compartido del chunk principal; con la
 * evaluación del chunk principal suspendida en el await, ambos se esperaban
 * mutuamente para siempre (pantalla en blanco sin error, solo en prod —
 * en dev no hay chunks). Como función explícita, el módulo termina de
 * evaluarse y el import dinámico puede resolverse.
 */
export async function initApiClient(): Promise<void> {
  if (USE_LOCAL) {
    const { createLocalClient } = await import("../local/container.js");
    const client = createLocalClient();
    charactersApi = client.charactersApi;
    dataApi = client.dataApi;
  }
}

export { charactersApi, dataApi };

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
    send<{ result: RollTableResult }>("POST", "/api/generators/roll", input).then(
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

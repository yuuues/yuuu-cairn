import type {
  Character,
  CreateCharacterInput,
  UpdateCharacterInput,
  Backgrounds,
  Bond,
  Traits,
  Scar,
} from "@kw/shared";
import { ApiError } from "./auth.js";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.code ?? "error", data.message ?? "Request failed");
  }
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
  if (!res.ok) {
    throw new ApiError(data.code ?? "error", data.message ?? "Request failed");
  }
  return data as T;
}

export const charactersApi = {
  list: () =>
    getJson<{ characters: Character[] }>("/api/characters").then((d) => d.characters),
  get: (id: number) =>
    getJson<{ character: Character }>(`/api/characters/${id}`).then((d) => d.character),
  create: (input: CreateCharacterInput) =>
    send<{ character: Character }>("POST", "/api/characters", input).then(
      (d) => d.character
    ),
  update: (id: number, input: UpdateCharacterInput) =>
    send<{ character: Character }>("PATCH", `/api/characters/${id}`, input).then(
      (d) => d.character
    ),
  remove: (id: number) => send<{ ok: true }>("DELETE", `/api/characters/${id}`),
  roll: (background: string) =>
    send<{ draft: CreateCharacterInput }>("POST", "/api/characters/roll", {
      background,
    }).then((d) => d.draft),
};

export const dataApi = {
  backgrounds: () =>
    getJson<{ backgrounds: Backgrounds }>("/api/data/backgrounds").then(
      (d) => d.backgrounds
    ),
  bonds: () => getJson<{ bonds: Bond[] }>("/api/data/bonds").then((d) => d.bonds),
  omens: () => getJson<{ omens: string[] }>("/api/data/omens").then((d) => d.omens),
  traits: () => getJson<{ traits: Traits }>("/api/data/traits").then((d) => d.traits),
  scars: () => getJson<{ scars: Scar[] }>("/api/data/scars").then((d) => d.scars),
};

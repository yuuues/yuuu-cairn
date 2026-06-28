import type {
  Party,
  CreatePartyInput,
  UpdatePartyInput,
  JoinPartyInput,
  UpdatePartyInventoryInput,
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

export const partiesApi = {
  list: () =>
    getJson<{ parties: Party[] }>("/api/parties").then((d) => d.parties),

  get: (id: number) =>
    getJson<{ party: Party; joinCode: string | null }>(`/api/parties/${id}`),

  create: (input: CreatePartyInput) =>
    send<{ party: Party }>("POST", "/api/parties", input).then((d) => d.party),

  update: (id: number, input: UpdatePartyInput) =>
    send<{ party: Party }>("PATCH", `/api/parties/${id}`, input).then((d) => d.party),

  remove: (id: number) =>
    send<{ ok: true }>("DELETE", `/api/parties/${id}`),

  join: (input: JoinPartyInput) =>
    send<{ party: Party }>("POST", "/api/parties/join", input).then((d) => d.party),

  removeMember: (partyId: number, characterId: number) =>
    send<{ party: Party }>("DELETE", `/api/parties/${partyId}/members/${characterId}`).then((d) => d.party),

  updateInventory: (id: number, input: UpdatePartyInventoryInput) =>
    send<{ party: Party }>("PUT", `/api/parties/${id}/inventory`, input).then((d) => d.party),
};

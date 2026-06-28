import type {
  Character,
  UpdateInventoryInput,
  TransferItemInput,
} from "@kw/shared";
import { ApiError } from "./auth.js";

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

export const inventoryApi = {
  update: (id: number, input: UpdateInventoryInput) =>
    send<{ character: Character }>(
      "PUT",
      `/api/characters/${id}/inventory`,
      input
    ).then((d) => d.character),
  transfer: (id: number, input: TransferItemInput) =>
    send<{ ok: true }>("POST", `/api/characters/${id}/transfer`, input),
};

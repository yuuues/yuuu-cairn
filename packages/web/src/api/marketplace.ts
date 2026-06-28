import type { Character, MarketItem, BuyItemsInput } from "@kw/shared";
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

export const marketplaceApi = {
  catalog: () =>
    getJson<{ items: MarketItem[]; categories: string[] }>("/api/marketplace"),
  buy: (characterId: number, input: BuyItemsInput) =>
    send<{ character: Character }>(
      "POST",
      `/api/marketplace/${characterId}/buy`,
      input
    ).then((d) => d.character),
};

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { MarketItem } from "@kw/shared";
import { useMarketCatalog, useBuyItems } from "./useInventory.js";

interface MarketplaceModalProps {
  characterId: number;
  initialGold: number;
  containerId: number;
  onClose: () => void;
}

export function MarketplaceModal({
  characterId,
  initialGold,
  containerId,
  onClose,
}: MarketplaceModalProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useMarketCatalog();
  const buy = useBuyItems(characterId);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const itemsByName = useMemo(() => {
    const map = new Map<string, MarketItem>();
    for (const it of data?.items ?? []) map.set(it.name, it);
    return map;
  }, [data]);

  const spent = useMemo(
    () =>
      Object.entries(quantities).reduce((sum, [name, qty]) => {
        const it = itemsByName.get(name);
        return sum + (it ? it.cost * qty : 0);
      }, 0),
    [quantities, itemsByName]
  );
  const remainingGold = initialGold - spent;

  function changeQty(name: string, delta: number) {
    setError(null);
    const it = itemsByName.get(name);
    if (!it) return;
    if (delta > 0 && remainingGold < it.cost) {
      setError(`Not enough gold for ${name}`);
      return;
    }
    setQuantities((q) => {
      const next = Math.max(0, (q[name] ?? 0) + delta);
      return { ...q, [name]: next };
    });
  }

  function buildCart(): string[] {
    const cart: string[] = [];
    for (const [name, qty] of Object.entries(quantities)) {
      for (let i = 0; i < qty; i++) cart.push(name);
    }
    return cart;
  }

  async function handleBuy() {
    await buy.mutateAsync({
      cart: buildCart(),
      gold: remainingGold,
      containerId,
    });
    onClose();
  }

  if (isLoading) return <div className="modal">Loading marketplace…</div>;

  return (
    <div className="modal marketplace-modal">
      <header>
        <h2>{t("Marketplace")}</h2>
        <span className="gold-display">{t("Gold")}: {remainingGold}</span>
      </header>
      {error && <p className="error">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>{t("Cost")}</th>
            <th>Type</th>
            <th>Qty</th>
          </tr>
        </thead>
        <tbody>
          {(data?.items ?? []).map((it) => (
            <tr key={`${it.category}:${it.name}`}>
              <td>
                {it.name}
                {it.tags.length > 0 ? ` (${it.tags.map((tag) => t(tag)).join(", ")})` : ""}
              </td>
              <td>{it.cost}</td>
              <td>{it.category}</td>
              <td>
                <button type="button" onClick={() => changeQty(it.name, -1)}>
                  -
                </button>
                <span>{quantities[it.name] ?? 0}</span>
                <button type="button" onClick={() => changeQty(it.name, 1)}>
                  +
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <footer>
        <button type="button" onClick={onClose}>
          {t("Cancel")}
        </button>
        <button type="button" onClick={handleBuy} disabled={buy.isPending}>
          {t("Buy")}
        </button>
      </footer>
    </div>
  );
}

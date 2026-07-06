import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { MarketItem } from "@kw/shared";
import { useMarketCatalog, useBuyItems } from "./useInventory.js";
import { Modal, Button, Input, Field, Badge, Spinner } from "../ui/index.js";

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

  return (
    <Modal open onClose={onClose} title={t("Marketplace")} className="max-w-2xl">
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="text-sm text-text">{t("Gold")}:</p>
            {remainingGold < 0 ? (
              <span className="text-sm font-semibold text-danger">{remainingGold}</span>
            ) : (
              <Badge variant="moss">{remainingGold}</Badge>
            )}
          </div>

          {error && (
            <p role="alert" className="mb-3 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex flex-col divide-y divide-border">
            {(data?.items ?? []).map((it) => (
              <div
                key={`${it.category}:${it.name}`}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <span className="text-sm text-text">{it.name}</span>
                  {it.tags.map((tag) => (
                    <Badge key={tag}>{t(tag)}</Badge>
                  ))}
                  <Badge variant="neutral">{it.category}</Badge>
                </div>
                <span className="w-12 shrink-0 text-right text-sm text-muted">
                  {it.cost} gp
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t("Remove one {{item}}", { item: it.name })}
                    onClick={() => changeQty(it.name, -1)}
                  >
                    −
                  </Button>
                  <span className="w-6 text-center text-sm text-text">
                    {quantities[it.name] ?? 0}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t("Add one {{item}}", { item: it.name })}
                    onClick={() => changeQty(it.name, 1)}
                    disabled={remainingGold < it.cost}
                  >
                    +
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              {t("Cancel")}
            </Button>
            <Button onClick={handleBuy} disabled={buy.isPending || spent === 0}>
              {t("Buy")}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

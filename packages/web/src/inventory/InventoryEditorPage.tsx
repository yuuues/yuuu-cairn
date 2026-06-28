import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Item, Container } from "@kw/shared";
import { armorValue, occupiedMainSlots } from "@kw/core";
import { useCharacter } from "../characters/useCharacters.js";
import { useUpdateInventory } from "./useInventory.js";
import { ContainerView } from "./ContainerView.js";
import { MarketplaceModal } from "./MarketplaceModal.js";

export function InventoryEditorPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const characterId = Number(id);
  const navigate = useNavigate();
  const { data: character, isLoading } = useCharacter(characterId);
  const update = useUpdateInventory(characterId);

  const [items, setItems] = useState<Item[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [gold, setGold] = useState(0);
  const [showMarket, setShowMarket] = useState(false);

  useEffect(() => {
    if (character) {
      setItems(character.items);
      setContainers(character.containers);
      setGold(character.gold);
    }
  }, [character]);

  const liveArmor = useMemo(() => armorValue(items), [items]);
  const mainSlots = useMemo(() => occupiedMainSlots(items), [items]);

  function deleteItem(itemId: number) {
    setItems((prev) => prev.filter((it) => it.id !== itemId));
  }

  async function handleSave() {
    await update.mutateAsync({ items, containers, gold });
    navigate(`/characters/${characterId}`);
  }

  if (isLoading || !character) return <p>Loading…</p>;

  return (
    <div className="inventory-editor">
      <h1>{t("Inventory")} — {character.name}</h1>
      <p>
        <Link to={`/characters/${characterId}`}>← Back</Link>
      </p>

      <div className="inventory-summary">
        <label>
          {t("Gold")}:{" "}
          <input
            type="number"
            min={0}
            value={gold}
            onChange={(e) => setGold(Math.max(0, Number(e.target.value)))}
          />
        </label>
        <span>{t("Armor")}: {liveArmor}</span>
        <span>Main slots: {mainSlots}</span>
      </div>

      <button type="button" onClick={() => setShowMarket(true)}>
        {t("Marketplace")}
      </button>

      {containers.map((c) => (
        <ContainerView
          key={c.id}
          container={c}
          items={items}
          containers={containers}
          onDeleteItem={deleteItem}
        />
      ))}

      <button type="button" onClick={handleSave} disabled={update.isPending}>
        {t("Save")}
      </button>

      {showMarket && (
        <MarketplaceModal
          characterId={characterId}
          initialGold={gold}
          containerId={0}
          onClose={() => setShowMarket(false)}
        />
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Item, Container } from "@kw/shared";
import { armorValue, occupiedMainSlots } from "@kw/core";
import { useCharacter } from "../characters/useCharacters.js";
import { useUpdateInventory } from "./useInventory.js";
import { ContainerView } from "./ContainerView.js";
import { MarketplaceModal } from "./MarketplaceModal.js";
import { Container as UiContainer, PageHeader, Card, Field, Input, Button, Skeleton } from "../ui/index.js";

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

  if (isLoading || !character)
    return (
      <UiContainer>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Card className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
          <Skeleton className="h-11 w-28" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
          <div className="flex gap-2 sm:ml-auto">
            <Skeleton className="h-11 w-32" />
            <Skeleton className="h-11 w-24" />
          </div>
        </Card>
        <Card className="flex flex-col gap-3">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </Card>
      </UiContainer>
    );

  return (
    <UiContainer>
      <PageHeader
        title={`${t("Inventory")} — ${character.name}`}
        actions={
          <Link to={`/characters/${characterId}`}>
            <Button variant="ghost" size="sm">← {t("Back")}</Button>
          </Link>
        }
      />

      <Card className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
        <Field label={t("Gold")} htmlFor="inv-gold" className="w-28">
          <Input
            id="inv-gold"
            type="number"
            min={0}
            value={gold}
            onChange={(e) => setGold(Math.max(0, Number(e.target.value)))}
          />
        </Field>
        <p className="text-sm text-text">
          {t("Armor")}: <span className="font-semibold">{liveArmor}</span>
        </p>
        <p className="text-sm text-text">
          Main slots: <span className="font-semibold">{mainSlots}</span>
        </p>
        <div className="flex gap-2 sm:ml-auto">
          <Button variant="secondary" onClick={() => setShowMarket(true)}>
            {t("Marketplace")}
          </Button>
          <Button onClick={handleSave} disabled={update.isPending}>
            {t("Save")}
          </Button>
        </div>
      </Card>

      {containers.map((c) => (
        <ContainerView
          key={c.id}
          container={c}
          items={items}
          containers={containers}
          onDeleteItem={deleteItem}
        />
      ))}

      {showMarket && (
        <MarketplaceModal
          characterId={characterId}
          initialGold={gold}
          containerId={0}
          onClose={() => setShowMarket(false)}
        />
      )}
    </UiContainer>
  );
}

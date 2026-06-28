import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { charactersApi } from "../api/characters.js";
import { armorValue, occupiedMainSlots } from "@kw/core";
import type { Character, Item, Container } from "@kw/shared";

function getItemsForContainer(items: Item[], containerId: number): Item[] {
  return items.filter((it) => it.location === containerId);
}

function containerSlots(items: Item[], containerId: number): number {
  return getItemsForContainer(items, containerId).reduce((sum, it) => {
    if (it.tags.includes("petty")) return sum;
    if (it.tags.includes("bulky")) return sum + 2;
    return sum + 1;
  }, 0);
}

function InventorySection({ character }: { character: Character }) {
  const { t } = useTranslation();
  return (
    <div>
      <h3>{t("Inventory")}</h3>
      <div id="additional-inventory-container" className="character-print-grid">
        {character.containers.map((c: Container) => (
          <div key={c.id} style={{ marginBottom: "1em" }} className="inventory-container print-container">
            <div className="inventory-container-title-selected subtitle">
              {c.name} ({containerSlots(character.items, c.id)} / {c.slots})
            </div>
            {getItemsForContainer(character.items, c.id).map((it) => (
              <span key={it.id} className="inventory-item-container">
                {it.name}
                {it.tags.length > 0 ? ` (${it.tags.join(", ")})` : ""}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PrintCharacterPage() {
  const { id } = useParams();
  const characterId = Number(id);
  const { t } = useTranslation();

  const { data: character, isLoading, isError } = useQuery({
    queryKey: ["characters", characterId],
    queryFn: () => charactersApi.get(characterId),
  });

  // Paridad: window.print() al cargar (character_print.html lo ejecuta on-load)
  useEffect(() => {
    if (character) {
      window.print();
    }
  }, [character]);

  if (isLoading) return <p>Loading...</p>;
  if (isError || !character) return <p>Character not found.</p>;

  const armor = armorValue(character.items);
  const slots = occupiedMainSlots(character.items);

  return (
    <div className="body-container" style={{ marginTop: 0 }}>
      <div className="view-character-sheet" style={{ paddingTop: 0 }}>

        {/* Cabecera: retrato + nombre + trasfondo */}
        <div style={{ display: "flex", flexDirection: "row", gap: "1em", marginBottom: "1em" }}>
          <img
            src={
              character.imageUrl && character.imageUrl !== "default-portrait.webp"
                ? character.imageUrl
                : "/static/images/portraits/default-portrait.webp"
            }
            alt="character portrait"
            className="portrait-image"
          />
          <div>
            <h1 className="view-mode">{character.name}</h1>
            <h2>{character.background}</h2>
          </div>
        </div>

        {/* Stats + Rasgos */}
        <div className="character-print-grid print-container">
          <div>
            <h3>Stats</h3>
            <div className="stats-stats-container character-section">
              <div className="character-attribute-container">
                <h4>STR</h4>
                <p className="subtitle view-mode">{character.strength}/{character.strengthMax}</p>
              </div>
              <div className="character-attribute-container">
                <h4>DEX</h4>
                <p className="subtitle view-mode">{character.dexterity}/{character.dexterityMax}</p>
              </div>
              <div className="character-attribute-container">
                <h4>WIL</h4>
                <p className="subtitle view-mode">{character.willpower}/{character.willpowerMax}</p>
              </div>
              <div className="character-attribute-container">
                <h4>{t("HP")}</h4>
                <p className="subtitle view-mode">{character.hp}/{character.hpMax}</p>
              </div>
              {character.deprived && (
                <h4 className="character-deprived-text view-mode">{t("Deprived").toUpperCase()}</h4>
              )}
              <div className="character-attribute-container">
                <h4 className="view-attribute-font">{t("Gold")}</h4>
                <p className="subtitle view-mode">{character.gold}</p>
              </div>
              <div className="character-attribute-container">
                <h4>{t("Armor")}</h4>
                <p className="subtitle">{armor}</p>
              </div>
              <div className="character-attribute-container">
                <h4>{t("Slots")}</h4>
                <p className="subtitle">{slots}/10</p>
              </div>
            </div>
          </div>
          <div>
            <h3>{t("Traits")}</h3>
            <p id="character-traits-view" className="character-section">{character.traits}</p>
          </div>
        </div>

        {/* Inventario */}
        <InventorySection character={character} />

        {/* Campos de texto */}
        <div>
          {character.description && (
            <div id="character-print-description-container" className="print-container">
              <div className="character-section">
                <h3>{t("Description")}</h3>
                <p>{character.description}</p>
              </div>
            </div>
          )}
          <div id="character-print-bonds-container" className="print-container">
            <div className="character-section">
              <h3>{t("Bonds")}</h3>
              <p className="with-whitespace">{character.bonds}</p>
            </div>
          </div>
          {character.omens && (
            <div id="character-print-omens-container" className="print-container">
              <div className="character-section">
                <h3>{t("Omens")}</h3>
                <p>{character.omens}</p>
              </div>
            </div>
          )}
          {character.scars && (
            <div id="character-print-scars-container" className="print-container">
              <div className="character-section">
                <h3>{t("Scars")}</h3>
                <p>{character.scars}</p>
              </div>
            </div>
          )}
          {character.notes && (
            <div id="character-print-notes-container" className="print-container">
              <div className="character-section">
                <h3>{t("Notes")}</h3>
                <p>{character.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

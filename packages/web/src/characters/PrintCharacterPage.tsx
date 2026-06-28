import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { charactersApi } from "../client/characters.js";
import { armorValue, occupiedMainSlots } from "@kw/core";
import type { Character, Item, Container } from "@kw/shared";
import { Button, Badge } from "../ui/index.js";

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
    <div className="mt-4">
      <h2 className="mb-2 font-serif text-lg text-black">{t("Inventory")}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {character.containers.map((c: Container) => (
          <div key={c.id} className="rounded border border-stone-300 p-2">
            <p className="mb-1 text-sm font-semibold text-black">
              {c.name}{" "}
              <span className="font-normal text-stone-500">
                ({containerSlots(character.items, c.id)} / {c.slots})
              </span>
            </p>
            <ul className="flex flex-col gap-0.5">
              {getItemsForContainer(character.items, c.id).map((it) => (
                <li key={it.id} className="flex flex-wrap items-center gap-1 text-xs text-black">
                  {it.name}
                  {it.tags.map((tag) => (
                    <Badge key={tag} variant="neutral" className="text-[10px]">
                      {t(tag)}
                    </Badge>
                  ))}
                </li>
              ))}
            </ul>
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

  if (isLoading) return <p className="p-8 text-stone-600">{t("Loading")}…</p>;
  if (isError || !character) return <p className="p-8 text-stone-600">{t("Character not found.")}</p>;

  const armor = armorValue(character.items);
  const slots = occupiedMainSlots(character.items);

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-black print:p-0">
      {/* Acciones: ocultas en impresión */}
      <div className="mb-6 flex gap-3 print:hidden">
        <Button onClick={() => window.print()}>{t("Print")}</Button>
        <Link to={`/characters/${character.id}`}>
          <Button variant="secondary">{t("Back")}</Button>
        </Link>
      </div>

      {/* Cabecera: retrato + nombre + trasfondo */}
      <div className="mb-6 flex flex-row items-start gap-4">
        <img
          src={
            character.imageUrl && character.imageUrl !== "default-portrait.webp"
              ? character.imageUrl
              : "/static/images/portraits/default-portrait.webp"
          }
          alt={`${character.name} — ${t("character portrait")}`}
          className="h-24 w-24 rounded object-cover"
        />
        <div>
          <h1 className="font-serif text-3xl text-black">{character.name}</h1>
          <h2 className="font-serif text-xl text-stone-600">{character.background}</h2>
        </div>
      </div>

      {/* Stats + Rasgos */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded border border-stone-200 p-3">
          <h2 className="mb-2 font-serif text-lg text-black">{t("Stats")}</h2>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "STR", val: `${character.strength}/${character.strengthMax}` },
              { label: "DEX", val: `${character.dexterity}/${character.dexterityMax}` },
              { label: "WIL", val: `${character.willpower}/${character.willpowerMax}` },
              { label: t("HP"), val: `${character.hp}/${character.hpMax}` },
              { label: t("Gold"), val: character.gold },
              { label: t("Armor"), val: armor },
              { label: t("Slots"), val: `${slots}/10` },
            ].map(({ label, val }) => (
              <div key={label} className="flex flex-col items-center">
                <span className="text-xs font-semibold text-stone-500">{label}</span>
                <span className="text-sm text-black">{val}</span>
              </div>
            ))}
          </div>
          {character.deprived && (
            <p className="mt-2 text-sm font-bold uppercase text-red-600">
              {t("Deprived")}
            </p>
          )}
        </div>

        <div className="rounded border border-stone-200 p-3">
          <h2 className="mb-2 font-serif text-lg text-black">{t("Traits")}</h2>
          <p className="whitespace-pre-wrap text-sm text-black">{character.traits}</p>
        </div>
      </div>

      {/* Inventario */}
      <InventorySection character={character} />

      {/* Campos de texto */}
      <div className="mt-4 grid grid-cols-1 gap-3">
        {character.description && (
          <div className="rounded border border-stone-200 p-3">
            <h2 className="mb-1 font-serif text-base text-black">{t("Description")}</h2>
            <p className="text-sm text-black">{character.description}</p>
          </div>
        )}
        <div className="rounded border border-stone-200 p-3">
          <h2 className="mb-1 font-serif text-base text-black">{t("Bonds")}</h2>
          <p className="whitespace-pre-wrap text-sm text-black">{character.bonds}</p>
        </div>
        {character.omens && (
          <div className="rounded border border-stone-200 p-3">
            <h2 className="mb-1 font-serif text-base text-black">{t("Omens")}</h2>
            <p className="text-sm text-black">{character.omens}</p>
          </div>
        )}
        {character.scars && (
          <div className="rounded border border-stone-200 p-3">
            <h2 className="mb-1 font-serif text-base text-black">{t("Scars")}</h2>
            <p className="text-sm text-black">{character.scars}</p>
          </div>
        )}
        {character.notes && (
          <div className="rounded border border-stone-200 p-3">
            <h2 className="mb-1 font-serif text-base text-black">{t("Notes")}</h2>
            <p className="text-sm text-black">{character.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

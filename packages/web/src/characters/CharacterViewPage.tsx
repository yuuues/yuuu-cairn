import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCharacter } from "./useCharacters.js";

export function CharacterViewPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const charId = Number(id);
  const { data: character, isLoading, error } = useCharacter(charId);

  if (isLoading) return <p>Loading…</p>;
  if (error || !character) return <p>Character not found.</p>;

  return (
    <div>
      <h1>{character.name}</h1>
      <p>
        <Link to="/characters">← Back</Link> ·{" "}
        <Link to={`/characters/${character.id}/edit`}>{t("Edit")}</Link> ·{" "}
        <Link to={`/characters/${character.id}/inventory`}>{t("Inventory")}</Link>
      </p>
      <p>Background: {character.background}</p>
      <ul>
        <li>
          {t("Strength")} {character.strength}/{character.strengthMax}
        </li>
        <li>
          {t("Dexterity")} {character.dexterity}/{character.dexterityMax}
        </li>
        <li>
          {t("Willpower")} {character.willpower}/{character.willpowerMax}
        </li>
        <li>
          {t("HP")} {character.hp}/{character.hpMax}
        </li>
        <li>{t("Armor")}: {character.armor ?? "0"}</li>
        <li>{t("Gold")}: {character.gold}</li>
      </ul>
      {character.bonds && (
        <section>
          <h2>{t("Bonds")}</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{character.bonds}</p>
        </section>
      )}
      {character.omens && (
        <section>
          <h2>{t("Omens")}</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{character.omens}</p>
        </section>
      )}
      {character.traits && (
        <section>
          <h2>{t("Traits")}</h2>
          <p>{character.traits}</p>
        </section>
      )}
      <section>
        <h2>{t("Inventory")}</h2>
        <ul>
          {character.items.map((it) => (
            <li key={it.id}>
              {it.name}
              {it.tags.length > 0 ? ` (${it.tags.join(", ")})` : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

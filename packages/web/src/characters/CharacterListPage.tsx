import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCharacters, useDeleteCharacter } from "./useCharacters.js";

export function CharacterListPage() {
  const { t } = useTranslation();
  const { data: characters, isLoading, error } = useCharacters();
  const del = useDeleteCharacter();

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>Failed to load characters.</p>;

  return (
    <div>
      <h1>{t("Characters")}</h1>
      <p>
        <Link to="/characters/new">+ {t("Create Character")}</Link>
      </p>
      {characters && characters.length === 0 ? (
        <p>No characters yet.</p>
      ) : (
        <ul>
          {characters?.map((c) => (
            <li key={c.id}>
              <Link to={`/characters/${c.id}`}>{c.name}</Link> — {c.background}{" "}
              <button
                onClick={() => del.mutate(c.id)}
                disabled={del.isPending}
                aria-label={`${t("Delete")} ${c.name}`}
              >
                {t("Delete")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

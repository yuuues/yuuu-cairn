import { Link } from "react-router-dom";
import { useCharacters, useDeleteCharacter } from "./useCharacters.js";

export function CharacterListPage() {
  const { data: characters, isLoading, error } = useCharacters();
  const del = useDeleteCharacter();

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>Failed to load characters.</p>;

  return (
    <div>
      <h1>Characters</h1>
      <p>
        <Link to="/characters/new">+ New character</Link>
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
                aria-label={`Delete ${c.name}`}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { Link, useParams } from "react-router-dom";
import { useCharacter } from "./useCharacters.js";

export function CharacterViewPage() {
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
        <Link to={`/characters/${character.id}/edit`}>Edit</Link> ·{" "}
        <Link to={`/characters/${character.id}/inventory`}>Inventory</Link>
      </p>
      <p>Background: {character.background}</p>
      <ul>
        <li>
          STR {character.strength}/{character.strengthMax}
        </li>
        <li>
          DEX {character.dexterity}/{character.dexterityMax}
        </li>
        <li>
          WIL {character.willpower}/{character.willpowerMax}
        </li>
        <li>
          HP {character.hp}/{character.hpMax}
        </li>
        <li>Armor: {character.armor ?? "0"}</li>
        <li>Gold: {character.gold}</li>
      </ul>
      {character.bonds && (
        <section>
          <h2>Bonds</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{character.bonds}</p>
        </section>
      )}
      {character.omens && (
        <section>
          <h2>Omens</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{character.omens}</p>
        </section>
      )}
      {character.traits && (
        <section>
          <h2>Traits</h2>
          <p>{character.traits}</p>
        </section>
      )}
      <section>
        <h2>Inventory</h2>
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

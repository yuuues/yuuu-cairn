import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { UpdateCharacterInput } from "@kw/shared";
import { useCharacter, useUpdateCharacter } from "./useCharacters.js";

export function CharacterEditPage() {
  const { id } = useParams();
  const charId = Number(id);
  const navigate = useNavigate();
  const { data: character, isLoading } = useCharacter(charId);
  const update = useUpdateCharacter(charId);
  const [form, setForm] = useState<UpdateCharacterInput>({});

  useEffect(() => {
    if (character) {
      setForm({
        name: character.name,
        strength: character.strength,
        strengthMax: character.strengthMax,
        dexterity: character.dexterity,
        dexterityMax: character.dexterityMax,
        willpower: character.willpower,
        willpowerMax: character.willpowerMax,
        hp: character.hp,
        hpMax: character.hpMax,
        deprived: character.deprived,
        panicked: character.panicked,
        gold: character.gold,
        description: character.description,
        traits: character.traits,
        notes: character.notes,
        bonds: character.bonds,
        scars: character.scars,
        omens: character.omens,
      });
    }
  }, [character]);

  if (isLoading || !character) return <p>Loading…</p>;

  const num =
    (key: keyof UpdateCharacterInput) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: Number(e.target.value) }));
  const str =
    (key: keyof UpdateCharacterInput) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  const bool =
    (key: keyof UpdateCharacterInput) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.checked }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await update.mutateAsync(form);
    navigate(`/characters/${charId}`);
  };

  return (
    <form onSubmit={onSubmit}>
      <h1>Edit {character.name}</h1>
      <label>
        Name <input value={form.name ?? ""} onChange={str("name")} />
      </label>
      <fieldset>
        <legend>Attributes</legend>
        <label>
          STR <input type="number" value={form.strength ?? 0} onChange={num("strength")} />
          / <input type="number" value={form.strengthMax ?? 0} onChange={num("strengthMax")} />
        </label>
        <label>
          DEX <input type="number" value={form.dexterity ?? 0} onChange={num("dexterity")} />
          / <input type="number" value={form.dexterityMax ?? 0} onChange={num("dexterityMax")} />
        </label>
        <label>
          WIL <input type="number" value={form.willpower ?? 0} onChange={num("willpower")} />
          / <input type="number" value={form.willpowerMax ?? 0} onChange={num("willpowerMax")} />
        </label>
        <label>
          HP <input type="number" value={form.hp ?? 0} onChange={num("hp")} />
          / <input type="number" value={form.hpMax ?? 0} onChange={num("hpMax")} />
        </label>
      </fieldset>
      <label>
        Gold <input type="number" value={form.gold ?? 0} onChange={num("gold")} />
      </label>
      <label>
        <input type="checkbox" checked={form.deprived ?? false} onChange={bool("deprived")} />{" "}
        Deprived
      </label>
      <label>
        <input type="checkbox" checked={form.panicked ?? false} onChange={bool("panicked")} />{" "}
        Panicked
      </label>
      <label>
        Description
        <textarea value={form.description ?? ""} onChange={str("description")} />
      </label>
      <label>
        Traits
        <textarea value={form.traits ?? ""} onChange={str("traits")} />
      </label>
      <label>
        Bonds
        <textarea value={form.bonds ?? ""} onChange={str("bonds")} />
      </label>
      <label>
        Omens
        <textarea value={form.omens ?? ""} onChange={str("omens")} />
      </label>
      <label>
        Scars
        <textarea value={form.scars ?? ""} onChange={str("scars")} />
      </label>
      <label>
        Notes
        <textarea value={form.notes ?? ""} onChange={str("notes")} />
      </label>
      <button type="submit" disabled={update.isPending}>
        Save
      </button>
      {update.isError && <p role="alert">Failed to save.</p>}
    </form>
  );
}

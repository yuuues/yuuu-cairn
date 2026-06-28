import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CreateCharacterInput } from "@kw/shared";
import {
  useBackgrounds,
  useRollCharacter,
  useCreateCharacter,
} from "../useCharacters.js";

type Step = "background" | "review";

const emptyDraft = (background: string): CreateCharacterInput => ({
  name: "",
  background,
  strengthMax: 10,
  dexterityMax: 10,
  willpowerMax: 10,
  hpMax: 1,
  gold: 0,
  items: [],
  containers: [{ id: 0, name: "Main", slots: 10 }],
  description: null,
  traits: null,
  notes: null,
  bonds: null,
  omens: null,
  imageUrl: "default-portrait.webp",
});

export function CharacterCreatePage() {
  const navigate = useNavigate();
  const { data: backgrounds } = useBackgrounds();
  const roll = useRollCharacter();
  const create = useCreateCharacter();

  const [step, setStep] = useState<Step>("background");
  const [selected, setSelected] = useState("");
  const [draft, setDraft] = useState<CreateCharacterInput | null>(null);

  const rollWith = async (background: string) => {
    const d = await roll.mutateAsync(background);
    setDraft(d);
    setStep("review");
  };

  const startManual = () => {
    setDraft(emptyDraft(selected));
    setStep("review");
  };

  const onSave = async () => {
    if (!draft) return;
    const created = await create.mutateAsync(draft);
    navigate(`/characters/${created.id}`);
  };

  if (step === "background") {
    return (
      <div>
        <h1>New character</h1>
        <button onClick={() => rollWith("")} disabled={roll.isPending}>
          Roll a random character
        </button>
        <h2>…or pick a background</h2>
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Select…</option>
          {backgrounds &&
            Object.keys(backgrounds).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
        </select>
        <button onClick={() => rollWith(selected)} disabled={!selected || roll.isPending}>
          Roll this background
        </button>
        <button onClick={startManual} disabled={!selected}>
          Fill manually
        </button>
      </div>
    );
  }

  if (!draft) return null;

  const setField = <K extends keyof CreateCharacterInput>(
    key: K,
    value: CreateCharacterInput[K]
  ) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  return (
    <div>
      <h1>Review character</h1>
      <p>Background: {draft.background}</p>
      <label>
        Name
        <input
          value={draft.name}
          onChange={(e) => setField("name", e.target.value)}
        />
      </label>
      <fieldset>
        <legend>Attributes (max)</legend>
        <label>
          STR
          <input
            type="number"
            value={draft.strengthMax}
            onChange={(e) => setField("strengthMax", Number(e.target.value))}
          />
        </label>
        <label>
          DEX
          <input
            type="number"
            value={draft.dexterityMax}
            onChange={(e) => setField("dexterityMax", Number(e.target.value))}
          />
        </label>
        <label>
          WIL
          <input
            type="number"
            value={draft.willpowerMax}
            onChange={(e) => setField("willpowerMax", Number(e.target.value))}
          />
        </label>
        <label>
          HP
          <input
            type="number"
            value={draft.hpMax}
            onChange={(e) => setField("hpMax", Number(e.target.value))}
          />
        </label>
      </fieldset>
      <label>
        Gold
        <input
          type="number"
          value={draft.gold}
          onChange={(e) => setField("gold", Number(e.target.value))}
        />
      </label>
      <section>
        <h2>Starting gear</h2>
        <ul>
          {draft.items.map((it) => (
            <li key={it.id}>
              {it.name}
              {it.tags.length > 0 ? ` (${it.tags.join(", ")})` : ""}
            </li>
          ))}
        </ul>
      </section>
      {draft.bonds && (
        <p>
          <strong>Bonds:</strong> {draft.bonds}
        </p>
      )}
      {draft.omens && (
        <p>
          <strong>Omens:</strong> {draft.omens}
        </p>
      )}
      <div>
        <button onClick={() => setStep("background")}>← Back</button>
        <button onClick={onSave} disabled={!draft.name || create.isPending}>
          Save character
        </button>
      </div>
      {create.isError && <p role="alert">Failed to save. Check required fields.</p>}
    </div>
  );
}

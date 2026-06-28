import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useImportCharacter } from "../generators/useGenerators.js";
import { ImportCharacterPayloadSchema } from "@kw/shared";

export function ImportCharacterPage() {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const importMutation = useImportCharacter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Please select a JSON file.");
      return;
    }
    try {
      const text = await file.text();
      const raw = JSON.parse(text) as unknown;

      // Normalización de claves del formato del origen (snake_case → camelCase)
      const normalized = normalizeCharacterJson(raw);
      const payload = ImportCharacterPayloadSchema.parse(normalized);

      await importMutation.mutateAsync(payload);
      setSuccess(true);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("Invalid JSON file.");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Import failed.");
      }
    }
  }

  if (success) {
    return (
      <section className="body-container">
        <p>Character imported successfully!</p>
        <a href="/characters" className="button is-success">Go to characters</a>
      </section>
    );
  }

  return (
    <section className="body-container">
      <form onSubmit={(e) => void handleSubmit(e)} style={{ maxWidth: "460px" }}>
        <div>
          <h3>Upload JSON Character File</h3>
          <input
            type="file"
            ref={fileRef}
            accept=".json"
            style={{ display: "flex", flexDirection: "column" }}
          />
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <br /><br />
        <div style={{ display: "flex", gap: "0.5em" }}>
          <button
            type="submit"
            className="button is-success"
            disabled={importMutation.isPending}
          >
            {importMutation.isPending ? "Importing..." : t("Import")}
          </button>
          <a href="/characters" className="button">
            {t("Cancel")}
          </a>
        </div>
      </form>
    </section>
  );
}

/**
 * Normaliza el JSON de export del origen (claves snake_case) a camelCase.
 * Paridad: los exports del origin usan strength_max, hp_max, etc.
 */
function normalizeCharacterJson(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Invalid character data: expected an object.");
  }
  const r = raw as Record<string, unknown>;
  return {
    name: r["name"],
    background: r["background"],
    strengthMax: r["strengthMax"] ?? r["strength_max"],
    dexterityMax: r["dexterityMax"] ?? r["dexterity_max"],
    willpowerMax: r["willpowerMax"] ?? r["willpower_max"],
    hpMax: r["hpMax"] ?? r["hp_max"],
    strength: r["strength"],
    dexterity: r["dexterity"],
    willpower: r["willpower"],
    hp: r["hp"],
    deprived: r["deprived"],
    gold: r["gold"],
    items: r["items"],
    containers: r["containers"],
    description: r["description"],
    traits: r["traits"],
    notes: r["notes"],
    bonds: r["bonds"],
    omens: r["omens"],
    scars: r["scars"],
    imageUrl: r["imageUrl"] ?? r["image_url"],
  };
}

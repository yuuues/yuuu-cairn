import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useImportCharacter } from "../generators/useGenerators.js";
import { ImportCharacterPayloadSchema } from "@kw/shared";
import { Container, Card, Button } from "../ui/index.js";

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
      setError(t("Please select a JSON file."));
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
        setError(t("Invalid JSON file."));
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t("Import failed."));
      }
    }
  }

  if (success) {
    return (
      <Container className="max-w-md">
        <Card className="flex flex-col gap-4 text-center">
          <p className="text-success">{t("Character imported successfully!")}</p>
          <Link to="/characters">
            <Button>{t("Go to characters")}</Button>
          </Link>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="max-w-md">
      <Card>
        <h1 className="mb-6 font-serif text-2xl text-text">{t("Upload JSON Character File")}</h1>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text">
              {t("JSON File")}
            </label>
            <input
              type="file"
              ref={fileRef}
              accept=".json"
              className="text-sm text-text file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-text hover:file:bg-bg"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={importMutation.isPending}
            >
              {importMutation.isPending ? t("Importing…") : t("Import")}
            </Button>
            <Link to="/characters">
              <Button type="button" variant="secondary">{t("Cancel")}</Button>
            </Link>
          </div>
        </form>
      </Card>
    </Container>
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

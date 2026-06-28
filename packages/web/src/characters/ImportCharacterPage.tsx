import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { charactersApi } from "../client/characters.js";
import { importEnvelopeIntoStore, readFileText } from "../local/exportFile.js";
import { decodeFromQr } from "../local/qr.js";
import { Container, Card, Button, Textarea } from "../ui/index.js";

export function ImportCharacterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrText, setQrText] = useState("");
  const [qrError, setQrError] = useState<string | null>(null);

  const importMutation = useMutation({
    mutationFn: (json: string) =>
      importEnvelopeIntoStore(charactersApi, json),
    onSuccess: (character) => {
      void qc.invalidateQueries({ queryKey: ["characters"] });
      navigate(`/characters/${character.id}`);
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError(t("Please select a JSON file."));
      return;
    }
    try {
      const text = await readFileText(file);
      await importMutation.mutateAsync(text);
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

  async function handleQrSubmit(e: React.FormEvent) {
    e.preventDefault();
    setQrError(null);
    const value = qrText.trim();
    if (!value) {
      setQrError(t("Please paste QR content."));
      return;
    }
    try {
      const json = decodeFromQr(value);
      await importMutation.mutateAsync(json);
    } catch (err) {
      if (err instanceof Error) {
        setQrError(err.message);
      } else {
        setQrError(t("Import failed."));
      }
    }
  }

  return (
    <Container className="max-w-md">
      <Card>
        <h1 className="mb-6 font-serif text-2xl text-text">{t("Upload JSON Character File")}</h1>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="import-json-file" className="text-sm font-medium text-text">
              {t("JSON File")}
            </label>
            <input
              id="import-json-file"
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

      <Card className="mt-6">
        <h2 className="mb-4 font-serif text-xl text-text">{t("Import from QR")}</h2>
        <form onSubmit={(e) => void handleQrSubmit(e)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="import-qr-text" className="text-sm font-medium text-text">
              {t("QR content")}
            </label>
            <Textarea
              id="import-qr-text"
              rows={4}
              value={qrText}
              onChange={(e) => setQrText(e.target.value)}
              placeholder="C1:…"
            />
          </div>
          {qrError && (
            <p role="alert" className="text-sm text-danger">
              {qrError}
            </p>
          )}
          <Button type="submit" disabled={importMutation.isPending}>
            {importMutation.isPending ? t("Importing…") : t("Import")}
          </Button>
        </form>
      </Card>
    </Container>
  );
}

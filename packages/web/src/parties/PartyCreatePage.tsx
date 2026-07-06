import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCreateParty } from "./useParties.js";
import { Container, Card, Field, Input, Textarea, Button } from "../ui/index.js";

export function PartyCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const create = useCreateParty();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const party = await create.mutateAsync({ name, description: description || null, notes: null });
    navigate(`/parties/${party.id}`);
  };

  return (
    <Container className="max-w-2xl">
      <div className="mx-auto flex min-h-[60vh] w-full items-start">
        <Card className="w-full">
          <h1 className="mb-6 font-serif text-2xl font-bold tracking-tight text-text">{t("Create Party")}</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label={t("Name")} htmlFor="party-name">
              <Input
                id="party-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={64}
              />
            </Field>
            <Field label={t("Description")} htmlFor="party-description">
              <Textarea
                id="party-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
              />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" disabled={create.isPending}>
                {t("Create Party")}
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate("/parties")}>
                {t("Cancel")}
              </Button>
            </div>
          </form>
          {create.error && (
            <p role="alert" className="mt-4 text-sm text-danger">
              Error: {(create.error as Error).message}
            </p>
          )}
        </Card>
      </div>
    </Container>
  );
}

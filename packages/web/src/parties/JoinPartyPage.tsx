import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useJoinParty } from "./useParties.js";
import { useCharacters } from "../characters/useCharacters.js";
import { Container, Card, Field, Input, Select, Button, Skeleton } from "../ui/index.js";

export function JoinPartyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const join = useJoinParty();
  const { data: characters, isLoading } = useCharacters();

  const [joinCode, setJoinCode] = useState("");
  const [characterId, setCharacterId] = useState<number | "">("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!characterId) return;
    const party = await join.mutateAsync({ joinCode, characterId: Number(characterId) });
    navigate(`/parties/${party.id}`);
  };

  if (isLoading)
    return (
      <Container className="max-w-2xl">
        <div className="mx-auto flex min-h-[60vh] w-full items-start">
          <Card className="w-full">
            <Skeleton className="mb-6 h-7 w-1/3" />
            <div className="flex flex-col gap-4">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          </Card>
        </div>
      </Container>
    );

  return (
    <Container className="max-w-2xl">
      <div className="mx-auto flex min-h-[60vh] w-full items-start">
        <Card className="w-full">
          <h1 className="mb-6 font-serif text-2xl font-bold tracking-tight text-text">{t("Join Party")}</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label={t("Party Code")} htmlFor="join-code">
              <Input
                id="join-code"
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                required
                placeholder="Enter join code"
              />
            </Field>
            <Field label="Character" htmlFor="join-character">
              <Select
                id="join-character"
                value={characterId}
                onChange={(e) => setCharacterId(e.target.value ? Number(e.target.value) : "")}
                required
              >
                <option value="">{t("Select a character")}</option>
                {characters?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.background})
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex gap-2">
              <Button type="submit" disabled={join.isPending}>
                {t("Join Party")}
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate("/parties")}>
                {t("Cancel")}
              </Button>
            </div>
          </form>
          {join.error && (
            <p role="alert" className="mt-4 text-sm text-danger">
              Error: {(join.error as Error).message}
            </p>
          )}
        </Card>
      </div>
    </Container>
  );
}

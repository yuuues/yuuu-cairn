import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Character } from "@kw/shared";
import { Container, PageHeader, Button, Skeleton } from "../ui/index.js";
import { useCharacter, useUpdateCharacter } from "./useCharacters.js";
import { CharacterPartsEditor } from "../avatar/CharacterPartsEditor.js";
import {
  partsToAvatar,
  partsFromAvatar,
  type CharacterParts,
} from "../avatar/CharacterRig.js";

/**
 * Editor de avatar ligado a UN personaje. Carga su avatar guardado, deja
 * editarlo con el mismo <CharacterPartsEditor> del sandbox y lo persiste
 * vía useUpdateCharacter (que va a idb en local o al servidor online).
 */
function AvatarEditor({ character }: { character: Character }) {
  const { t } = useTranslation();
  const update = useUpdateCharacter(character.id);
  // Estado sembrado una sola vez desde el avatar guardado del personaje.
  const [parts, setParts] = useState<CharacterParts>(() =>
    partsFromAvatar(character.avatar)
  );

  const save = () => update.mutate({ avatar: partsToAvatar(parts) });

  return (
    <>
      <PageHeader
        title={`${character.name} · ${t("Avatar")}`}
        actions={
          <>
            <Link to={`/characters/${character.id}`}>
              <Button variant="ghost" size="sm">
                ← {t("Back")}
              </Button>
            </Link>
            <Button size="sm" onClick={save} disabled={update.isPending}>
              {update.isPending ? t("Saving…") : t("Save")}
            </Button>
          </>
        }
      />
      {update.isSuccess && !update.isPending && (
        <p className="mb-3 text-sm text-muted" role="status">
          {t("Saved")}
        </p>
      )}
      <CharacterPartsEditor value={parts} onChange={setParts} />
    </>
  );
}

export function CharacterAvatarPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const charId = Number(id);
  const { data: character, isLoading, error } = useCharacter(charId);

  if (isLoading)
    return (
      <Container>
        <Skeleton className="mb-6 h-8 w-56" />
        <Skeleton className="h-96 w-full" />
      </Container>
    );
  if (error || !character)
    return (
      <Container>
        <p className="text-danger">{t("Character not found.")}</p>
      </Container>
    );

  return (
    <Container className="max-w-3xl">
      <AvatarEditor character={character} />
    </Container>
  );
}

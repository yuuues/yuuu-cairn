import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCharacters, useDeleteCharacter } from "./useCharacters.js";
import { Container, PageHeader, Card, Button, Spinner } from "../ui/index.js";

export function CharacterListPage() {
  const { t } = useTranslation();
  const { data: characters, isLoading, error } = useCharacters();
  const del = useDeleteCharacter();

  if (isLoading)
    return (
      <Container>
        <Spinner />
      </Container>
    );
  if (error)
    return (
      <Container>
        <p className="text-danger">Failed to load characters.</p>
      </Container>
    );

  return (
    <Container>
      <PageHeader
        title={t("Characters")}
        actions={
          <Link to="/characters/new">
            <Button>+ {t("Create Character")}</Button>
          </Link>
        }
      />
      {characters && characters.length === 0 ? (
        <p className="text-muted">{t("No characters yet.")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {characters?.map((c) => (
            <Card key={c.id} className="flex flex-col gap-3">
              <div>
                <Link
                  to={`/characters/${c.id}`}
                  className="font-serif text-lg text-text hover:text-accent"
                >
                  {c.name}
                </Link>
                <p className="text-sm text-muted">{c.background}</p>
              </div>
              <Button
                variant="danger"
                size="sm"
                className="self-start"
                onClick={() => del.mutate(c.id)}
                disabled={del.isPending}
                aria-label={`${t("Delete")} ${c.name}`}
              >
                {t("Delete")}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}

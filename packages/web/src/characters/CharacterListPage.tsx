import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCharacters, useDeleteCharacter } from "./useCharacters.js";
import { Container, PageHeader, Card, Button, Skeleton, Fab } from "../ui/index.js";

export function CharacterListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: characters, isLoading, error } = useCharacters();
  const del = useDeleteCharacter();

  if (isLoading)
    return (
      <Container>
        <PageHeader title={t("Characters")} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="flex flex-col gap-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
          ))}
        </div>
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
          <div className="flex flex-wrap gap-2">
            <Link to="/characters/new">
              <Button>+ {t("Create Character")}</Button>
            </Link>
            <Link to="/characters/import">
              <Button variant="secondary">{t("Import")}</Button>
            </Link>
          </div>
        }
      />
      {characters && characters.length === 0 ? (
        <p className="text-muted">{t("No characters yet.")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {characters?.map((c) => (
            <Card key={c.id} interactive className="relative flex flex-col gap-3">
              <Link
                to={`/characters/${c.id}`}
                className="absolute inset-0 rounded-(--radius-card) focus:outline-none"
                aria-label={c.name}
              />
              <div className="pointer-events-none">
                <p className="font-serif text-lg text-text">{c.name}</p>
                <p className="text-sm text-muted">{c.background}</p>
              </div>
              <Button
                variant="danger"
                size="sm"
                className="relative z-10 self-start"
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
      <Fab aria-label={t("Create Character")} onClick={() => navigate("/characters/new")}>
        +
      </Fab>
    </Container>
  );
}

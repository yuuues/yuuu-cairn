import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useParties, useDeleteParty } from "./useParties.js";
import { Container, PageHeader, Card, Button, Fab, Skeleton } from "../ui/index.js";

export function PartyListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: parties, isLoading, error } = useParties();
  const del = useDeleteParty();

  if (isLoading)
    return (
      <Container>
        <PageHeader title={t("Parties")} />
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
        <p className="text-danger">Failed to load parties.</p>
      </Container>
    );

  return (
    <Container>
      <PageHeader
        title={t("Parties")}
        actions={
          <>
            <Link to="/parties/new">
              <Button>+ {t("Create Party")}</Button>
            </Link>
            <Link to="/parties/join">
              <Button variant="secondary">{t("Join Party")}</Button>
            </Link>
          </>
        }
      />
      {parties && parties.length === 0 ? (
        <p className="text-muted">{t("No parties yet.")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {parties?.map((p) => (
            <Card key={p.id} interactive className="relative flex flex-col gap-3">
              <Link
                to={`/parties/${p.id}`}
                className="absolute inset-0 rounded-(--radius-card) focus:outline-none"
                aria-label={p.name}
              />
              <div className="pointer-events-none">
                <p className="font-serif text-lg text-text">{p.name}</p>
                {p.description ? (
                  <p className="text-sm text-muted">{p.description}</p>
                ) : null}
              </div>
              <Button
                variant="danger"
                size="sm"
                className="relative z-10 self-start"
                onClick={() => del.mutate(p.id)}
                disabled={del.isPending}
                aria-label={`${t("Delete")} ${p.name}`}
              >
                {t("Delete")}
              </Button>
            </Card>
          ))}
        </div>
      )}
      <Fab aria-label={t("Create Party")} onClick={() => navigate("/parties/new")}>
        +
      </Fab>
    </Container>
  );
}

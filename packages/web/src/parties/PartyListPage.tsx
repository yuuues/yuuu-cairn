import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useParties, useDeleteParty } from "./useParties.js";
import { Container, PageHeader, Card, Button, Spinner } from "../ui/index.js";

export function PartyListPage() {
  const { t } = useTranslation();
  const { data: parties, isLoading, error } = useParties();
  const del = useDeleteParty();

  if (isLoading)
    return (
      <Container>
        <Spinner />
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
        <p className="text-muted">No parties yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {parties?.map((p) => (
            <Card key={p.id} className="flex flex-col gap-3">
              <div>
                <Link
                  to={`/parties/${p.id}`}
                  className="font-serif text-lg text-text hover:text-accent"
                >
                  {p.name}
                </Link>
                {p.description ? (
                  <p className="text-sm text-muted">{p.description}</p>
                ) : null}
              </div>
              <Button
                variant="danger"
                size="sm"
                className="self-start"
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
    </Container>
  );
}

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useParties, useDeleteParty } from "./useParties.js";

export function PartyListPage() {
  const { t } = useTranslation();
  const { data: parties, isLoading, error } = useParties();
  const del = useDeleteParty();

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>Failed to load parties.</p>;

  return (
    <div>
      <h1>{t("Parties")}</h1>
      <p>
        <Link to="/parties/new">+ {t("Create Party")}</Link>
        {" · "}
        <Link to="/parties/join">{t("Join Party")}</Link>
      </p>
      {parties && parties.length === 0 ? (
        <p>No parties yet.</p>
      ) : (
        <ul>
          {parties?.map((p) => (
            <li key={p.id}>
              <Link to={`/parties/${p.id}`}>{p.name}</Link>
              {p.description ? ` — ${p.description}` : ""}
              {" "}
              <button
                onClick={() => del.mutate(p.id)}
                disabled={del.isPending}
                aria-label={`${t("Delete")} ${p.name}`}
              >
                {t("Delete")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

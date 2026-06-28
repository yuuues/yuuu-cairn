import { Link } from "react-router-dom";
import { useParties, useDeleteParty } from "./useParties.js";

export function PartyListPage() {
  const { data: parties, isLoading, error } = useParties();
  const del = useDeleteParty();

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>Failed to load parties.</p>;

  return (
    <div>
      <h1>Parties</h1>
      <p>
        <Link to="/parties/new">+ New party</Link>
        {" · "}
        <Link to="/parties/join">Join by code</Link>
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
                aria-label={`Delete ${p.name}`}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

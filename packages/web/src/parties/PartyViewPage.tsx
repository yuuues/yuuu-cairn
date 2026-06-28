import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { useParty } from "./useParties.js";
import { useSession } from "../auth/useSession.js";

export function PartyViewPage() {
  const { id } = useParams<{ id: string }>();
  const partyId = Number(id);
  const { data: session } = useSession();
  const { data, isLoading, error } = useParty(partyId);

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>Party not found or access denied.</p>;
  if (!data) return null;

  const { party, joinCode } = data;
  const isOwner = session?.id === party.ownerId;
  const isSubowner = session?.id !== undefined && party.subowners.includes(session.id);

  return (
    <div>
      <h1>{party.name}</h1>
      {party.description && <p>{party.description}</p>}

      {(isOwner || isSubowner) && (
        <div>
          <Link to={`/parties/${party.id}/edit`}>Edit party</Link>
          {joinCode && (
            <p>
              Join code: <strong>{joinCode}</strong>
            </p>
          )}
        </div>
      )}

      <section>
        <h2>Members ({party.members.length})</h2>
        {party.members.length === 0 ? (
          <p>No members yet.</p>
        ) : (
          <ul>
            {party.members.map((memberId) => (
              <li key={memberId}>Character #{memberId}</li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Group Storage</h2>
        {party.items.length === 0 ? (
          <p>No items in group storage.</p>
        ) : (
          <ul>
            {party.items.map((item) => (
              <li key={item.id}>{item.name}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

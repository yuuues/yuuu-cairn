import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useParty, useUpdateParty, useDeleteParty, useRemoveMember } from "./useParties.js";
import { useSession } from "../auth/useSession.js";

export function PartyEditPage() {
  const { id } = useParams<{ id: string }>();
  const partyId = Number(id);
  const navigate = useNavigate();
  const { data: session } = useSession();
  const { data, isLoading, error } = useParty(partyId);
  const update = useUpdateParty(partyId);
  const del = useDeleteParty();
  const removeMember = useRemoveMember(partyId);

  const [name, setName] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null | undefined>(undefined);

  if (isLoading) return <p>Loading…</p>;
  if (error || !data) return <p>Party not found or access denied.</p>;

  const { party } = data;
  const isOwner = session?.id === party.ownerId;
  const isSubowner = session?.id !== undefined && party.subowners.includes(session.id);

  if (!isOwner && !isSubowner) {
    return <p>Access denied.</p>;
  }

  const currentName = name ?? party.name;
  const currentDescription = description !== undefined ? description : party.description;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await update.mutateAsync({ name: currentName, description: currentDescription });
    navigate(`/parties/${partyId}`);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete party "${party.name}"?`)) return;
    await del.mutateAsync(partyId);
    navigate("/parties");
  };

  return (
    <div>
      <form onSubmit={handleSave}>
        <h1>
          <input
            type="text"
            value={currentName}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={64}
          />
        </h1>
        <textarea
          value={currentDescription ?? ""}
          onChange={(e) => setDescription(e.target.value || null)}
          maxLength={2000}
        />
        <div>
          <button type="submit" disabled={update.isPending}>Save</button>
          <button type="button" onClick={() => navigate(`/parties/${partyId}`)}>Cancel</button>
        </div>
      </form>

      <section>
        <h2>Members</h2>
        {party.members.length === 0 ? (
          <p>No members yet.</p>
        ) : (
          <ul>
            {party.members.map((memberId) => (
              <li key={memberId}>
                Character #{memberId}
                {isOwner && (
                  <button
                    onClick={() => removeMember.mutate(memberId)}
                    disabled={removeMember.isPending}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {isOwner && (
        <div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={del.isPending}
          >
            Delete Party
          </button>
        </div>
      )}
    </div>
  );
}

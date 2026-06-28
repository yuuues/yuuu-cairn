import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useParty } from "./useParties.js";
import { useSession } from "../auth/useSession.js";
import { useCharacters } from "../characters/useCharacters.js";
import { useDiceRoller } from "../realtime/useDiceRoller.js";
import { DiceModal } from "../realtime/DiceModal.js";

export function PartyViewPage() {
  const { id } = useParams<{ id: string }>();
  const partyId = Number(id);
  const { data: session } = useSession();
  const { data, isLoading, error } = useParty(partyId);
  const { data: myCharacters } = useCharacters();
  const { notifications, roll } = useDiceRoller();
  const [diceOpen, setDiceOpen] = useState(false);

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>Party not found or access denied.</p>;
  if (!data) return null;

  const { party, joinCode } = data;
  const isOwner = session?.id === party.ownerId;
  const isSubowner = session?.id !== undefined && party.subowners.includes(session.id);

  // Primer personaje del usuario que es miembro de la partida (para tirar dados).
  const myMemberCharacter = (myCharacters ?? []).find((c) => party.members.includes(c.id));

  function handleRoll(rollText: string) {
    if (!myMemberCharacter) return;
    roll({ characterId: myMemberCharacter.id, partyId: party.id, roll: rollText });
    setDiceOpen(false);
  }

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

      {myMemberCharacter && (
        <section>
          <button type="button" onClick={() => setDiceOpen(true)}>
            Roll dice
          </button>
          {diceOpen && (
            <DiceModal
              mode="party"
              onRoll={handleRoll}
              onClose={() => setDiceOpen(false)}
            />
          )}
        </section>
      )}

      <section aria-live="polite">
        <h2>Dice rolls</h2>
        {notifications.length === 0 ? (
          <p>No rolls yet.</p>
        ) : (
          <ul>
            {notifications.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        )}
      </section>

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

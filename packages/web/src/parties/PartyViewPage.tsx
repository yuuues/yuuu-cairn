import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useParty } from "./useParties.js";
import { useSession } from "../auth/useSession.js";
import { useCharacters } from "../characters/useCharacters.js";
import { useDiceRoller } from "../realtime/useDiceRoller.js";
import { DiceModal } from "../realtime/DiceModal.js";
import { Container, PageHeader, Card, Badge, Button, Skeleton } from "../ui/index.js";

export function PartyViewPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const partyId = Number(id);
  const { data: session } = useSession();
  const { data, isLoading, error } = useParty(partyId);
  const { data: myCharacters } = useCharacters();
  const { notifications, roll } = useDiceRoller();
  const [diceOpen, setDiceOpen] = useState(false);

  if (isLoading)
    return (
      <Container>
        <Skeleton className="mb-6 h-8 w-1/2" />
        <div className="flex flex-col gap-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Container>
    );
  if (error)
    return (
      <Container>
        <p className="text-danger">{t("Party not found or access denied.")}</p>
      </Container>
    );
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
    <Container>
      <PageHeader
        title={party.name}
        actions={
          (isOwner || isSubowner) ? (
            <Link to={`/parties/${party.id}/edit`}>
              <Button variant="secondary">{t("Edit")}</Button>
            </Link>
          ) : undefined
        }
      />

      {party.description && (
        <p className="mb-6 text-muted">{party.description}</p>
      )}

      {(isOwner || isSubowner) && joinCode && (
        <Card className="mb-6">
          <p className="text-sm text-muted">{t("Party Code")}</p>
          <Badge variant="accent" className="mt-1 text-base font-mono">{joinCode}</Badge>
        </Card>
      )}

      {myMemberCharacter && (
        <Card className="mb-6">
          <Button type="button" onClick={() => setDiceOpen(true)}>
            {t("Roll dice")}
          </Button>
          {diceOpen && (
            <DiceModal
              mode="party"
              onRoll={handleRoll}
              onClose={() => setDiceOpen(false)}
            />
          )}
        </Card>
      )}

      <Card className="mb-6" aria-live="polite">
        <h2 className="mb-3 font-serif text-lg text-text">{t("Dice rolls")}</h2>
        {notifications.length === 0 ? (
          <p className="text-muted">{t("No rolls yet.")}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {notifications.map((msg, i) => (
              <li key={i} className="text-sm text-text">{msg}</li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mb-6">
        <h2 className="mb-3 font-serif text-lg text-text">{t("Members")} ({party.members.length})</h2>
        {party.members.length === 0 ? (
          <p className="text-muted">{t("No members yet.")}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {party.members.map((memberId) => (
              <li key={memberId} className="text-sm text-text">{t("Character #{{id}}", { id: memberId })}</li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-serif text-lg text-text">{t("Items")}</h2>
        {party.items.length === 0 ? (
          <p className="text-muted">{t("No items in group storage.")}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {party.items.map((item) => (
              <li key={item.id} className="text-sm text-text">{item.name}</li>
            ))}
          </ul>
        )}
      </Card>
    </Container>
  );
}

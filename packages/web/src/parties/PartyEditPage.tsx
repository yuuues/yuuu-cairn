import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useParty, useUpdateParty, useDeleteParty, useRemoveMember } from "./useParties.js";
import { useSession } from "../auth/useSession.js";
import { Container, Card, Field, Input, Textarea, Button, Spinner } from "../ui/index.js";

export function PartyEditPage() {
  const { t } = useTranslation();
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

  if (isLoading)
    return (
      <Container>
        <Spinner />
      </Container>
    );
  if (error || !data)
    return (
      <Container>
        <p className="text-danger">{t("Party not found or access denied.")}</p>
      </Container>
    );

  const { party } = data;
  const isOwner = session?.id === party.ownerId;
  const isSubowner = session?.id !== undefined && party.subowners.includes(session.id);

  if (!isOwner && !isSubowner) {
    return (
      <Container>
        <p className="text-danger">{t("Access denied.")}</p>
      </Container>
    );
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
    <Container className="max-w-2xl">
      <h1 className="mb-6 font-serif text-3xl text-text">{t("Edit")} {party.name}</h1>

      <Card className="mb-6">
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <Field label={t("Name")} htmlFor="edit-party-name">
            <Input
              id="edit-party-name"
              type="text"
              value={currentName}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={64}
            />
          </Field>
          <Field label={t("Description")} htmlFor="edit-party-description">
            <Textarea
              id="edit-party-description"
              value={currentDescription ?? ""}
              onChange={(e) => setDescription(e.target.value || null)}
              maxLength={2000}
            />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" disabled={update.isPending}>
              {t("Save Party")}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(`/parties/${partyId}`)}>
              {t("Cancel")}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="mb-6">
        <h2 className="mb-3 font-serif text-lg text-text">{t("Members")} ({party.members.length})</h2>
        {party.members.length === 0 ? (
          <p className="text-muted">{t("No members yet.")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {party.members.map((memberId) => (
              <li key={memberId} className="flex items-center justify-between py-2">
                <span className="text-sm text-text">{t("Character #{{id}}", { id: memberId })}</span>
                {isOwner && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => removeMember.mutate(memberId)}
                    disabled={removeMember.isPending}
                  >
                    {t("Remove")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {isOwner && (
        <div>
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            disabled={del.isPending}
          >
            {t("Delete")}
          </Button>
        </div>
      )}
    </Container>
  );
}

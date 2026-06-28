import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCreateParty } from "./useParties.js";

export function PartyCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const create = useCreateParty();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const party = await create.mutateAsync({ name, description: description || null, notes: null });
    navigate(`/parties/${party.id}`);
  };

  return (
    <div>
      <h1>{t("Create Party")}</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>{t("Name")}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={64}
          />
        </div>
        <div>
          <label>{t("Description")}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
          />
        </div>
        <button type="submit" disabled={create.isPending}>
          {t("Create Party")}
        </button>
        <button type="button" onClick={() => navigate("/parties")}>
          {t("Cancel")}
        </button>
      </form>
      {create.error && <p>Error: {(create.error as Error).message}</p>}
    </div>
  );
}

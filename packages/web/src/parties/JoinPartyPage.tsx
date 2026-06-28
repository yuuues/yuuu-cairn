import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useJoinParty } from "./useParties.js";
import { useCharacters } from "../characters/useCharacters.js";

export function JoinPartyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const join = useJoinParty();
  const { data: characters, isLoading } = useCharacters();

  const [joinCode, setJoinCode] = useState("");
  const [characterId, setCharacterId] = useState<number | "">("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!characterId) return;
    const party = await join.mutateAsync({ joinCode, characterId: Number(characterId) });
    navigate(`/parties/${party.id}`);
  };

  if (isLoading) return <p>Loading characters…</p>;

  return (
    <div>
      <h1>{t("Join Party")}</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>{t("Party Code")}</label>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            required
            placeholder="Enter join code"
          />
        </div>
        <div>
          <label>Character</label>
          <select
            value={characterId}
            onChange={(e) => setCharacterId(e.target.value ? Number(e.target.value) : "")}
            required
          >
            <option value="">Select a character</option>
            {characters?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.background})
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={join.isPending}>
          {t("Join Party")}
        </button>
        <button type="button" onClick={() => navigate("/parties")}>
          {t("Cancel")}
        </button>
      </form>
      {join.error && <p>Error: {(join.error as Error).message}</p>}
    </div>
  );
}

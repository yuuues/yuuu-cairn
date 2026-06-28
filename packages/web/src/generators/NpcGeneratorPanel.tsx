import { useTranslation } from "react-i18next";
import { useGenerateNpc } from "./useGenerators.js";
import type { NpcResult } from "@kw/shared";

function NpcCard({ npc }: { npc: NpcResult }) {
  return (
    <div className="text-border" style={{ marginTop: "1em" }}>
      <p><strong>Name:</strong> {npc.name}</p>
      <p><strong>Background:</strong> {npc.background}</p>
      <p><strong>Virtue:</strong> {npc.virtue}</p>
      <p><strong>Vice:</strong> {npc.vice}</p>
      <p><strong>Quirk:</strong> {npc.quirk}</p>
      <p><strong>Goal:</strong> {npc.goal}</p>
    </div>
  );
}

export function NpcGeneratorPanel() {
  const { t } = useTranslation();
  const npcMutation = useGenerateNpc();

  return (
    <div className="flex-column-centered">
      <button
        className="roll button dice-button"
        type="button"
        onClick={() => npcMutation.mutate()}
        disabled={npcMutation.isPending}
      >
        <i className="fa-solid fa-dice dice"></i>
        {" "}{t("Generators")}
      </button>
      {npcMutation.data && <NpcCard npc={npcMutation.data} />}
    </div>
  );
}

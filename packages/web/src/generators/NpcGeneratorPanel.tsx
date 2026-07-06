import { useTranslation } from "react-i18next";
import { useGenerateNpc } from "./useGenerators.js";
import type { NpcResult } from "@kw/shared";
import { Card, Button } from "../ui/index.js";

function NpcCard({ npc }: { npc: NpcResult }) {
  const { t } = useTranslation();
  return (
    <Card className="mt-4 flex flex-col gap-2 text-sm text-text">
      <p><strong>{t("Name")}:</strong> {npc.name}</p>
      <p><strong>{t("Background")}:</strong> {npc.background}</p>
      <p><strong>{t("Virtue")}:</strong> {npc.virtue}</p>
      <p><strong>{t("Vice")}:</strong> {npc.vice}</p>
      <p><strong>{t("Quirk")}:</strong> {npc.quirk}</p>
      <p><strong>{t("Goal")}:</strong> {npc.goal}</p>
    </Card>
  );
}

export function NpcGeneratorPanel() {
  const { t } = useTranslation();
  const npcMutation = useGenerateNpc();

  return (
    <div className="flex flex-col gap-4">
      <Button
        type="button"
        onClick={() => npcMutation.mutate()}
        disabled={npcMutation.isPending}
      >
        {t("Generate NPC")}
      </Button>
      {npcMutation.data && <NpcCard npc={npcMutation.data} />}
    </div>
  );
}

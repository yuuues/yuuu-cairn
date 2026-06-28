import { useState } from "react";
import { useTranslation } from "react-i18next";
import { GeneratorTablePanel } from "./GeneratorTablePanel.js";
import { NpcGeneratorPanel } from "./NpcGeneratorPanel.js";
import { Container, Card, cn } from "../ui/index.js";

type Tab = "tables" | "pcgen";

export function ToolsPage() {
  const [tab, setTab] = useState<Tab>("tables");
  const { t } = useTranslation();

  const tabClass = (active: boolean) =>
    cn(
      "rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium",
      active
        ? "border-accent text-accent"
        : "border-transparent text-muted hover:text-text"
    );

  return (
    <Container className="max-w-3xl">
      <h1 className="mb-4 font-serif text-3xl text-text">{t("Tools")}</h1>
      <div role="tablist" className="flex gap-2 border-b border-border">
        <button
          role="tab"
          aria-selected={tab === "tables"}
          onClick={() => setTab("tables")}
          className={tabClass(tab === "tables")}
        >
          Tables
        </button>
        <button
          role="tab"
          aria-selected={tab === "pcgen"}
          onClick={() => setTab("pcgen")}
          className={tabClass(tab === "pcgen")}
        >
          {t("Generators")}
        </button>
      </div>
      <Card className="mt-4">
        <div hidden={tab !== "tables"} role="tabpanel">
          <GeneratorTablePanel />
        </div>
        <div hidden={tab !== "pcgen"} role="tabpanel">
          <NpcGeneratorPanel />
        </div>
      </Card>
    </Container>
  );
}

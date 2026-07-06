import { useState } from "react";
import { useTranslation } from "react-i18next";
import { GeneratorTablePanel } from "./GeneratorTablePanel.js";
import { NpcGeneratorPanel } from "./NpcGeneratorPanel.js";
import { Container, Card, PageHeader, cn } from "../ui/index.js";

type Tab = "tables" | "pcgen";

export function ToolsPage() {
  const [tab, setTab] = useState<Tab>("tables");
  const { t } = useTranslation();

  const tabClass = (active: boolean) =>
    cn(
      "flex min-h-11 items-center rounded-t-(--radius-lg) border-b-2 px-4 text-sm font-medium transition-colors duration-(--duration-fast) ease-(--ease-emphasized) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
      active
        ? "border-accent text-accent"
        : "border-transparent text-muted hover:text-text"
    );

  return (
    <Container className="max-w-3xl">
      <PageHeader title={t("Tools")} />
      <div role="tablist" className="flex gap-2 border-b border-border">
        <button
          role="tab"
          aria-selected={tab === "tables"}
          onClick={() => setTab("tables")}
          className={tabClass(tab === "tables")}
        >
          {t("Tables")}
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

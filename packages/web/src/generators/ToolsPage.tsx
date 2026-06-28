import { useState } from "react";
import { GeneratorTablePanel } from "./GeneratorTablePanel.js";
import { NpcGeneratorPanel } from "./NpcGeneratorPanel.js";

type Tab = "tables" | "pcgen";

export function ToolsPage() {
  const [tab, setTab] = useState<Tab>("tables");

  return (
    <div className="body-container">
      <div className="sheet party-tools-sheet">
        <h2>Tools</h2>
        <div className="tabs" role="tablist">
          <ul>
            <li>
              <button
                role="tab"
                aria-selected={tab === "tables"}
                onClick={() => setTab("tables")}
                className={tab === "tables" ? "is-active" : ""}
              >
                Tables
              </button>
            </li>
            <li>
              <button
                role="tab"
                aria-selected={tab === "pcgen"}
                onClick={() => setTab("pcgen")}
                className={tab === "pcgen" ? "is-active" : ""}
              >
                Character Generator
              </button>
            </li>
          </ul>
          <div className="tab-content" hidden={tab !== "tables"} role="tabpanel">
            <GeneratorTablePanel />
          </div>
          <div className="tab-content" hidden={tab !== "pcgen"} role="tabpanel">
            <NpcGeneratorPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

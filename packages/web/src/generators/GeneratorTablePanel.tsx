import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useGeneratorTables, useRollTable } from "./useGenerators.js";

function getSubcategories(value: unknown): string[] | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const keys = Object.keys(value as Record<string, unknown>);
  return keys.length > 0 ? keys : null;
}

export function GeneratorTablePanel() {
  const { t } = useTranslation();
  const { data: tables, isLoading } = useGeneratorTables();
  const rollMutation = useRollTable();
  const [category, setCategory] = useState<string>("");
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [result, setResult] = useState<string>("");

  const categories = tables ? Object.keys(tables) : [];
  const selectedValue = category && tables ? tables[category] : undefined;
  const subcategories = selectedValue !== undefined ? getSubcategories(selectedValue) : null;

  function handleCategoryChange(cat: string) {
    setCategory(cat);
    setSubcategory(null);
    setResult("");
  }

  function handleRoll() {
    if (!category) return;
    rollMutation.mutate(
      { category, subcategory },
      { onSuccess: (r) => setResult(r.result) }
    );
  }

  function handleCopy() {
    if (result) void navigator.clipboard.writeText(result);
  }

  if (isLoading) return <p>Loading tables...</p>;

  return (
    <div className="tools-roll-container">
      <select
        className="tools-select"
        value={category}
        onChange={(e) => handleCategoryChange(e.target.value)}
      >
        <option value="" disabled>Choose...</option>
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      {subcategories && (
        <select
          className="tools-select"
          value={subcategory ?? ""}
          onChange={(e) => setSubcategory(e.target.value || null)}
        >
          <option value="" disabled>Choose subcategory...</option>
          {subcategories.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      )}

      <div id="tools-button-container">
        <button
          className="roll button dice-button"
          type="button"
          onClick={handleRoll}
          disabled={!category || rollMutation.isPending}
          aria-label={t("Roll")}
        >
          <i className="fa-solid fa-dice dice"></i>
        </button>
        <button
          className="button dice-button"
          type="button"
          onClick={handleCopy}
          disabled={!result}
        >
          <i className="fa-solid fa-copy"></i>
        </button>
        <button
          className="button dice-button"
          type="button"
          onClick={() => setResult("")}
        >
          <i className="fa-solid fa-trash"></i>
        </button>
      </div>

      {result && (
        <div className="text-border" style={{ marginTop: "1em" }} id="tools-result-display">
          {result}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useGeneratorTables, useRollTable } from "./useGenerators.js";
import { Select, Field, Button, Card, Skeleton } from "../ui/index.js";

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

  if (isLoading)
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-2/3" />
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <Field label={t("Category")} htmlFor="gen-category">
        <Select
          id="gen-category"
          value={category}
          onChange={(e) => handleCategoryChange(e.target.value)}
        >
          <option value="" disabled>{t("Choose…")}</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
      </Field>

      {subcategories && (
        <Field label={t("Subcategory")} htmlFor="gen-subcategory">
          <Select
            id="gen-subcategory"
            value={subcategory ?? ""}
            onChange={(e) => setSubcategory(e.target.value || null)}
          >
            <option value="" disabled>{t("Choose subcategory…")}</option>
            {subcategories.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </Field>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={handleRoll}
          disabled={!category || rollMutation.isPending}
          aria-label={t("Roll")}
        >
          {t("Roll")}
        </Button>
        <Button
          variant="secondary"
          type="button"
          onClick={handleCopy}
          disabled={!result}
        >
          {t("Copy")}
        </Button>
        <Button
          variant="ghost"
          type="button"
          onClick={() => setResult("")}
          disabled={!result}
        >
          {t("Clear")}
        </Button>
      </div>

      {result && (
        <Card className="text-text" id="tools-result-display">
          {result}
        </Card>
      )}
    </div>
  );
}

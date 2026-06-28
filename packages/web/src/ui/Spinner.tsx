import { useTranslation } from "react-i18next";
import { cn } from "./cn.js";

export function Spinner({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      role="status"
      aria-label={t("Loading")}
      className={cn(
        "inline-block h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent",
        className
      )}
    />
  );
}

import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../ui/index.js";

export interface NavDrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function NavDrawer({ open, onClose, children }: NavDrawerProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <nav
        role="dialog"
        aria-modal="true"
        aria-label={t("Menu")}
        className={cn(
          "absolute right-0 top-0 flex h-full w-72 max-w-[80%] flex-col gap-4 border-l border-border bg-surface p-6 shadow-lg"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </nav>
    </div>
  );
}

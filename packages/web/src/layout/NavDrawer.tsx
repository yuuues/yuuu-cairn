import { useEffect, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../ui/index.js";

export interface NavDrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

export function NavDrawer({ open, onClose, children }: NavDrawerProps) {
  const { t } = useTranslation();
  const navRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const nav = navRef.current;
    const focusables = nav?.querySelectorAll<HTMLElement>(FOCUSABLE);
    (focusables && focusables.length ? focusables[0] : nav)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !nav) return;
      const items = nav.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0] as HTMLElement | undefined;
      const last = items[items.length - 1] as HTMLElement | undefined;
      const active = document.activeElement;
      if (e.shiftKey && first && active === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && last && active === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previousFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <nav
        ref={navRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("Menu")}
        tabIndex={-1}
        className={cn(
          "absolute right-0 top-0 flex h-full w-72 max-w-[80%] flex-col gap-4 border-l border-border bg-surface p-6 shadow-lg focus:outline-none"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </nav>
    </div>
  );
}

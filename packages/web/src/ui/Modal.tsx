import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "./cn.js";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** Etiqueta accesible cuando no hay `title` visible. */
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, ariaLabel, children, className }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  // Controla la transición de entrada (bottom-sheet en móvil / fade en desktop):
  // arranca en false y pasa a true en el siguiente frame para que el navegador
  // pueda animar desde el estado inicial.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusables = dialog?.querySelectorAll<HTMLElement>(FOCUSABLE);
    (focusables && focusables.length ? focusables[0] : dialog)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const items = dialog.querySelectorAll<HTMLElement>(FOCUSABLE);
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

  useEffect(() => {
    if (!open) {
      setMounted(false);
      return;
    }
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel}
        tabIndex={-1}
        className={cn(
          "max-h-[90vh] w-full max-w-none overflow-y-auto rounded-t-(--radius-card) rounded-b-none border border-border bg-surface p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-lg transition-[transform,opacity] duration-(--duration-base) ease-(--ease-emphasized) focus:outline-none md:max-w-lg md:translate-y-0 md:rounded-(--radius-card)",
          mounted ? "translate-y-0 opacity-100" : "translate-y-full opacity-0",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div aria-hidden="true" className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border md:hidden" />
        {title ? (
          <h2 id={titleId} className="mb-4 font-serif text-xl text-text">
            {title}
          </h2>
        ) : null}
        {children}
      </div>
    </div>
  );
}

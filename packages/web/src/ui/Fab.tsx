import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "./cn.js";

export type FabProps = ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Botón flotante circular (56px) solo visible en móvil, posicionado sobre la
 * BottomNav. El consumidor debe proporcionar `aria-label` (el contenido suele
 * ser un icono/glifo decorativo).
 */
export const Fab = forwardRef<HTMLButtonElement, FabProps>(
  ({ className, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "fixed right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-btn text-btn-fg shadow-(--shadow-fab) transition-transform duration-(--duration-fast) ease-(--ease-emphasized) active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:hidden",
        className
      )}
      {...props}
    />
  )
);
Fab.displayName = "Fab";

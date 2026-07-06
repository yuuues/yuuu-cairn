import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "./cn.js";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Activa estilos de hover/active/focus-ring para cards clicables (p. ej. envueltas en Link). */
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-(--radius-card) border border-border bg-surface p-6 shadow-(--shadow-card)",
        interactive &&
          "cursor-pointer transition-transform duration-(--duration-fast) ease-(--ease-emphasized) active:scale-[0.98] hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

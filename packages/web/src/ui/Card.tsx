import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "./cn.js";

export type CardProps = HTMLAttributes<HTMLDivElement>;

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border border-border bg-surface p-6 shadow-sm",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

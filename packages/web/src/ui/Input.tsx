import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "./cn.js";

export const inputClass =
  "w-full min-h-11 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(inputClass, className)} {...props} />
  )
);
Input.displayName = "Input";

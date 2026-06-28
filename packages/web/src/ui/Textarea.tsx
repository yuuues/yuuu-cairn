import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "./cn.js";
import { inputClass } from "./Input.js";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, rows = 4, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(inputClass, "resize-y", className)}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

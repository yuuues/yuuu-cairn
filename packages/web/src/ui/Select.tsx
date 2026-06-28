import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "./cn.js";
import { inputClass } from "./Input.js";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(inputClass, "pr-8", className)} {...props}>
      {children}
    </select>
  )
);
Select.displayName = "Select";

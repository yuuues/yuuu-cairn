import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "./cn.js";
import { inputClass } from "./Input.js";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/* appearance-none + chevron SVG propio: la flecha nativa del SO delata
   el control y no se puede teñir; así hereda el tema claro/oscuro. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <div className={cn("relative w-full", className)}>
      <select
        ref={ref}
        className={cn(inputClass, "w-full appearance-none pr-10")}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  )
);
Select.displayName = "Select";

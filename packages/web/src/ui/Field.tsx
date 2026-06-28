import { useId, type ReactNode } from "react";
import { cn } from "./cn.js";

export interface FieldProps {
  label: ReactNode;
  htmlFor?: string;
  error?: string | null;
  className?: string;
  children: ReactNode;
}

export function Field({
  label,
  htmlFor,
  error,
  className,
  children,
}: FieldProps) {
  const autoId = useId();
  const id = htmlFor ?? autoId;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

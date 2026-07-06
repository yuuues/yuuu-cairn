import { type ReactNode } from "react";
import { cn } from "./cn.js";

export interface PageHeaderProps {
  title: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <h1 className="font-serif text-2xl font-bold tracking-tight text-text sm:text-3xl">
        {title}
      </h1>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

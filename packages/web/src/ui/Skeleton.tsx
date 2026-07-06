import type { HTMLAttributes } from "react";
import { cn } from "./cn.js";

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/** Placeholder de carga. El tamaño lo define el consumidor via className (p. ej. h-4 w-32). */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-(--radius-lg) bg-border/60", className)}
      {...props}
    />
  );
}

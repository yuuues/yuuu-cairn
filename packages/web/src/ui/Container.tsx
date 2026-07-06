import { type HTMLAttributes } from "react";
import { cn } from "./cn.js";

export type ContainerProps = HTMLAttributes<HTMLDivElement>;

export function Container({ className, ...props }: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-5xl px-4 pt-8 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 md:pb-8",
        className
      )}
      {...props}
    />
  );
}

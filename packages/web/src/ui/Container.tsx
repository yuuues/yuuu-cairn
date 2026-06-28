import { type HTMLAttributes } from "react";
import { cn } from "./cn.js";

export type ContainerProps = HTMLAttributes<HTMLDivElement>;

export function Container({ className, ...props }: ContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full max-w-6xl px-4 py-8 sm:px-6", className)}
      {...props}
    />
  );
}

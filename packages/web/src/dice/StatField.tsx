import { useState } from "react";
import { cn } from "../ui/cn.js";
import { StatValueModal, type DicePreset } from "./StatValueModal.js";

/** Tiradas canónicas de Cairn (paridad con RollCharacter del core). */
export const ATTR_DICE: DicePreset = { count: 3, face: 6 };
export const HP_DICE: DicePreset = { count: 1, face: 6 };

/**
 * Tile de stat tocable: muestra etiqueta + valor y, al pulsarlo, abre un
 * modal para tirar dados o escribir el valor. Sustituye al input numérico.
 */
export function StatField({
  label,
  value,
  preset,
  onChange,
  className,
}: {
  label: string;
  value: number;
  preset: DicePreset;
  onChange: (value: number) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex flex-col items-center rounded-(--radius-card) border border-border bg-surface p-3 text-center shadow-(--shadow-card) transition-[color,border-color,transform] duration-(--duration-fast) ease-(--ease-emphasized) active:scale-[0.97] hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          className
        )}
      >
        <span className="text-xs font-medium tracking-wide text-muted uppercase">
          {label}
        </span>
        <span className="font-serif text-3xl font-bold text-text tabular-nums">
          {value}
        </span>
      </button>
      <StatValueModal
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        initialValue={value}
        preset={preset}
        onApply={onChange}
      />
    </>
  );
}

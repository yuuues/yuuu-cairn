import { useTranslation } from "react-i18next";
import { Button } from "../ui/index.js";
import { cn } from "../ui/cn.js";
import { FACES, MAX_COUNT, type Face } from "./useDiceRoll.js";

/** Botón +/- para los contadores (cantidad y modificador). */
function Stepper({
  label,
  value,
  onDec,
  onInc,
  canDec,
  canInc,
}: {
  label: string;
  value: string;
  onDec: () => void;
  onInc: () => void;
  canDec: boolean;
  canInc: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium tracking-wide text-muted uppercase">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          aria-label={`${label} −`}
          onClick={onDec}
          disabled={!canDec}
        >
          −
        </Button>
        <span className="min-w-8 text-center font-serif text-xl font-bold text-text tabular-nums">
          {value}
        </span>
        <Button
          variant="secondary"
          size="sm"
          aria-label={`${label} +`}
          onClick={onInc}
          disabled={!canInc}
        >
          +
        </Button>
      </div>
    </div>
  );
}

/** Selección de tipo de dado + cantidad + modificador (opcional). */
export function DiceControls({
  face,
  setFace,
  count,
  setCount,
  modifier,
  setModifier,
}: {
  face: Face;
  setFace: (f: Face) => void;
  count: number;
  setCount: (updater: (c: number) => number) => void;
  modifier: number;
  setModifier: (updater: (m: number) => number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {FACES.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={face === f}
            onClick={() => setFace(f)}
            className={cn(
              "min-h-11 min-w-11 flex-1 rounded-(--radius-lg) border px-2 font-serif text-sm font-bold transition-[color,border-color,background-color,transform] duration-(--duration-fast) ease-(--ease-emphasized) active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              face === f
                ? "border-accent bg-btn/10 text-accent"
                : "border-border bg-surface text-text hover:border-accent/50"
            )}
          >
            d{f}
          </button>
        ))}
      </div>

      <div className="flex items-start justify-between gap-4">
        <Stepper
          label={t("Count")}
          value={String(count)}
          onDec={() => setCount((c) => Math.max(1, c - 1))}
          onInc={() => setCount((c) => Math.min(MAX_COUNT, c + 1))}
          canDec={count > 1}
          canInc={count < MAX_COUNT}
        />
        <Stepper
          label={t("Modifier")}
          value={modifier > 0 ? `+${modifier}` : String(modifier)}
          onDec={() => setModifier((m) => m - 1)}
          onInc={() => setModifier((m) => m + 1)}
          canDec={modifier > -20}
          canInc={modifier < 20}
        />
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Button } from "../ui/index.js";
import { cn } from "../ui/cn.js";
import { BrowserDice } from "../local/adapters/BrowserDice.js";

/** Caras disponibles (paridad con el resto de la app). */
const FACES = [4, 6, 8, 10, 12, 20, 100] as const;
type Face = (typeof FACES)[number];

const MAX_COUNT = 12;

interface RollEntry {
  notation: string;
  results: number[];
  modifier: number;
  total: number;
}

function notationOf(count: number, face: number, mod: number): string {
  const m = mod > 0 ? `+${mod}` : mod < 0 ? `${mod}` : "";
  return `${count}d${face}${m}`;
}

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

export function DiceRollerModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const dice = useMemo(() => new BrowserDice(), []);
  const [face, setFace] = useState<Face>(20);
  const [count, setCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [last, setLast] = useState<RollEntry | null>(null);
  const [history, setHistory] = useState<RollEntry[]>([]);

  const notation = notationOf(count, face, modifier);

  function handleRoll() {
    const { results, total } = dice.rollMulti(face, count);
    const entry: RollEntry = {
      notation,
      results,
      modifier,
      total: total + modifier,
    };
    setLast(entry);
    setHistory((h) => [entry, ...h].slice(0, 6));
  }

  function reset() {
    setLast(null);
    setHistory([]);
  }

  return (
    <Modal open={open} onClose={onClose} title={t("Quick dice")}>
      <div className="flex flex-col gap-5">
        {/* Tipo de dado */}
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

        {/* Cantidad + modificador */}
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

        <Button className="w-full" onClick={handleRoll}>
          {t("Roll")} {notation}
        </Button>

        {/* Resultado */}
        {last && (
          <div className="rounded-(--radius-card) border border-border bg-bg p-4 text-center">
            <div className="font-serif text-5xl font-bold text-accent tabular-nums">
              {last.total}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
              {last.results.map((r, i) => (
                <span
                  key={i}
                  className="inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-border bg-surface px-1.5 text-sm font-medium text-text tabular-nums"
                >
                  {r}
                </span>
              ))}
              {last.modifier !== 0 && (
                <span className="text-sm text-muted">
                  {last.modifier > 0 ? `+${last.modifier}` : last.modifier}
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-muted">{last.notation}</div>
          </div>
        )}

        {/* Historial */}
        {history.length > 1 && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium tracking-wide text-muted uppercase">
                {t("Result")}
              </span>
              <button
                type="button"
                onClick={reset}
                className="text-xs text-accent hover:underline"
              >
                {t("Clear history")}
              </button>
            </div>
            <ul className="flex flex-col gap-1 text-sm">
              {history.slice(1).map((h, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between border-t border-border pt-1 text-muted"
                >
                  <span className="tabular-nums">{h.notation}</span>
                  <span className="font-medium text-text tabular-nums">
                    {h.total}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Button } from "../ui/index.js";
import { DiceControls } from "./DiceControls.js";
import { useDiceRoll, type RollResult } from "./useDiceRoll.js";

export function DiceRollerModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const roller = useDiceRoll();
  const [last, setLast] = useState<RollResult | null>(null);
  const [history, setHistory] = useState<RollResult[]>([]);

  // Corta la fase de rodar al cerrar el modal.
  useEffect(() => {
    if (!open) roller.stop();
  }, [open]);

  function handleRoll() {
    roller.roll((entry) => {
      setLast(entry);
      setHistory((h) => [entry, ...h].slice(0, 6));
    });
  }

  function reset() {
    setLast(null);
    setHistory([]);
  }

  return (
    <Modal open={open} onClose={onClose} title={t("Quick dice")}>
      <div className="flex flex-col gap-5">
        <DiceControls
          face={roller.face}
          setFace={roller.setFace}
          count={roller.count}
          setCount={roller.setCount}
          modifier={roller.modifier}
          setModifier={roller.setModifier}
        />

        <Button className="w-full" onClick={handleRoll} disabled={roller.rolling}>
          {t("Roll")} {roller.notation}
        </Button>

        {/* Fase de rodar: dados temblando con valores provisionales */}
        {roller.rolling && (
          <div className="rounded-(--radius-card) border border-border bg-bg p-4 text-center">
            <div className="font-serif text-5xl font-bold text-muted tabular-nums">
              …
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
              {roller.flicker.map((r, i) => (
                <span
                  key={i}
                  className="kw-dice-rolling inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-accent/40 bg-surface px-1.5 text-sm font-medium text-text tabular-nums"
                >
                  {r}
                </span>
              ))}
            </div>
            <div className="mt-1 text-xs text-muted">{roller.notation}</div>
          </div>
        )}

        {/* Resultado */}
        {last && !roller.rolling && (
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

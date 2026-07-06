import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Button } from "../ui/index.js";
import { DiceControls } from "./DiceControls.js";
import { useDiceRoll, type Face, type RollResult } from "./useDiceRoll.js";

export interface DicePreset {
  count: number;
  face: Face;
}

/**
 * Modal para fijar el valor de un stat: tira dados (ajustables, con la
 * animación de rodar si está activa) o escribe el valor a mano.
 */
export function StatValueModal({
  open,
  onClose,
  title,
  initialValue,
  preset,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  initialValue: number;
  preset: DicePreset;
  onApply: (value: number) => void;
}) {
  const { t } = useTranslation();
  const roller = useDiceRoll({ count: preset.count, face: preset.face });
  const [value, setValue] = useState(initialValue);
  const [lastRoll, setLastRoll] = useState<RollResult | null>(null);

  // Al abrir: reinicia valor y presets del dado del stat. Al cerrar: corta.
  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setLastRoll(null);
      roller.setCount(preset.count);
      roller.setFace(preset.face);
      roller.setModifier(0);
    } else {
      roller.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleRoll() {
    roller.roll((r) => {
      setValue(r.total);
      setLastRoll(r);
    });
  }

  function apply() {
    onApply(Number.isFinite(value) ? value : 0);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-5">
        {/* Valor (editable a mano) */}
        <div className="rounded-(--radius-card) border border-border bg-bg p-4 text-center">
          <label
            htmlFor="stat-value"
            className="text-xs font-medium tracking-wide text-muted uppercase"
          >
            {t("Value")}
          </label>
          {roller.rolling ? (
            <div className="font-serif text-5xl font-bold text-muted tabular-nums">
              …
            </div>
          ) : (
            <input
              id="stat-value"
              type="number"
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="w-full bg-transparent text-center font-serif text-5xl font-bold text-accent tabular-nums focus:outline-none"
            />
          )}
          {/* Desglose de la última tirada */}
          {(roller.rolling || lastRoll) && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
              {(roller.rolling ? roller.flicker : lastRoll!.results).map((r, i) => (
                <span
                  key={i}
                  className={
                    "inline-flex h-7 min-w-7 items-center justify-center rounded-md border bg-surface px-1.5 text-sm font-medium text-text tabular-nums " +
                    (roller.rolling
                      ? "kw-dice-rolling border-accent/40"
                      : "border-border")
                  }
                >
                  {r}
                </span>
              ))}
              {!roller.rolling && lastRoll && lastRoll.modifier !== 0 && (
                <span className="text-sm text-muted">
                  {lastRoll.modifier > 0
                    ? `+${lastRoll.modifier}`
                    : lastRoll.modifier}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Dados ajustables */}
        <DiceControls
          face={roller.face}
          setFace={roller.setFace}
          count={roller.count}
          setCount={roller.setCount}
          modifier={roller.modifier}
          setModifier={roller.setModifier}
        />

        <Button
          variant="secondary"
          className="w-full"
          onClick={handleRoll}
          disabled={roller.rolling}
        >
          {t("Roll")} {roller.notation}
        </Button>

        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose} disabled={roller.rolling}>
            {t("Cancel")}
          </Button>
          <Button className="flex-1" onClick={apply} disabled={roller.rolling}>
            {t("Apply")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

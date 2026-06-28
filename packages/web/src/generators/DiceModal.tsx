import { useState } from "react";
import { useTranslation } from "react-i18next";

/** Tipos de dado disponibles (paridad con el JS del cliente de origen). */
const DICE_TYPES = [4, 6, 8, 10, 12, 20, 100] as const;
type DiceFace = (typeof DICE_TYPES)[number];

export interface DiceModalProps {
  /** Id del personaje que tira (para el evento Socket.IO). */
  characterId: number;
  /** Id de la partida donde publicar la tirada. */
  partyId: number;
  /** Callback para roll via socket (paridad: useDiceRoller.roll). */
  onRoll: (roll: string) => void;
  /** Resultado emitido por el servidor (dice_rolled). */
  lastResult: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DiceModal({
  onRoll,
  lastResult,
  isOpen,
  onClose,
}: DiceModalProps) {
  const { t } = useTranslation();
  const [face, setFace] = useState<DiceFace>(6);
  const [count, setCount] = useState<number>(1);

  if (!isOpen) return null;

  function handleRoll() {
    // Formato paridad: "2d6", "1d20"
    const rollStr = `${count}d${face}`;
    onRoll(rollStr);
  }

  return (
    <div
      className="modal is-active"
      role="dialog"
      aria-modal="true"
      aria-label={t("Dice")}
    >
      <div className="modal-background" onClick={onClose} />
      <div className="modal-card">
        <header className="modal-card-head">
          <p className="modal-card-title">{t("Dice")}</p>
          <button className="delete" aria-label="close" onClick={onClose} />
        </header>
        <section className="modal-card-body">
          <div style={{ display: "flex", gap: "1em", alignItems: "center", flexWrap: "wrap" }}>
            <label>
              Count:
              <input
                type="number"
                min={1}
                max={10}
                value={count}
                onChange={(e) => setCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                style={{ width: "4em", marginLeft: "0.5em" }}
              />
            </label>
            <label>
              Die:
              <select
                value={face}
                onChange={(e) => setFace(Number(e.target.value) as DiceFace)}
                style={{ marginLeft: "0.5em" }}
              >
                {DICE_TYPES.map((d) => (
                  <option key={d} value={d}>d{d}</option>
                ))}
              </select>
            </label>
          </div>
          {lastResult && (
            <div className="text-border" style={{ marginTop: "1em" }}>
              {lastResult}
            </div>
          )}
        </section>
        <footer className="modal-card-foot">
          <button className="button is-primary" onClick={handleRoll}>
            <i className="fa-solid fa-dice" /> {t("Roll")} {count}d{face}
          </button>
          <button className="button" onClick={onClose}>Close</button>
        </footer>
      </div>
    </div>
  );
}

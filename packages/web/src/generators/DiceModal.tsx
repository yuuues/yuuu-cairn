import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Select, Input, Field, Button } from "../ui/index.js";

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

  function handleRoll() {
    // Formato paridad: "2d6", "1d20"
    const rollStr = `${count}d${face}`;
    onRoll(rollStr);
  }

  return (
    <Modal open={isOpen} onClose={onClose} title={t("Roll Dice")}>
      <div className="flex flex-col gap-4">
        <Field label="Count" htmlFor="dice-count">
          <Input
            id="dice-count"
            type="number"
            min={1}
            max={10}
            value={count}
            onChange={(e) => setCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
          />
        </Field>
        <Field label="Die" htmlFor="dice-face">
          <Select
            id="dice-face"
            value={face}
            onChange={(e) => setFace(Number(e.target.value) as DiceFace)}
          >
            {DICE_TYPES.map((d) => (
              <option key={d} value={d}>d{d}</option>
            ))}
          </Select>
        </Field>
        {lastResult && (
          <div className="rounded-lg border border-border p-4 text-text">
            {lastResult}
          </div>
        )}
        <div className="flex gap-2">
          <Button onClick={handleRoll}>
            {t("Roll")} {count}d{face}
          </Button>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

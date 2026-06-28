import { useState } from "react";
import { useTranslation } from "react-i18next";
import { rollSingle, rollDouble, formatSingle, formatDouble } from "./diceRoll.js";
import { Modal, Button } from "../ui/index.js";

const SINGLE_DICE = [4, 6, 8, 10, 12, 20, 100];
const DOUBLE_DICE = [4, 6, 8, 10, 12];

export interface DiceModalProps {
  /** "party" muestra el d100; "character" lo oculta (paridad dice_modal.js). */
  mode: "party" | "character";
  /** Callback con el texto formateado de la tirada (se envía por WS). */
  onRoll: (rollText: string) => void;
  onClose: () => void;
}

export function DiceModal({ mode, onRoll, onClose }: DiceModalProps) {
  const { t } = useTranslation();
  const [result, setResult] = useState<string>("0");

  const singleDice = SINGLE_DICE.filter((s) => s !== 100 || mode === "party");

  function handleSingle(sides: number) {
    const r = rollSingle(sides);
    setResult(String(r));
    onRoll(formatSingle(r, sides));
  }

  function handleDouble(sides: number) {
    const [a, b] = rollDouble(sides);
    setResult(`${a}, ${b}`);
    onRoll(formatDouble(a, b, sides));
  }

  return (
    <Modal open onClose={onClose} title={t("Dice roller")}>
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-border p-4 text-center text-2xl font-bold text-text">
          {result}
        </div>
        <div className="flex flex-wrap gap-2">
          {singleDice.map((sides) => (
            <Button
              key={`d${sides}`}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleSingle(sides)}
            >
              d{sides}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {DOUBLE_DICE.map((sides) => (
            <Button
              key={`dd${sides}`}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleDouble(sides)}
            >
              d{sides}+d{sides}
            </Button>
          ))}
        </div>
        <Button variant="secondary" type="button" onClick={onClose}>
          {t("Close")}
        </Button>
      </div>
    </Modal>
  );
}

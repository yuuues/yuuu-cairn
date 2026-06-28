import { useState } from "react";
import { rollSingle, rollDouble, formatSingle, formatDouble } from "./diceRoll.js";

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
    <div className="dice-modal" role="dialog" aria-label="Dice roller">
      <div className="dice-modal-background" onClick={onClose} />
      <div className="dice-modal-content">
        <p className="dice-modal-result">{result}</p>
        <div className="dice-modal-single">
          {singleDice.map((sides) => (
            <button key={`d${sides}`} type="button" onClick={() => handleSingle(sides)}>
              d{sides}
            </button>
          ))}
        </div>
        <div className="dice-modal-double">
          {DOUBLE_DICE.map((sides) => (
            <button key={`dd${sides}`} type="button" onClick={() => handleDouble(sides)}>
              d{sides}+d{sides}
            </button>
          ))}
        </div>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

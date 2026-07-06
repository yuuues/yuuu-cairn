import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserDice } from "../local/adapters/BrowserDice.js";
import { getAnimationsEnabled } from "../layout/animations.js";

/** Caras disponibles. */
export const FACES = [4, 6, 8, 10, 12, 20, 100] as const;
export type Face = (typeof FACES)[number];

export const MAX_COUNT = 12;
const ROLL_MS = 600;
const TICK_MS = 70;

export interface RollResult {
  notation: string;
  results: number[];
  modifier: number;
  total: number;
}

export function notationOf(count: number, face: number, mod: number): string {
  const m = mod > 0 ? `+${mod}` : mod < 0 ? `${mod}` : "";
  return `${count}d${face}${m}`;
}

/**
 * Estado y lógica de una tirada de dados con fase de "rodar" opcional
 * (números parpadeando + temblor) que respeta el ajuste de Animaciones.
 * Compartido por el lanzador rápido y el modal de stats.
 */
export function useDiceRoll(initial?: {
  face?: Face;
  count?: number;
  modifier?: number;
}) {
  const dice = useMemo(() => new BrowserDice(), []);
  const [face, setFace] = useState<Face>(initial?.face ?? 20);
  const [count, setCount] = useState(initial?.count ?? 1);
  const [modifier, setModifier] = useState(initial?.modifier ?? 0);
  const [rolling, setRolling] = useState(false);
  const [flicker, setFlicker] = useState<number[]>([]);
  const timers = useRef<{ tick?: number; end?: number }>({});

  const notation = notationOf(count, face, modifier);

  function clearTimers() {
    if (timers.current.tick) window.clearInterval(timers.current.tick);
    if (timers.current.end) window.clearTimeout(timers.current.end);
    timers.current = {};
  }

  // Corta la fase de rodar (cierre del modal) y limpia al desmontar.
  function stop() {
    clearTimers();
    setRolling(false);
  }
  useEffect(() => clearTimers, []);

  function randomFaces(): number[] {
    return Array.from(
      { length: count },
      () => 1 + Math.floor(Math.random() * face)
    );
  }

  /** Tira; si hay animación, rueda ~600ms y luego llama a onComplete. */
  function roll(onComplete: (r: RollResult) => void) {
    const { results, total } = dice.rollMulti(face, count);
    const result: RollResult = {
      notation,
      results,
      modifier,
      total: total + modifier,
    };

    if (!getAnimationsEnabled()) {
      onComplete(result);
      return;
    }

    clearTimers();
    setRolling(true);
    setFlicker(randomFaces());
    timers.current.tick = window.setInterval(
      () => setFlicker(randomFaces()),
      TICK_MS
    );
    timers.current.end = window.setTimeout(() => {
      clearTimers();
      setRolling(false);
      onComplete(result);
    }, ROLL_MS);
  }

  return {
    face,
    setFace,
    count,
    setCount,
    modifier,
    setModifier,
    rolling,
    flicker,
    notation,
    roll,
    stop,
  };
}

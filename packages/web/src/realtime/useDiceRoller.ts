import { useEffect, useRef, useState } from "react";
import type { RollDiceInput } from "@kw/shared";
import { createRealtimeClient, type RealtimeClient } from "./socketClient.js";

export interface UseDiceRoller {
  notifications: string[];
  roll: (input: RollDiceInput) => void;
}

/**
 * Conecta el cliente de tiempo real al montar, acumula las notificaciones
 * `dice_rolled` recibidas y expone `roll` para emitir una tirada.
 */
export function useDiceRoller(): UseDiceRoller {
  const clientRef = useRef<RealtimeClient | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);

  useEffect(() => {
    const client = createRealtimeClient();
    clientRef.current = client;
    client.onDiceRolled((message) => {
      setNotifications((prev) => [...prev, message]);
    });
    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, []);

  return {
    notifications,
    roll: (input: RollDiceInput) => clientRef.current?.rollDice(input),
  };
}

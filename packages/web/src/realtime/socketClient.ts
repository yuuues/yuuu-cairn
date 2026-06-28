import { io } from "socket.io-client";
import type { RollDiceInput, DiceRolledMessage } from "@kw/shared";

/** Subconjunto de Socket que usamos (testeable sin servidor real). */
export interface MinimalSocket {
  on(event: string, cb: (...args: unknown[]) => void): void;
  emit(event: string, ...args: unknown[]): void;
  disconnect(): void;
}

export interface RealtimeClient {
  rollDice(input: RollDiceInput): void;
  onDiceRolled(cb: (message: DiceRolledMessage) => void): void;
  disconnect(): void;
}

/** Factoría por defecto: socket.io-client con el mismo protocolo del origen. */
function defaultFactory(): MinimalSocket {
  return io({
    transports: ["websocket"],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 3,
    timeout: 10000,
  }) as unknown as MinimalSocket;
}

/**
 * Crea el cliente de tiempo real. Al conectar emite `register` (paridad
 * socket_notifications.js). `factory` permite inyectar un socket falso en tests.
 */
export function createRealtimeClient(
  factory: () => MinimalSocket = defaultFactory
): RealtimeClient {
  const socket = factory();

  socket.on("connect", () => {
    socket.emit("register");
  });

  return {
    rollDice(input: RollDiceInput) {
      socket.emit("roll_dice", input);
    },
    onDiceRolled(cb: (message: DiceRolledMessage) => void) {
      socket.on("dice_rolled", (msg) => cb(msg as DiceRolledMessage));
    },
    disconnect() {
      socket.disconnect();
    },
  };
}

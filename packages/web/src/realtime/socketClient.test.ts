import { describe, it, expect, vi } from "vitest";
import { createRealtimeClient, type MinimalSocket } from "./socketClient.js";

function fakeSocket() {
  const handlers = new Map<string, (...a: unknown[]) => void>();
  const emitted: Array<{ event: string; args: unknown[] }> = [];
  const socket: MinimalSocket = {
    on(event, cb) { handlers.set(event, cb as (...a: unknown[]) => void); },
    emit(event, ...args) { emitted.push({ event, args }); },
    disconnect() { emitted.push({ event: "__disconnect", args: [] }); },
  };
  return { socket, handlers, emitted };
}

describe("createRealtimeClient", () => {
  it("emite 'register' cuando el socket conecta", () => {
    const { socket, handlers, emitted } = fakeSocket();
    createRealtimeClient(() => socket);
    handlers.get("connect")?.();
    expect(emitted).toContainEqual({ event: "register", args: [] });
  });

  it("rollDice emite 'roll_dice' con el payload del protocolo", () => {
    const { socket, emitted } = fakeSocket();
    const client = createRealtimeClient(() => socket);
    client.rollDice({ characterId: 3, partyId: 7, roll: "7 (d8)" });
    expect(emitted).toContainEqual({
      event: "roll_dice",
      args: [{ characterId: 3, partyId: 7, roll: "7 (d8)" }],
    });
  });

  it("onDiceRolled registra un callback que recibe el string", () => {
    const { socket, handlers } = fakeSocket();
    const client = createRealtimeClient(() => socket);
    const received: string[] = [];
    client.onDiceRolled((msg) => received.push(msg));
    handlers.get("dice_rolled")?.("Aldric rolled a 7 (d8)");
    expect(received).toEqual(["Aldric rolled a 7 (d8)"]);
  });
});

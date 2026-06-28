import { describe, it, expect } from "vitest";
import type { EventPublisher } from "@kw/core";
import { SocketEventPublisher } from "./SocketEventPublisher.js";

function fakeIo() {
  const emitted: Array<{ room: string; event: string; payload: unknown }> = [];
  const io = {
    to(room: string) {
      return {
        emit(event: string, payload: unknown) {
          emitted.push({ room, event, payload });
        },
      };
    },
  };
  return { io, emitted };
}

describe("SocketEventPublisher", () => {
  it("emite el evento a la sala party_{id}", async () => {
    const { io, emitted } = fakeIo();
    const publisher: EventPublisher = new SocketEventPublisher(io as never);

    await publisher.publishToParty(42, { type: "dice_rolled", payload: "Aldric rolled a 7" });

    expect(emitted).toEqual([
      { room: "party_42", event: "dice_rolled", payload: "Aldric rolled a 7" },
    ]);
  });

  it("usa el type del evento como nombre del evento WS", async () => {
    const { io, emitted } = fakeIo();
    const publisher = new SocketEventPublisher(io as never);

    await publisher.publishToParty(1, { type: "party_updated", payload: { id: 1 } });

    expect(emitted[0]!.event).toBe("party_updated");
    expect(emitted[0]!.room).toBe("party_1");
  });
});

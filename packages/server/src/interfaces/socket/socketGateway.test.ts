import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Party, SessionUser } from "@kw/shared";
import { InMemoryCharacterRepository } from "@kw/core/testing/InMemoryCharacterRepository.js";
import { InMemoryPartyRepository } from "@kw/core/testing/InMemoryPartyRepository.js";
import { RollDice } from "@kw/core";
import type { EventPublisher } from "@kw/core";
import { registerSocketHandlers, type SocketGatewayDeps } from "./socketGateway.js";

// ---- dobles mínimos de Socket.IO ----
type Handler = (...args: unknown[]) => unknown;

class FakeSocket {
  public data: { user?: SessionUser } = {};
  public handshake = { headers: { cookie: "" } };
  public rooms = new Set<string>();
  private handlers = new Map<string, Handler>();
  on(event: string, h: Handler) { this.handlers.set(event, h); }
  join(room: string) { this.rooms.add(room); }
  async emit(event: string, ...args: unknown[]) {
    const h = this.handlers.get(event);
    if (h) await h(...args);
  }
}

class FakeIo {
  public connectionHandler?: (s: FakeSocket) => void;
  private mw?: (s: FakeSocket, next: (err?: Error) => void) => void;
  use(fn: (s: FakeSocket, next: (err?: Error) => void) => void) { this.mw = fn; }
  on(event: string, h: (s: FakeSocket) => void) {
    if (event === "connection") this.connectionHandler = h;
  }
  /** Simula una conexión: corre middleware y luego el handler de connection. */
  async connect(socket: FakeSocket): Promise<Error | undefined> {
    return new Promise((resolve) => {
      const proceed = (err?: Error) => {
        if (err) return resolve(err);
        this.connectionHandler?.(socket);
        resolve(undefined);
      };
      if (this.mw) this.mw(socket, proceed);
      else proceed();
    });
  }
}

const party = (over: Partial<Party>): Party => ({
  id: 1, ownerId: 1, name: "P", description: null, notes: null,
  members: [], subowners: [], joinCode: "C", items: [], containers: [], events: [], version: 0,
  ...over,
});

const user: SessionUser = { id: 1, username: "u", email: "u@e.com" };

describe("socketGateway", () => {
  let characters: InMemoryCharacterRepository;
  let parties: InMemoryPartyRepository;
  let publisher: { calls: unknown[] } & EventPublisher;
  let deps: SocketGatewayDeps;
  let io: FakeIo;

  beforeEach(() => {
    characters = new InMemoryCharacterRepository();
    parties = new InMemoryPartyRepository();
    const calls: unknown[] = [];
    publisher = {
      calls,
      async publishToParty(partyId, event) { calls.push({ partyId, event }); },
    };
    deps = {
      rollDice: new RollDice(characters, parties, publisher),
      parties,
      resolveUser: async () => user,
    };
    io = new FakeIo();
    registerSocketHandlers(io as never, deps);
  });

  it("rechaza la conexión si no hay usuario en sesión", async () => {
    deps.resolveUser = async () => null;
    io = new FakeIo();
    registerSocketHandlers(io as never, deps);
    const socket = new FakeSocket();
    const err = await io.connect(socket);
    expect(err).toBeInstanceOf(Error);
  });

  it("al conectar une al socket a las salas de sus partidas (owner/subowner)", async () => {
    await parties.save(party({ id: 0, ownerId: 1 }));
    await parties.save(party({ id: 0, ownerId: 9, subowners: [1] }));
    await parties.save(party({ id: 0, ownerId: 9, subowners: [] })); // ajena

    const socket = new FakeSocket();
    await io.connect(socket);

    expect(socket.rooms.has("party_1")).toBe(true);
    expect(socket.rooms.has("party_2")).toBe(true);
    expect(socket.rooms.has("party_3")).toBe(false);
  });

  it("'register' vuelve a unir a las salas de las partidas", async () => {
    const socket = new FakeSocket();
    await io.connect(socket);
    await parties.save(party({ id: 0, ownerId: 1 })); // creada tras conectar
    await socket.emit("register");
    expect(socket.rooms.has("party_1")).toBe(true);
  });

  it("'roll_dice' válido publica dice_rolled vía RollDice", async () => {
    const char = await characters.save({
      id: 0, ownerId: 1, name: "Aldric", background: "A",
      strength: 10, strengthMax: 10, dexterity: 10, dexterityMax: 10, willpower: 10, willpowerMax: 10,
      hp: 5, hpMax: 5, deprived: false, panicked: false, gold: 0, items: [], containers: [],
      description: null, traits: null, notes: null, bonds: null, scars: null, omens: null, armor: null,
      imageUrl: null, partyId: null,
    });
    const p = await parties.save(party({ id: 0, ownerId: 1, members: [char.id] }));
    const socket = new FakeSocket();
    await io.connect(socket);

    await socket.emit("roll_dice", { characterId: char.id, partyId: p.id, roll: "7 (d8)" });

    expect(publisher.calls).toEqual([
      { partyId: p.id, event: { type: "dice_rolled", payload: "Aldric rolled a 7 (d8)" } },
    ]);
  });

  it("'roll_dice' inválido (payload mal formado) no lanza ni publica", async () => {
    const socket = new FakeSocket();
    await io.connect(socket);
    await socket.emit("roll_dice", { characterId: 1 }); // falta partyId/roll
    expect(publisher.calls).toHaveLength(0);
  });

  it("'roll_dice' de personaje ajeno no publica (error tragado)", async () => {
    const char = await characters.save({
      id: 0, ownerId: 2, name: "X", background: "A",
      strength: 10, strengthMax: 10, dexterity: 10, dexterityMax: 10, willpower: 10, willpowerMax: 10,
      hp: 5, hpMax: 5, deprived: false, panicked: false, gold: 0, items: [], containers: [],
      description: null, traits: null, notes: null, bonds: null, scars: null, omens: null, armor: null,
      imageUrl: null, partyId: null,
    });
    const p = await parties.save(party({ id: 0, ownerId: 1, members: [char.id] }));
    const socket = new FakeSocket();
    await io.connect(socket);
    await socket.emit("roll_dice", { characterId: char.id, partyId: p.id, roll: "3" });
    expect(publisher.calls).toHaveLength(0);
  });
});

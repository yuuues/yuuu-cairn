import type { Server, Socket } from "socket.io";
import type { SessionUser } from "@kw/shared";
import { RollDiceInputSchema } from "@kw/shared";
import type { PartyRepository, RollDice } from "@kw/core";
import { partyRoom } from "../../infrastructure/realtime/socketio/SocketEventPublisher.js";

export interface SocketGatewayDeps {
  rollDice: RollDice;
  parties: PartyRepository;
  /** Resuelve el SessionUser a partir del handshake del socket (cookie de sesión). */
  resolveUser: (socket: Socket) => Promise<SessionUser | null>;
}

/** Une el socket a las salas party_{id} de las partidas del usuario (paridad join_user_parties). */
async function joinUserParties(
  socket: Socket,
  parties: PartyRepository,
  userId: number
): Promise<void> {
  const userParties = await parties.findByMember(userId);
  for (const party of userParties) {
    socket.join(partyRoom(party.id));
  }
}

/** Registra el middleware de auth y los handlers de conexión en el servidor Socket.IO. */
export function registerSocketHandlers(io: Server, deps: SocketGatewayDeps): void {
  // ---- middleware de autenticación por cookie de sesión ----
  io.use((socket, next) => {
    deps
      .resolveUser(socket)
      .then((user) => {
        if (!user) {
          next(new Error("unauthenticated"));
          return;
        }
        (socket.data as { user?: SessionUser }).user = user;
        next();
      })
      .catch(() => next(new Error("unauthenticated")));
  });

  io.on("connection", (socket) => {
    const user = (socket.data as { user?: SessionUser }).user;
    if (!user) {
      socket.disconnect(true);
      return;
    }

    // connect → unir a las salas de sus partidas
    void joinUserParties(socket, deps.parties, user.id);

    // register → re-unir (paridad con el cliente que emite 'register' al conectar)
    socket.on("register", () => {
      void joinUserParties(socket, deps.parties, user.id);
    });

    // roll_dice → caso de uso RollDice; errores tragados (paridad: emisión silenciosa)
    socket.on("roll_dice", (raw: unknown) => {
      const parsed = RollDiceInputSchema.safeParse(raw);
      if (!parsed.success) return;
      void deps.rollDice
        .execute({
          userId: user.id,
          characterId: parsed.data.characterId,
          partyId: parsed.data.partyId,
          roll: parsed.data.roll,
        })
        .catch(() => {
          /* paridad: cualquier fallo de validación de pertenencia no emite nada */
        });
    });
  });
}

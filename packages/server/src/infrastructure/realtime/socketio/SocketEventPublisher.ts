import type { Server } from "socket.io";
import type { DomainEvent, EventPublisher } from "@kw/core";

/** Nombre de la sala de una partida (paridad: f"party_{id}"). */
export function partyRoom(partyId: number): string {
  return `party_${partyId}`;
}

/**
 * Adaptador driven del puerto EventPublisher: traduce eventos de dominio a
 * emisiones Socket.IO a la sala de la partida.
 */
export class SocketEventPublisher implements EventPublisher {
  constructor(private readonly io: Server) {}

  async publishToParty(partyId: number, event: DomainEvent): Promise<void> {
    this.io.to(partyRoom(partyId)).emit(event.type, event.payload);
  }
}

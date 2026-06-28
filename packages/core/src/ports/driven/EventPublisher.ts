export interface DomainEvent {
  type: string;
  payload: unknown;
}

export interface EventPublisher {
  /** Publica un evento a la sala de una partida (p.ej. tirada de dados). */
  publishToParty(partyId: number, event: DomainEvent): Promise<void>;
}

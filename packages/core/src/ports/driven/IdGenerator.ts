export interface IdGenerator {
  /** Código de unión a partida, legible y único. */
  joinCode(): string;
}

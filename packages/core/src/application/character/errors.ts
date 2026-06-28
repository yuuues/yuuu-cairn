export type CharacterErrorCode = "not_found" | "forbidden" | "invalid_input";

export class CharacterError extends Error {
  constructor(
    public readonly code: CharacterErrorCode,
    message: string
  ) {
    super(message);
    this.name = "CharacterError";
  }
}

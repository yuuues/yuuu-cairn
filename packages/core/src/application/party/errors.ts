export type PartyErrorCode =
  | "not_found"
  | "forbidden"
  | "invalid_code"
  | "already_member"
  | "invalid_input";

export class PartyError extends Error {
  constructor(
    public readonly code: PartyErrorCode,
    message: string
  ) {
    super(message);
    this.name = "PartyError";
  }
}

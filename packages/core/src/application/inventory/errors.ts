export type InventoryErrorCode = "not_found" | "forbidden" | "invalid_input";

export class InventoryError extends Error {
  constructor(
    public readonly code: InventoryErrorCode,
    message: string
  ) {
    super(message);
    this.name = "InventoryError";
  }
}

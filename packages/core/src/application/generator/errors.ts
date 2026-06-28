export type GeneratorErrorCode = "table_not_found" | "subcategory_not_found" | "empty_table";

export class GeneratorError extends Error {
  constructor(
    public readonly code: GeneratorErrorCode,
    message: string
  ) {
    super(message);
    this.name = "GeneratorError";
  }
}

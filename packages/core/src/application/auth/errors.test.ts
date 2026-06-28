import { describe, it, expect } from "vitest";
import { AuthError } from "./errors.js";

describe("AuthError", () => {
  it("lleva un código y un mensaje", () => {
    const err = new AuthError("email_exists", "Email address already exists");
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("email_exists");
    expect(err.message).toBe("Email address already exists");
  });
  it("es identificable con instanceof", () => {
    const err = new AuthError("invalid_credentials", "Invalid email or password.");
    expect(err instanceof AuthError).toBe(true);
  });
});

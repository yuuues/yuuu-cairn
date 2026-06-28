export type AuthErrorCode =
  | "username_restricted"
  | "email_exists"
  | "username_exists"
  | "invalid_signup_code"
  | "captcha_failed"
  | "not_confirmed"
  | "invalid_credentials"
  | "invalid_token"
  | "email_not_found"
  | "invalid_password";

/** Error de negocio de autenticación con un código estable para el borde HTTP. */
export class AuthError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message: string
  ) {
    super(message);
    this.name = "AuthError";
  }
}

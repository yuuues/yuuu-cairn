export * from "./domain/character/inventory.js";
export * from "./domain/character/armor.js";
export * from "./domain/character/hp.js";

export type { CharacterRepository } from "./ports/driven/CharacterRepository.js";
export type { PartyRepository } from "./ports/driven/PartyRepository.js";
export type { UserRepository, UserRecord } from "./ports/driven/UserRepository.js";
export type { PasswordHasher } from "./ports/driven/PasswordHasher.js";
export type { Mailer, EmailMessage } from "./ports/driven/Mailer.js";
export type { EventPublisher, DomainEvent } from "./ports/driven/EventPublisher.js";
export type { Clock } from "./ports/driven/Clock.js";
export type { IdGenerator } from "./ports/driven/IdGenerator.js";

// Auth — puertos nuevos
export type { TokenService, TokenPurpose } from "./ports/driven/TokenService.js";
export type { Captcha } from "./ports/driven/Captcha.js";

export type { Dice } from "./ports/driven/Dice.js";
export type { GameDataRepository } from "./ports/driven/GameDataRepository.js";

// Auth — errores y casos de uso
export { AuthError } from "./application/auth/errors.js";
export type { AuthErrorCode } from "./application/auth/errors.js";
export { Register } from "./application/auth/Register.js";
export type { RegisterConfig, RegisterCommand } from "./application/auth/Register.js";
export { Login } from "./application/auth/Login.js";
export type { LoginCommand } from "./application/auth/Login.js";
export { ConfirmEmail } from "./application/auth/ConfirmEmail.js";
export type { ConfirmEmailCommand } from "./application/auth/ConfirmEmail.js";
export { ResendConfirmation } from "./application/auth/ResendConfirmation.js";
export type { ResendConfirmationCommand } from "./application/auth/ResendConfirmation.js";
export { RequestPasswordReset } from "./application/auth/RequestPasswordReset.js";
export type { RequestPasswordResetCommand } from "./application/auth/RequestPasswordReset.js";
export { ResetPassword } from "./application/auth/ResetPassword.js";
export type { ResetPasswordCommand } from "./application/auth/ResetPassword.js";
export { ChangePassword } from "./application/auth/ChangePassword.js";
export type { ChangePasswordCommand } from "./application/auth/ChangePassword.js";
export { ChangeEmail } from "./application/auth/ChangeEmail.js";
export type { ChangeEmailCommand } from "./application/auth/ChangeEmail.js";
export { DeleteAccount } from "./application/auth/DeleteAccount.js";
export type { DeleteAccountCommand } from "./application/auth/DeleteAccount.js";

// Character — dominio puro
export * from "./domain/character/traits.js";
export * from "./domain/character/creation.js";

// Character — casos de uso
export * from "./application/character/index.js";

// Inventory/Marketplace — dominio puro
export * from "./domain/character/market.js";

// Inventory/Marketplace — puerto
export type { MarketRepository } from "./ports/driven/MarketRepository.js";

// Inventory/Marketplace — casos de uso
export * from "./application/inventory/index.js";

// Party — casos de uso
export * from "./application/party/index.js";

// Generator — puerto
export type { GeneratorRepository } from "./ports/driven/GeneratorRepository.js";

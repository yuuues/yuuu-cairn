import { z } from "zod";

export const usernameSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(
    /^[A-Za-z][A-Za-z0-9_.]*$/,
    "Usernames must have only letters, numbers, dots or underscores"
  );

export const emailSchema = z.string().min(1).max(64).email();

export const RegisterInputSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: z
    .string()
    .min(8, "Password must be between 8 and 64 characters")
    .max(64, "Password must be between 8 and 64 characters"),
  signupCode: z.string().optional(),
  captchaToken: z.string().optional(),
});
export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const LoginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const ResendConfirmationInputSchema = z.object({
  email: emailSchema,
});
export type ResendConfirmationInput = z.infer<
  typeof ResendConfirmationInputSchema
>;

export const RequestPasswordResetInputSchema = z.object({
  email: emailSchema,
});
export type RequestPasswordResetInput = z.infer<
  typeof RequestPasswordResetInputSchema
>;

export const ResetPasswordInputSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(1),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordInputSchema>;

export const ChangePasswordInputSchema = z.object({
  oldPassword: z.string().min(1),
  password: z.string().min(1),
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordInputSchema>;

export const ChangeEmailInputSchema = z.object({
  password: z.string().min(1),
  email: emailSchema,
});
export type ChangeEmailInput = z.infer<typeof ChangeEmailInputSchema>;

export const DeleteAccountInputSchema = z.object({
  password: z.string().min(1),
});
export type DeleteAccountInput = z.infer<typeof DeleteAccountInputSchema>;

export interface SessionUser {
  id: number;
  username: string;
  email: string;
}

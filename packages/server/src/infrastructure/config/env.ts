import { z } from "zod";

const boolFromString = z
  .string()
  .optional()
  .transform((v) => v?.toLowerCase() === "true");

const EnvSchema = z.object({
  DATABASE_URL: z.string(),
  DATA_DIR: z.string().default("../../data"),
  BASE_URL: z.string().default("http://127.0.0.1:8000"),
  SECRET_KEY: z.string().min(1),
  PORT: z.coerce.number().int().default(8000),

  // Signup code (paridad: REQUIRE_SIGNUP_CODE / SIGNUP_CODE)
  REQUIRE_SIGNUP_CODE: boolFromString,
  SIGNUP_CODE: z.string().default("default"),

  // Mail (paridad: MAIL_*)
  MAIL_SERVER: z.string().optional(),
  MAIL_PORT: z.coerce.number().int().optional(),
  MAIL_USE_TLS: boolFromString,
  MAIL_USERNAME: z.string().optional(),
  MAIL_PASSWORD: z.string().optional(),

  // Captcha reCAPTCHA Enterprise (paridad: USE_CAPTCHA / CAPTCHA_*)
  USE_CAPTCHA: boolFromString,
  CAPTCHA_BLOCK: boolFromString,
  CAPTCHA_KEY: z.string().optional(),
  CAPTCHA_PROJECT_ID: z.string().optional(),
  CAPTCHA_API_KEY: z.string().optional(),

  // Cookie de sesión
  COOKIE_SECURE: boolFromString,
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return EnvSchema.parse(source);
}

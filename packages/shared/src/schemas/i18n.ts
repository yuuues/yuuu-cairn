import { z } from "zod";

export const SUPPORTED_LOCALES = ["en", "de", "es", "pl", "pt_BR"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Valida un valor de cookie/query-param y devuelve un Locale válido o 'en'. */
export const LocaleSchema = z.enum(SUPPORTED_LOCALES);

export function parseLocale(raw: string | undefined | null): Locale {
  const result = LocaleSchema.safeParse(raw);
  return result.success ? result.data : "en";
}

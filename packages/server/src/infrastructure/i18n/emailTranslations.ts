import type { EmailMessage } from "@kw/core";
import type { Locale } from "@kw/shared";
import { parseLocale } from "@kw/shared";

import en from "./locales/en.json" assert { type: "json" };
import de from "./locales/de.json" assert { type: "json" };
import es from "./locales/es.json" assert { type: "json" };
import pl from "./locales/pl.json" assert { type: "json" };
import ptBR from "./locales/pt_BR.json" assert { type: "json" };

type EmailCatalog = typeof en;

const catalogs: Record<Locale, EmailCatalog> = { en, de, es, pl, pt_BR: ptBR };

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

function catalog(locale: string): EmailCatalog {
  return catalogs[parseLocale(locale)] ?? catalogs["en"];
}

export function buildConfirmEmail(
  locale: string,
  username: string,
  token: string
): EmailMessage {
  const c = catalog(locale);
  const vars = { username, token };
  return {
    to: "",
    subject: interpolate(c["email.confirm.subject"], vars),
    text: interpolate(c["email.confirm.text"], vars),
    html: interpolate(c["email.confirm.html"], vars),
  };
}

export function buildResetEmail(
  locale: string,
  username: string,
  token: string
): EmailMessage {
  const c = catalog(locale);
  const vars = { username, token };
  return {
    to: "",
    subject: interpolate(c["email.reset.subject"], vars),
    text: interpolate(c["email.reset.text"], vars),
    html: interpolate(c["email.reset.html"], vars),
  };
}

export function buildChangeEmailEmail(
  locale: string,
  username: string,
  token: string
): EmailMessage {
  const c = catalog(locale);
  const vars = { username, token };
  return {
    to: "",
    subject: interpolate(c["email.changeEmail.subject"], vars),
    text: interpolate(c["email.changeEmail.text"], vars),
    html: interpolate(c["email.changeEmail.html"], vars),
  };
}

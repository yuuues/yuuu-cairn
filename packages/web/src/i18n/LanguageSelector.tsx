import { useTranslation } from "react-i18next";
import type { Locale } from "@kw/shared";
import { Select } from "../ui/index.js";

const LOCALE_LABELS: Record<Locale, string> = {
  pt_BR: "Brasilian Português",
  de: "Deutsch",
  en: "English",
  es: "Español",
  pl: "polski",
};

/** Paridad con app/templates/lang.html del origen. */
export function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const current = i18n.language as Locale;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const locale = e.target.value as Locale;
    i18n.changeLanguage(locale);
    // Escribe la cookie kw_lang (paridad: el origen la lee con request.cookies.get('kw_lang'))
    document.cookie = `kw_lang=${locale};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
  }

  return (
    <Select
      id="lang-selector"
      value={current}
      onChange={handleChange}
      aria-label={t("Select language")}
    >
      {(["pt_BR", "de", "en", "es", "pl"] as const).map((loc) => (
        <option key={loc} value={loc}>
          {LOCALE_LABELS[loc]}
        </option>
      ))}
    </Select>
  );
}

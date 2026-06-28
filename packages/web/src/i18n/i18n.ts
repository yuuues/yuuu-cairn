import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en/translation.json";
import de from "./locales/de/translation.json";
import es from "./locales/es/translation.json";
import pl from "./locales/pl/translation.json";
import ptBR from "./locales/pt_BR/translation.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de },
    es: { translation: es },
    pl: { translation: pl },
    pt_BR: { translation: ptBR },
  },
  fallbackLng: "en",
  supportedLngs: ["en", "de", "es", "pl", "pt_BR"],
  interpolation: {
    escapeValue: false, // React ya escapa
  },
  keySeparator: false, // las claves son cadenas en inglés completas
  nsSeparator: false,
});

export default i18n;

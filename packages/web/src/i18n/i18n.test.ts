import { describe, it, expect, beforeAll } from "vitest";
import i18n from "./i18n.js";
import enTranslation from "./locales/en/translation.json";

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

describe("i18n setup", () => {
  it("está inicializado", () => {
    expect(i18n.isInitialized).toBe(true);
  });

  it("fallback es 'en'", () => {
    expect(i18n.options.fallbackLng).toContain("en");
  });

  it("traduce una clave existente en inglés", () => {
    expect(i18n.t("Login")).toBe(enTranslation["Login"]);
  });

  it("devuelve la clave si no existe traducción", () => {
    expect(i18n.t("__clave_inexistente__")).toBe("__clave_inexistente__");
  });

  it("cambia de idioma a 'es' y traduce correctamente", async () => {
    await i18n.changeLanguage("es");
    expect(i18n.t("Login")).toBe("Iniciar sesión");
    await i18n.changeLanguage("en");
  });
});

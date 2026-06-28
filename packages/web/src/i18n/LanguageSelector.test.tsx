import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n.js";
import { LanguageSelector } from "./LanguageSelector.js";

// Stub document.cookie
const cookieStore: Record<string, string> = {};
Object.defineProperty(document, "cookie", {
  get: () =>
    Object.entries(cookieStore)
      .map(([k, v]) => `${k}=${v}`)
      .join("; "),
  set: (value: string) => {
    const [pair] = value.split(";");
    if (pair) {
      const [k, v] = pair.split("=");
      if (k && v !== undefined) cookieStore[k.trim()] = v.trim();
    }
  },
  configurable: true,
});

const changeLanguageSpy = vi.spyOn(i18n, "changeLanguage");

afterEach(() => {
  changeLanguageSpy.mockClear();
});

function renderSelector() {
  return render(
    <I18nextProvider i18n={i18n}>
      <LanguageSelector />
    </I18nextProvider>
  );
}

describe("LanguageSelector", () => {
  it("renderiza un <select> con 5 opciones", () => {
    renderSelector();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(5);
  });

  it("al cambiar idioma llama a i18n.changeLanguage", () => {
    renderSelector();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "es" } });
    expect(changeLanguageSpy).toHaveBeenCalledWith("es");
  });

  it("al cambiar idioma escribe la cookie kw_lang", () => {
    renderSelector();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "de" } });
    expect(document.cookie).toContain("kw_lang=de");
  });
});

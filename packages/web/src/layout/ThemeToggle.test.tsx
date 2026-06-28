import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/i18n.js";
import { ThemeToggle } from "./ThemeToggle.js";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

function renderToggle() {
  return render(
    <I18nextProvider i18n={i18n}>
      <ThemeToggle />
    </I18nextProvider>
  );
}

describe("ThemeToggle", () => {
  it("renderiza un botón accesible", () => {
    renderToggle();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("alterna la clase dark en <html> y persiste en localStorage", () => {
    renderToggle();
    const initiallyDark = document.documentElement.classList.contains("dark");
    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement.classList.contains("dark")).toBe(
      !initiallyDark
    );
    expect(localStorage.getItem("kw_theme")).toBe(
      !initiallyDark ? "dark" : "light"
    );
  });
});

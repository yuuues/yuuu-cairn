import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import type { ReactNode } from "react";
import i18n from "../i18n/i18n.js";
import { AppErrorBoundary } from "./AppErrorBoundary.js";

function Boom(): never {
  throw new Error("boom");
}

function renderBoundary(children: ReactNode) {
  return render(
    <I18nextProvider i18n={i18n}>
      <AppErrorBoundary>{children}</AppErrorBoundary>
    </I18nextProvider>
  );
}

describe("AppErrorBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renderiza los hijos cuando no hay error", () => {
    renderBoundary(<p>contenido ok</p>);
    expect(screen.getByText("contenido ok")).toBeInTheDocument();
  });

  it("muestra el fallback cuando un hijo lanza durante el render", () => {
    // React y componentDidCatch loguean el error; lo silenciamos para no
    // ensuciar la salida del test.
    vi.spyOn(console, "error").mockImplementation(() => {});
    renderBoundary(<Boom />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
  });

  it("el botón Reload recarga la página", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const reload = vi.fn();
    vi.stubGlobal("location", { reload });
    renderBoundary(<Boom />);
    fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(reload).toHaveBeenCalled();
  });
});

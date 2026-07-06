import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n/i18n.js";
import { parseLocale } from "@kw/shared";
import "./index.css";
import { App } from "./App.js";
import { initApiClient } from "./client/characters.js";
import { initGeneratorsClient } from "./client/generators.js";
import { initAnimations } from "./layout/animations.js";

// Paridad con get_locale(): prioridad cookie kw_lang > fallback 'en'
function readLangCookie(): string | undefined {
  const match = document.cookie.match(/(?:^|;\s*)kw_lang=([^;]+)/);
  return match?.[1] ?? undefined;
}

const initialLocale = parseLocale(readLangCookie());
i18n.changeLanguage(initialLocale);

// Aplica el ajuste de animaciones antes de renderizar (evita parpadeo).
initAnimations();

const queryClient = new QueryClient();

// El cliente (local u HTTP) debe estar listo antes del primer render:
// los hooks consumen charactersApi/dataApi/generatorsApi al montar.
void Promise.all([initApiClient(), initGeneratorsClient()]).then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </I18nextProvider>
    </StrictMode>
  );
});

import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSession } from "../auth/useSession.js";
import { USE_LOCAL } from "../client/mode.js";
import { LanguageSelector } from "../i18n/LanguageSelector.js";
import { ThemeToggle } from "./ThemeToggle.js";
import { NavDrawer } from "./NavDrawer.js";
import { Button } from "../ui/index.js";

function NavLinks({
  authed,
  onNavigate,
  className,
}: {
  authed: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  if (USE_LOCAL) {
    // Modo local: sin cuentas ni partidas online; solo personajes.
    return (
      <div className={className}>
        <Link
          to="/characters"
          onClick={onNavigate}
          className="text-text hover:text-accent"
        >
          {t("Characters")}
        </Link>
        <Link
          to="/avatar"
          onClick={onNavigate}
          className="text-text hover:text-accent"
        >
          {t("Avatar")}
        </Link>
      </div>
    );
  }
  return (
    <div className={className}>
      {authed ? (
        <>
          <Link
            to="/characters"
            onClick={onNavigate}
            className="text-text hover:text-accent"
          >
            {t("Characters")}
          </Link>
          <Link
            to="/avatar"
            onClick={onNavigate}
            className="text-text hover:text-accent"
          >
            {t("Avatar")}
          </Link>
          <Link
            to="/parties"
            onClick={onNavigate}
            className="text-text hover:text-accent"
          >
            {t("Parties")}
          </Link>
          <Link
            to="/account"
            onClick={onNavigate}
            className="text-text hover:text-accent"
          >
            {t("Account")}
          </Link>
        </>
      ) : (
        <>
          <Link
            to="/login"
            onClick={onNavigate}
            className="text-text hover:text-accent"
          >
            {t("Login")}
          </Link>
          <Link
            to="/signup"
            onClick={onNavigate}
            className="text-text hover:text-accent"
          >
            {t("Sign Up")}
          </Link>
        </>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data: user } = useSession();
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const authed = Boolean(user);

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="font-serif text-xl font-bold text-text">
            Kettlewright
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <NavLinks authed={authed} className="flex items-center gap-6" />
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <LanguageSelector />
            <ThemeToggle />
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              aria-label={t("Menu")}
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
            >
              ☰
            </Button>
          </div>
        </div>
      </header>

      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <NavLinks
          authed={authed}
          onNavigate={() => setDrawerOpen(false)}
          className="flex flex-col gap-4 text-lg"
        />
        <div className="mt-2">
          <LanguageSelector />
        </div>
      </NavDrawer>

      <main>{children}</main>
    </div>
  );
}

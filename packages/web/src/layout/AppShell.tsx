import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSession } from "../auth/useSession.js";
import { USE_LOCAL } from "../client/mode.js";
import { LanguageSelector } from "../i18n/LanguageSelector.js";
import { ThemeToggle } from "./ThemeToggle.js";
import { BottomNav, type BottomNavItem } from "../ui/index.js";
import { ScrollIcon, UserCircleIcon, UsersIcon, SettingsIcon } from "../ui/icons.js";

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
  const authed = Boolean(user);

  // Misma lógica que NavLinks para decidir los items de la barra inferior móvil.
  // Sin autenticar en modo online: no hay BottomNav (Login/Signup viven en el header).
  let bottomNavItems: BottomNavItem[] = [];
  if (USE_LOCAL) {
    bottomNavItems = [
      { to: "/characters", label: t("Characters"), icon: <ScrollIcon /> },
      { to: "/avatar", label: t("Avatar"), icon: <UserCircleIcon /> },
    ];
  } else if (authed) {
    bottomNavItems = [
      { to: "/characters", label: t("Characters"), icon: <ScrollIcon /> },
      { to: "/avatar", label: t("Avatar"), icon: <UserCircleIcon /> },
      { to: "/parties", label: t("Parties"), icon: <UsersIcon /> },
      { to: "/account", label: t("Account"), icon: <SettingsIcon /> },
    ];
  }
  const showBottomNav = USE_LOCAL || authed;

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
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

          <div className="flex items-center gap-1 md:hidden">
            {!USE_LOCAL && !authed && (
              <NavLinks authed={authed} className="flex items-center gap-3" />
            )}
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main>{children}</main>

      {showBottomNav && <BottomNav items={bottomNavItems} />}
    </div>
  );
}

import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSession } from "../auth/useSession.js";
import { USE_LOCAL } from "../client/mode.js";
import { DiceRollerModal } from "../dice/DiceRollerModal.js";
import { SettingsModal } from "./SettingsModal.js";
import { BottomNav, type BottomNavItem } from "../ui/index.js";
import { ScrollIcon, UsersIcon, SettingsIcon, DiceIcon } from "../ui/icons.js";

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
    // Modo local: sin cuentas ni partidas online.
    // El avatar no es una sección propia: se edita desde cada personaje.
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
          to="/tools"
          onClick={onNavigate}
          className="text-text hover:text-accent"
        >
          {t("Tools")}
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
            to="/parties"
            onClick={onNavigate}
            className="text-text hover:text-accent"
          >
            {t("Parties")}
          </Link>
          <Link
            to="/tools"
            onClick={onNavigate}
            className="text-text hover:text-accent"
          >
            {t("Tools")}
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
  const [diceOpen, setDiceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Misma lógica que NavLinks para decidir los items de la barra inferior móvil.
  // Sin autenticar en modo online: no hay BottomNav (Login/Signup viven en el header).
  // El avatar se edita desde cada personaje, no es una sección de navegación.
  let bottomNavItems: BottomNavItem[] = [];
  if (USE_LOCAL) {
    bottomNavItems = [
      { to: "/characters", label: t("Characters"), icon: <ScrollIcon /> },
      { to: "/tools", label: t("Tools"), icon: <DiceIcon /> },
    ];
  } else if (authed) {
    bottomNavItems = [
      { to: "/characters", label: t("Characters"), icon: <ScrollIcon /> },
      { to: "/parties", label: t("Parties"), icon: <UsersIcon /> },
      { to: "/tools", label: t("Tools"), icon: <DiceIcon /> },
      { to: "/account", label: t("Account"), icon: <SettingsIcon /> },
    ];
  }
  const showBottomNav = bottomNavItems.length >= 2;

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

          <div className="flex items-center gap-1">
            {/* Login/Signup en móvil sin autenticar (no hay BottomNav ahí). */}
            {!USE_LOCAL && !authed && (
              <div className="md:hidden">
                <NavLinks authed={authed} className="flex items-center gap-3" />
              </div>
            )}
            <button
              type="button"
              aria-label={t("Quick dice")}
              onClick={() => setDiceOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-full text-text transition-colors duration-(--duration-fast) hover:bg-border/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <DiceIcon />
            </button>
            <button
              type="button"
              aria-label={t("Settings")}
              onClick={() => setSettingsOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-full text-text transition-colors duration-(--duration-fast) hover:bg-border/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <SettingsIcon />
            </button>
          </div>
        </div>
      </header>

      <main>{children}</main>

      {showBottomNav && <BottomNav items={bottomNavItems} />}

      <DiceRollerModal open={diceOpen} onClose={() => setDiceOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

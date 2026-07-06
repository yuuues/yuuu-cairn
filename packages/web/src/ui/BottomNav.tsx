import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "./cn.js";

export interface BottomNavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

export interface BottomNavProps {
  items: BottomNavItem[];
}

/**
 * Barra de navegación inferior, solo móvil (<md). Puramente presentacional:
 * quien la use (AppShell) decide qué items pasar segun el modo local/auth.
 */
export function BottomNav({ items }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                // no-underline: la regla global a.text-accent subraya enlaces en línea
                // (WCAG 1.4.1), pero aquí icono+color+posición ya diferencian la pestaña
                "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs no-underline transition-colors duration-(--duration-fast) ease-(--ease-emphasized)",
                isActive ? "text-accent" : "text-muted"
              )
            }
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

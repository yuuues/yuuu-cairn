const KEY = "kw_animations";

/** ¿El sistema pide reducir movimiento? */
export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Estado efectivo de las animaciones: la elección explícita del usuario manda;
 * si no la hay, por defecto activadas salvo que el sistema pida reducirlas.
 */
export function getAnimationsEnabled(): boolean {
  const stored = localStorage.getItem(KEY);
  if (stored === "on") return true;
  if (stored === "off") return false;
  return !prefersReducedMotion();
}

/** Aplica la clase .reduce-motion a <html> según el estado dado. */
function applyClass(enabled: boolean): void {
  document.documentElement.classList.toggle("reduce-motion", !enabled);
}

/** Fija la clase inicial antes del primer render (lo llama main.tsx). */
export function initAnimations(): void {
  applyClass(getAnimationsEnabled());
}

/** Guarda la elección del usuario y la aplica de inmediato. */
export function setAnimationsEnabled(enabled: boolean): void {
  localStorage.setItem(KEY, enabled ? "on" : "off");
  applyClass(enabled);
}

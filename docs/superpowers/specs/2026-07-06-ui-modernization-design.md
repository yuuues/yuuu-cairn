# Modernización de la UI — "App nativa con alma Cairn"

**Fecha:** 2026-07-06
**Estado:** Aprobado (dirección visual y estrategia validadas con el usuario; detalles restantes delegados)

## Contexto y objetivo

La app (React 18 + Vite + Tailwind CSS v4, SPA empaquetada también como APK Android vía Capacitor) es técnicamente moderna pero su estética se percibe genérica y poco pensada para móvil. Objetivo: elevar la apariencia a estándar de app nativa actual conservando la identidad Cairn, **sin migrar frameworks ni reestructurar rutas o lógica**.

Prioridades del usuario (por orden): experiencia móvil, identidad visual, animaciones/feedback.

Decisiones validadas con el usuario:

1. **Dirección visual:** estructura de app nativa moderna (superficies limpias, radios grandes, FAB, barra inferior) con acento **ámbar** (continuidad de marca), **títulos serif** (Averia Serif Libre) y toques **verde musgo**. Modo claro y oscuro se mantienen.
2. **Navegación móvil:** barra inferior de pestañas (Personajes · Avatar · Partidas · Cuenta). En modo local se oculta Partidas (lógica ya existente). Escritorio mantiene barra superior.
3. **Animación:** sutil y rápida (150–250 ms), skeletons de carga; nada expresivo/celebratorio.
4. **Estrategia:** sistema primero — tokens → kit UI → AppShell → pantallas por dominio.

## Alcance

- `packages/web/src/index.css` — tokens.
- `packages/web/src/ui/` — los 13 componentes existentes + 3 nuevos (`BottomNav`, `Fab`, `Skeleton`).
- `packages/web/src/layout/AppShell.tsx` (y `NavDrawer` si queda obsoleto).
- Pasada visual por todas las pantallas (`auth`, `characters`, `avatar`, `parties`, `inventory`, `generators`, home/cuenta).

**Fuera de alcance:** backend, rutas, lógica de dominio, i18n (las claves existentes se conservan), editor 3D de avatar en sí (solo su marco/página), vistas de impresión (su maquetación de impresión no debe cambiar).

## Sección 1 · Tokens de diseño (`index.css`)

- **Paleta claro:** neutros stone actuales sin cambios de fondo (`stone-50` bg, blanco surface).
- **Paleta oscuro:** pasa de stone puro a **oscuro cálido** — fondo casi negro con matiz marrón (referencia mockup: bg `#171412`, surface `#242019`); ajustar a valores con contraste AA respecto a texto `stone-100`.
- **Acento:** ámbar se conserva (amber-600/amber-500 hover en claro; amber-400/300 en oscuro). Contrastes AA actuales no deben degradarse.
- **Musgo:** nuevo color secundario (oliva/musgo, p. ej. en torno a `#6b7d4f`–`#8a9a5b` con variantes claro/oscuro AA) que **sustituye a emerald** en `--color-success` y aparece en badges/estados positivos.
- **Radios:** `--radius-lg` de 0.5rem → **0.75rem**; cards y modales usan 1rem (16px); botones más redondeados (0.75rem o pill en tamaños pequeños).
- **Sombras:** tokens `--shadow-card` (suave, en capas) y `--shadow-fab`; en oscuro la elevación se expresa por tono de superficie, no por sombra.
- **Movimiento:** tokens `--duration-fast: 150ms`, `--duration-base: 200ms`, easing `cubic-bezier(0.2, 0, 0, 1)`. El bloque `prefers-reduced-motion` existente se conserva tal cual.
- **Tipografía:** sin fuentes nuevas. Inter + Averia Serif Libre. Títulos algo más contundentes en móvil (tamaño/peso), jerarquía consistente vía `PageHeader`.
- **Safe areas (Capacitor/APK):** `viewport-fit=cover` en `index.html` y uso de `env(safe-area-inset-bottom)` (y top si aplica) en la barra inferior y el header.

## Sección 2 · Kit UI (`packages/web/src/ui/`)

Componentes existentes (rediseño, misma API pública salvo adiciones retrocompatibles):

- **Button:** área táctil mínima 44px, variantes primary/secondary/ghost/danger, estado de presión (scale ~0.97, `--duration-fast`), focus ring ámbar.
- **Card:** radio 16px, `--shadow-card`, variante interactiva (presionable, feedback táctil) para listas.
- **Modal:** en móvil (< md) se presenta como **bottom sheet** (entra desde abajo, esquinas superiores redondeadas, asa visual); en escritorio centrado. Entrada/salida 200 ms. Mantener focus-trap/semántica existente.
- **Input / Select / Textarea / Field:** altura táctil ≥ 44px, focus ring consistente, labels legibles.
- **Badge:** variantes ámbar / musgo / neutro.
- **PageHeader / Container / Spinner:** ajuste a los nuevos tokens; Container conserva `max-w-5xl`.

Nuevos componentes:

- **BottomNav:** barra inferior fija solo en móvil (< md), 3–4 pestañas con icono + etiqueta (i18n), estado activo en ámbar, respeta `safe-area-inset-bottom`, oculta Partidas en modo local reutilizando la lógica existente de nav.
- **Fab:** botón flotante circular (56px) con `--shadow-fab`, posicionado sobre la BottomNav; acción principal de pantalla (p. ej. "+ nuevo personaje").
- **Skeleton:** bloques de carga animados (pulse sutil) para listas/cards; sustituye a Spinner en listados (Spinner sigue existiendo para acciones puntuales).

## Sección 3 · AppShell y navegación

- **Móvil (< md):** header compacto (logo/título + toggle de tema + selector de idioma, restilizados y compactos); navegación principal pasa a `BottomNav`; el drawer (`NavDrawer`) deja de usarse y se elimina si nada más lo consume. Login/Signup (no autenticado) se muestran como enlaces en el header o pantalla de bienvenida, no en la BottomNav.
- **Escritorio (≥ md):** barra superior actual restilizada con los nuevos tokens (misma estructura y enlaces).
- El contenido principal recibe padding inferior suficiente para no quedar tapado por BottomNav/Fab.

## Sección 4 · Pasada por pantallas (por dominio, en este orden de prioridad)

1. **Personajes** (lista + ficha/edición): lista con Cards interactivas, Fab de crear, Skeletons de carga.
2. **Generadores/creación** de personaje.
3. **Inventario.**
4. **Partidas** (tiempo real): Skeletons donde haya carga.
5. **Avatar** (página/controles alrededor del editor 3D; el canvas 3D no se toca).
6. **Auth (login/signup) + Cuenta + Home.**

Reglas de la pasada: usar exclusivamente componentes del kit y tokens (nada de colores/radios ad hoc); mobile-first (revisar a 375px); densidad táctil (targets ≥ 44px, espaciado generoso); no cambiar textos ni claves i18n; no alterar la salida de impresión.

## Sección 5 · Animación y feedback

- Transiciones solo con tokens de duración/easing definidos en Sección 1.
- Presión en botones/cards interactivas; aparición de modal/bottom-sheet; cambio de pestaña activa en BottomNav (transición de color, sin desplazamientos llamativos); skeleton pulse.
- Sin transiciones entre páginas ni animaciones de lista (descartado por el usuario).
- Todo respeta `prefers-reduced-motion` (mecanismo global ya existente).

## Sección 6 · Accesibilidad y verificación

- **Accesibilidad:** mantener o mejorar el nivel actual — contraste AA en todos los pares nuevos (verificar musgo y oscuro cálido), enlaces subrayados, focus visible, roles/aria de Modal y nav intactos, áreas táctiles ≥ 44px.
- **Verificación técnica:** typecheck + build + tests existentes del monorepo en verde.
- **Verificación visual:** revisión de pantallas clave a 375px (móvil) y escritorio, en claro y oscuro.
- **Revisión de código:** pasada final buscando regresiones (claves i18n rotas, modo local, safe-areas, impresión).

## Riesgos conocidos

- Pares de contraste del musgo y del oscuro cálido: deben calcularse, no asumirse.
- Eliminación del drawer: comprobar que ninguna funcionalidad quede solo accesible desde él.
- Bottom sheet del Modal: no romper formularios largos dentro de modales (scroll interno).

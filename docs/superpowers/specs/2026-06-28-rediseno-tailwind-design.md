# Rediseño visual con Tailwind — Documento de diseño

**Fecha:** 2026-06-28
**Objetivo:** Dar a la web (React SPA) un aspecto moderno, coherente y responsive (móvil + escritorio) con **Tailwind CSS v4**, reemplazando el SCSS actual, conservando funcionalidad, i18n, dark mode y manteniendo los tests en verde.

---

## 1. Estado actual (análisis)

- 22 páginas en `packages/web/src/{auth,characters,parties,inventory,generators}` + `App.tsx` con `Nav`/`Home` inline.
- Estilos en SCSS: `src/styles/global.scss` (347 líneas), `character.module.scss`, `inventory.module.scss`, `party.module.scss`, `variables.scss`. Fuente serif "Averia Serif Libre", paleta (azul/amarillo/rojo/verde/morado), dark mode vía `body.dark-mode` + CSS vars.
- **Tests web:** 4 ficheros (`i18n`, `LanguageSelector`, `diceRoll`, `socketClient`) — lógica, no markup. Consultan por `getByRole`. El rediseño no debe romper los roles accesibles del `LanguageSelector`.
- Sin Tailwind instalado.

## 2. Dirección de diseño

Estética **moderna con calidez de juego de rol** (Cairn es de tono terroso/boscoso), no un SaaS genérico ni un pastiche medieval:

- **Tipografía:** títulos con **Averia Serif Libre** (mantiene identidad); cuerpo/UI con **Inter**. Cargadas vía Google Fonts en `index.html`.
- **Paleta (tokens semánticos, light + dark):** base **stone** (papel/tinta), acento primario **ámbar/ocre**, éxito **esmeralda**, peligro **rosa/rojo**, info **cielo**.
  - Light: `bg` stone-50, `surface` white, `text` stone-800, `muted` stone-500, `border` stone-200.
  - Dark: `bg` stone-950, `surface` stone-900, `text` stone-100, `muted` stone-400, `border` stone-800.
- **Forma:** esquinas `rounded-lg`, bordes 1px, sombras suaves (`shadow-sm`), espaciado generoso.
- **Dark mode:** estrategia `class` en `<html>`, con toggle persistido en `localStorage` (paridad: el origen ya tenía dark mode).
- **Responsive:** mobile-first. Contenedores `max-w` con padding fluido; grids que colapsan a 1 columna en móvil.

## 3. Setup técnico

- **Tailwind v4** con el plugin oficial de Vite (`@tailwindcss/vite`).
- `src/index.css`: `@import "tailwindcss";` + `@theme { ... }` con los tokens (colores semánticos, fuentes, radios) + `@custom-variant dark (&:where(.dark, .dark *));`.
- Helper `cn()` (clsx + tailwind-merge) en `src/ui/cn.ts`.
- Variantes de componentes con **class-variance-authority (cva)**.
- Se elimina la dependencia de SCSS para estilos de UI; los `.module.scss` y `global.scss` se retiran al final (lo que siga siendo necesario para impresión se reescribe con variantes `print:`).

## 4. Primitivos UI reutilizables (`src/ui/`)

Componentes compartidos para coherencia (uno por fichero, tipados, con variantes cva):

- `Button` — variantes: `primary | secondary | ghost | danger`; tamaños `sm | md`.
- `Card` — superficie con borde, radio y sombra.
- `Input`, `Textarea`, `Select`, `Field` (label + control + mensaje de error).
- `Badge` / `Tag` (para tags de objetos: petty/bulky/armor…).
- `Modal` / `Dialog` (accesible, cierre por overlay/esc).
- `PageHeader` (título serif + acciones).
- `Container` (ancho máximo + padding responsive).
- `Spinner`.
- `cn.ts` helper.

## 5. Layout y navegación (`src/layout/`)

- `AppShell`: barra superior sticky (surface + borde inferior). Logo a la izquierda; enlaces (Characters, Parties) ; a la derecha: cuenta, selector de idioma, **toggle de tema**.
- **Móvil (`< md`):** los enlaces se ocultan tras un botón hamburguesa que abre un **drawer** lateral (slide-over) accesible.
- `ThemeToggle`: alterna `dark` en `<html>`, persiste en `localStorage`, respeta `prefers-color-scheme` en el primer arranque.
- `App.tsx` se refactoriza para usar `AppShell` envolviendo las `Routes`; `Nav`/`Home` inline se extraen a `layout/` y `pages/HomePage`.

## 6. Alcance del restyle (paridad funcional intacta)

Reestilar con Tailwind + primitivos, **sin cambiar lógica ni props de datos**:

1. **Auth** (9 páginas): formularios centrados en `Card`, campos `Field`, botones `Button`. Login/Signup con layout a pantalla centrada.
2. **Characters:** lista (grid de tarjetas), **creación multi-paso** (wizard con stepper responsive), vista (hoja de personaje en grid), edición, import, print (`print:` variants).
3. **Inventory:** editor de inventario y contenedores con slots/tags visuales (`Badge`), responsive (tabla en desktop, tarjetas apiladas en móvil).
4. **Parties:** lista, crear, ver (con tiradas en vivo), editar, unirse por código.
5. **Generators/Tools:** paneles de tablas y generador de PNJ, modal de dados.
6. **Home/Nav:** AppShell + landing.

## 7. Restricciones y verificación

- **No romper i18n:** seguir usando `useTranslation`/`t()`; solo cambia el marcado/clases.
- **No romper tests:** mantener roles accesibles (especialmente `LanguageSelector`). Tras el rediseño deben pasar `pnpm --filter @kw/web test` y todo `pnpm test` (235 tests), más `pnpm typecheck` y `pnpm --filter @kw/web build`.
- **Accesibilidad básica:** foco visible, contraste AA, labels en formularios, `aria` en drawer/modal.

## 8. Secuencia (para el plan)

1. Setup Tailwind v4 + tokens + `cn`/cva + fuentes.
2. Primitivos UI (`src/ui/`) con pequeñas pruebas de render.
3. Layout: `AppShell` + `ThemeToggle` + drawer responsive; refactor de `App.tsx`.
4. Restyle por áreas: auth → characters → inventory → parties → generators/home.
5. Retirada del SCSS sustituido y limpieza.
6. Verificación: tests + typecheck + build en verde.

## 9. Descartado (YAGNI)

- Librería de componentes pesada completa (shadcn/ui entero): se hace un set mínimo propio con Tailwind+cva.
- Cambiar la estructura de datos o las rutas/endpoints.
- Animaciones complejas; solo transiciones sutiles.

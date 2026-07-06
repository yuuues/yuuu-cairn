# Plan de implementación — Modernización de la UI ("App nativa con alma Cairn")

**Fecha:** 2026-07-06
**Spec de referencia:** `docs/superpowers/specs/2026-07-06-ui-modernization-design.md`
**Estado:** Listo para ejecución por agentes independientes.

---

## 0. Cómo usar este plan (para cada agente)

Este plan está dividido en **fases con propietario único de archivo**. Cada fase lista los
archivos que TOCA y los que NO debe tocar. Las fases están ordenadas por dependencia:

| Fase | Propietario | Archivos que crea/edita | Depende de |
|------|-------------|-------------------------|------------|
| **A · Tokens** | Agente Tokens | `packages/web/src/index.css`, `packages/web/index.html` | — |
| **B · Kit UI (existentes)** | Agente Kit-Existente | `ui/Button.tsx`, `ui/Input.tsx`, `ui/Textarea.tsx`, `ui/Select.tsx`, `ui/Card.tsx`, `ui/Field.tsx`, `ui/Badge.tsx`, `ui/PageHeader.tsx`, `ui/Container.tsx`, `ui/Spinner.tsx`, `ui/Modal.tsx` | A |
| **C · Kit UI (nuevos)** | Agente Kit-Nuevo | `ui/BottomNav.tsx`, `ui/Fab.tsx`, `ui/Skeleton.tsx`, `ui/index.ts` | A |
| **D · AppShell** | Agente Shell | `layout/AppShell.tsx`, borrado de `layout/NavDrawer.tsx` | A, C |
| **E1..E6 · Pantallas** | Un agente por dominio | ver §4 | A, B, C |

**Regla de oro para TODOS:** solo se usan tokens (§1) y componentes del kit (§2). **Cero**
colores/radios/sombras/duraciones ad hoc (nada de `emerald-*`, `bg-[#...]`, `rounded-[10px]`,
`duration-[180ms]`, etc.). **No** se tocan claves i18n (las cadenas siguen pasando por `t()`
con la misma clave en inglés). **No** se toca la maquetación de impresión
(`characters/PrintCharacterPage.tsx` y utilidades `print:` existentes). **No** se toca el
`<canvas>` 3D del avatar.

**El único agente que edita `ui/index.ts` es el Agente Kit-Nuevo (Fase C).** El resto solo
importa desde `../ui/index.js`.

---

## 1. TOKENS DE DISEÑO — Fase A

**Archivo:** `packages/web/src/index.css`. Se mantiene la estructura actual (`@theme` con
alias `--color-*` → `--kw-*`, y bloques `:root` / `.dark` que resuelven las `--kw-*`). Solo
se **añaden** tokens y se **reasignan** los valores de `.dark` y de success. No se borra el
bloque `prefers-reduced-motion`.

### 1.1 Color — modo claro (`:root`) — SIN CAMBIOS de fondo

Se conservan los valores actuales. Referencia (ya presentes, no tocar salvo lo indicado):

```
--kw-bg: var(--color-stone-50);
--kw-surface: var(--color-white);
--kw-text: var(--color-stone-800);
--kw-muted: var(--color-stone-500);
--kw-border: var(--color-stone-200);
--kw-accent: var(--color-amber-800);        /* enlace/anillo — se conserva */
--kw-accent-hover: var(--color-amber-900);
--kw-btn: var(--color-amber-600);           /* superficie botón primario */
--kw-btn-hover: var(--color-amber-500);
```

### 1.2 Color — modo oscuro (`.dark`) — OSCURO CÁLIDO

Se **reemplazan** los valores stone puros por un oscuro cálido (matiz marrón). Valores
finales exactos (hex literales; NO usar la escala stone aquí porque necesitamos el matiz
cálido):

```
--kw-bg:      #1a1613;   /* fondo casi negro cálido */
--kw-surface: #26211c;   /* superficie elevada (cards/header/modal) */
--kw-text:    #f5f5f4;   /* = stone-100 */
--kw-muted:   #a8a29e;   /* = stone-400 */
--kw-border:  #3a332c;   /* borde cálido, elevación por tono */
--kw-accent:  var(--color-amber-400);   /* se conserva */
--kw-accent-hover: var(--color-amber-300);
--kw-btn:     var(--color-amber-400);   /* se conserva */
--kw-btn-hover: var(--color-amber-300);
color-scheme: dark;   /* se conserva */
```

**Contraste AA verificado (ratio real calculado):**

| Par | Ratio | Umbral | ✔ |
|-----|-------|--------|---|
| text `#f5f5f4` sobre bg `#1a1613` | **16.48:1** | 4.5 | ✔ |
| text `#f5f5f4` sobre surface `#26211c` | **14.62:1** | 4.5 | ✔ |
| muted `#a8a29e` sobre bg `#1a1613` | **7.13:1** | 4.5 | ✔ |
| accent amber-400 `#fbbf24` sobre bg | **10.77:1** | 4.5 | ✔ |
| accent amber-400 sobre surface | **9.55:1** | 4.5 | ✔ |
| btn-fg stone-950 sobre btn amber-400 | **11.83:1** | 4.5 | ✔ |

`--kw-border` sobre surface es 1.28:1 (esperado: los bordes son separadores no-textuales; la
elevación en oscuro se expresa por tono de superficie, no por contraste de borde, según spec).

### 1.3 Color — MUSGO (nuevo, sustituye a emerald en success)

Nuevo color secundario oliva/musgo con variante clara y oscura. Se definen **dos tokens
crudos** y su reasignación semántica de `--color-success`.

Valores finales exactos:

```
/* En :root  (modo claro) */
--kw-moss:       #4a5a2f;   /* musgo oscuro — texto/borde/superficie sólida en claro */
--kw-moss-hover: #3d4b26;   /* hover del musgo sólido en claro */

/* En .dark (modo oscuro) */
--kw-moss:       #a3b579;   /* musgo claro — texto/estado positivo en oscuro */
--kw-moss-hover: #b4c58f;
```

Y en `@theme` se **redefine** success para que apunte al musgo (sustituye emerald):

```
--color-success: var(--kw-moss);
--color-success-hover: var(--kw-moss-hover);
--color-moss: var(--kw-moss);          /* alias directo para badges/estados */
--color-moss-fg: var(--color-stone-950);  /* texto oscuro sobre musgo claro sólido */
```

> **Nota importante para el agente Tokens:** hoy `--color-success` es `emerald-700` y
> `--color-success-hover` es `emerald-800` (definidos dentro de `@theme`). Deben pasar a
> apuntar a `var(--kw-moss)` / `var(--kw-moss-hover)`. Como esos `--kw-moss` cambian de valor
> entre `:root` y `.dark`, el token `--color-success` se vuelve automáticamente claro/oscuro.

**Contraste AA verificado (ratio real calculado):**

| Uso | Par | Ratio | Umbral | ✔ |
|-----|-----|-------|--------|---|
| Texto musgo (claro) sobre superficie blanca | `#4a5a2f` / `#ffffff` | **7.51:1** | 4.5 | ✔ |
| Texto musgo (claro) sobre bg stone-50 | `#4a5a2f` / `#fafaf9` | **7.19:1** | 4.5 | ✔ |
| Texto musgo (oscuro) sobre surface `#26211c` | `#a3b579` / `#26211c` | **7.17:1** | 4.5 | ✔ |
| Texto musgo (oscuro) sobre bg `#1a1613` | `#a3b579` / `#1a1613` | **8.08:1** | 4.5 | ✔ |
| Botón success claro: blanco sobre musgo `#4a5a2f` | `#ffffff` / `#4a5a2f` | **7.51:1** | 4.5 | ✔ |
| Botón success oscuro: stone-950 sobre musgo `#a3b579` | `#0c0a09` / `#a3b579` | **8.88:1** | 4.5 | ✔ |

Todos los pares del musgo superan AA con margen (≥7:1, casi AAA).

### 1.4 Radios

En `@theme`:

```
--radius-lg: 0.75rem;    /* 12px — sube desde 0.5rem; botones/inputs/badges base */
--radius-card: 1rem;     /* 16px — cards y modales/bottom-sheet */
```

`--radius-lg` ya lo consume Tailwind vía la utilidad `rounded-lg`. `--radius-card` es nuevo;
se consume con la utilidad arbitraria `rounded-(--radius-card)` (sintaxis Tailwind v4 para
var). Botones `sm` usan pill: `rounded-full`.

### 1.5 Sombras

En `@theme` (sombras suaves en capas; en oscuro la elevación es por tono, así que estas
sombras se aplican principalmente en claro — ver nota):

```
--shadow-card: 0 1px 2px 0 rgb(0 0 0 / 0.04), 0 2px 8px -2px rgb(0 0 0 / 0.08);
--shadow-fab:  0 4px 12px -2px rgb(0 0 0 / 0.18), 0 2px 4px -1px rgb(0 0 0 / 0.12);
```

Consumo: `shadow-(--shadow-card)` y `shadow-(--shadow-fab)` (utilidades arbitrarias v4).
En oscuro las sombras quedan casi invisibles sobre bg cálido; NO añadir sombras extra en
`.dark` (la separación la da `--kw-surface` vs `--kw-bg`).

### 1.6 Movimiento

En `@theme`:

```
--duration-fast: 150ms;
--duration-base: 200ms;
--ease-emphasized: cubic-bezier(0.2, 0, 0, 1);
```

Consumo en clases: `duration-(--duration-fast)` / `duration-(--duration-base)` y
`ease-(--ease-emphasized)`. El bloque `@media (prefers-reduced-motion: reduce)` existente
**se conserva sin cambios** (ya neutraliza estas duraciones globalmente).

### 1.7 Tipografía

Sin fuentes nuevas (Inter + Averia Serif Libre siguen cargándose desde `index.html`). No se
añaden tokens de fuente. La contundencia móvil de títulos se resuelve en el kit
(`PageHeader`, ver §2.9), no aquí.

### 1.8 Safe areas — `packages/web/index.html`

En la línea 5, cambiar el meta viewport para habilitar safe-areas de Capacitor/APK:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

No se añade nada más en `index.html`. El uso de `env(safe-area-inset-*)` se hace en
BottomNav/Fab/AppShell vía utilidades arbitrarias (ver §2 y §3).

### 1.9 Resumen de qué se añade/cambia en `index.css` (checklist del Agente Tokens)

- [ ] `@theme`: `--radius-lg` → `0.75rem`; añadir `--radius-card`, `--shadow-card`,
  `--shadow-fab`, `--duration-fast`, `--duration-base`, `--ease-emphasized`,
  `--color-moss`, `--color-moss-fg`.
- [ ] `@theme`: `--color-success` / `--color-success-hover` → apuntan a `--kw-moss` / `--kw-moss-hover`.
- [ ] `:root`: añadir `--kw-moss: #4a5a2f;` y `--kw-moss-hover: #3d4b26;`.
- [ ] `.dark`: reasignar `--kw-bg/surface/text/muted/border` a los hex cálidos; añadir
  `--kw-moss: #a3b579;` y `--kw-moss-hover: #b4c58f;`.
- [ ] `index.html`: viewport con `viewport-fit=cover`.
- [ ] NO tocar `prefers-reduced-motion`, ni los tokens de danger/info/accent/btn.

---

## 2. KIT UI — Fases B y C

Convenciones transversales del kit:
- **Target táctil ≥ 44px** en todo control interactivo primario (botones md, inputs, ítems
  de nav, FAB).
- **Focus ring** consistente: `focus-visible:ring-2 focus-visible:ring-accent` (ya en uso).
- **Presión** (donde aplique): `active:scale-[0.97] transition-transform
  duration-(--duration-fast) ease-(--ease-emphasized)`.
- **API pública retrocompatible:** solo adiciones (nuevas variantes, nuevas props
  opcionales). No se renombran ni eliminan props existentes.

### Fase B — Componentes existentes (Agente Kit-Existente)

#### 2.1 `ui/Button.tsx`
- Base cva: cambiar `transition-colors` por `transition-[color,background-color,transform]`
  y añadir presión `active:scale-[0.97] duration-(--duration-fast) ease-(--ease-emphasized)`.
- Radios: base `rounded-lg` (ahora 12px). En `size.sm` añadir `rounded-full` (pill).
- Tamaños táctiles: `size.md` sube a `h-11` (44px) manteniendo `px-4 text-sm`. `size.sm`
  permanece `h-8` (uso denso, no primario).
- Añadir variante **`success`**: `bg-success text-white hover:bg-success-hover` (musgo).
  Adición retrocompatible; `primary/secondary/ghost/danger` intactas.
- Focus ring ya presente; conservar.

#### 2.2 `ui/Input.tsx` (y por herencia Select/Textarea vía `inputClass`)
- En `inputClass`: subir altura táctil. Cambiar `py-2` por `min-h-11 py-2.5` (≥44px) y
  mantener `rounded-lg` (ahora 12px), `text-sm`, foco actual.
- No cambiar la firma ni el nombre exportado `inputClass` (Select y Textarea dependen de él).

#### 2.3 `ui/Textarea.tsx`
- Sin cambios de API. Como reusa `inputClass`, hereda radio/altura; `min-h-11` no molesta en
  textarea multi-línea. Mantener `resize-y` y `rows=4`. Verificar que sigue compilando.

#### 2.4 `ui/Select.tsx`
- Sin cambios de API. Hereda `inputClass`. Mantener `pr-8`. Verificar altura ≥44px.

#### 2.5 `ui/Card.tsx`
- Radio: pasar de `rounded-lg` a `rounded-(--radius-card)` (16px).
- Sombra: cambiar `shadow-sm` por `shadow-(--shadow-card)`.
- **Nueva prop opcional `interactive?: boolean`** (adición retrocompatible). El componente
  sigue siendo `forwardRef<HTMLDivElement>` con `HTMLAttributes<HTMLDivElement>` más esa
  prop. Cuando `interactive` es true, añadir:
  `cursor-pointer transition-transform duration-(--duration-fast) ease-(--ease-emphasized)
  active:scale-[0.98] hover:border-accent/40 focus-visible:outline-none
  focus-visible:ring-2 focus-visible:ring-accent`.
  No cambiar el padding `p-6`. La accesibilidad del click (role/tabIndex) la aporta quien lo
  use (normalmente envolviendo con `<Link>`), no la Card.

#### 2.6 `ui/Field.tsx`
- Sin cambios funcionales. Mantener label `text-sm font-medium`. Como los inputs suben a
  ≥44px, no se toca aquí. (Opcional, no requerido: nada.)

#### 2.7 `ui/Badge.tsx`
- Reemplazar la variante `armor` (que usa `emerald-*` directo) por musgo basado en token:
  `armor: "bg-moss/15 text-moss"`. **Mantener el nombre de variante `armor`** para no romper
  llamadas existentes (retrocompatibilidad de API). `neutral` y `accent` intactas.
- Añadir alias de variante **`moss`** con las mismas clases que `armor`
  (`bg-moss/15 text-moss`) para que las pantallas nuevas usen nombre semántico. Así el spec
  ("variantes ámbar/musgo/neutro") queda cubierto: `accent`=ámbar, `moss`(=`armor`)=musgo,
  `neutral`=neutro.
- Verificado AA: texto musgo sobre superficie claro 7.51:1 / oscuro 7.17:1 (§1.3).

#### 2.8 `ui/Spinner.tsx`
- Sin cambios de color obligatorios (usa `border-t-accent`, ya tokenizado). Se conserva
  para acciones puntuales. No se elimina.

#### 2.9 `ui/PageHeader.tsx`
- Ajuste de contundencia móvil del título: cambiar `text-3xl` por
  `text-2xl sm:text-3xl` y añadir `font-bold tracking-tight` al `<h1>`. Mantiene `font-serif`
  y la estructura de `actions`. Sin cambios de API.

#### 2.10 `ui/Container.tsx`
- Conserva `mx-auto w-full max-w-5xl px-4 py-8 sm:px-6`.
- **Añadir padding inferior para no quedar tapado por BottomNav/Fab en móvil:** cambiar
  `py-8` por `pt-8 pb-24 md:pb-8`, y añadir el respeto de safe-area:
  `pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8`. (6rem cubre BottomNav ~56px +
  holgura del Fab.) Sin cambios de API.

#### 2.11 `ui/Modal.tsx` → bottom-sheet en `< md`
- **Mantener intacta toda la lógica de focus-trap, Escape, click-overlay, roles/aria**
  (`role="dialog"`, `aria-modal`, `aria-labelledby`/`aria-label`). Solo cambian clases de
  layout y se añade animación de entrada.
- Contenedor overlay: en móvil alinear abajo, en desktop centrar:
  `fixed inset-0 z-50 flex items-end justify-center md:items-center bg-black/50
  md:p-4`.
- Diálogo:
  - Móvil (base): `w-full max-w-none rounded-t-(--radius-card) rounded-b-none
    max-h-[90vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]`.
  - Desktop (`md:`): `md:max-w-lg md:rounded-(--radius-card)`.
  - Mantener `border border-border bg-surface shadow-lg p-6 focus:outline-none`.
- **Asa visual (grabber)** solo en móvil: dentro del diálogo, como primer hijo, un div no
  interactivo `aria-hidden="true"` con
  `mx-auto mb-4 h-1.5 w-10 rounded-full bg-border md:hidden`.
- **Animación de entrada** (200ms): añadir a `@theme` no es necesario; usar animación inline
  con las duraciones token. Como Tailwind v4 no trae keyframes de slide por defecto, el
  Agente Kit-Existente **añade en `index.css`** un pequeño bloque de keyframes... **NO** —
  para respetar la propiedad de archivo, el Modal usará clases utilitarias de transición ya
  disponibles combinadas con estado. Implementación concreta sin tocar `index.css`:
  - Envolver la aparición con transición de `translate`/`opacity` gestionada por un estado
    `mounted` (useEffect que pasa a true en el siguiente frame):
    diálogo base `translate-y-full opacity-0 transition-[transform,opacity]
    duration-(--duration-base) ease-(--ease-emphasized) md:translate-y-0`,
    y cuando `mounted`: `translate-y-0 opacity-100`.
  - En desktop el `translate-y` se anula con `md:translate-y-0` en ambos estados (solo hace
    fade), evitando slide vertical en escritorio.
  - `prefers-reduced-motion` global ya neutraliza la transición.
- API pública sin cambios (mismas props: `open, onClose, title?, ariaLabel?, children,
  className?`). El scroll interno (`overflow-y-auto` + `max-h-[90vh]`) cubre "formularios
  largos" del riesgo del spec.

> Este componente NO usa portal hoy y **se mantiene sin portal** (fuera de alcance cambiar
> el mecanismo de render). Solo layout + animación.

### Fase C — Componentes nuevos (Agente Kit-Nuevo)

Crea tres archivos y **es el único que edita `ui/index.ts`** (añade tres exports; no
reordena ni elimina los existentes).

#### 2.12 `ui/Skeleton.tsx` (NUEVO)
- Firma: `Skeleton(props: HTMLAttributes<HTMLDivElement>)` (sin forwardRef necesario;
  aceptable función simple). Clases base:
  `animate-pulse rounded-(--radius-lg) bg-border/60`.
  El consumidor pasa tamaño vía `className` (p. ej. `h-4 w-32`).
- Export nombrado `Skeleton` y `type SkeletonProps = HTMLAttributes<HTMLDivElement>`.
- `animate-pulse` es utilidad estándar de Tailwind; su duración la respeta
  `prefers-reduced-motion` global.
- Uso previsto: sustituir `<Spinner/>` en listados/cards durante carga (ver §4). Se puede
  componer un "SkeletonCard" en la propia pantalla combinando `<Card>` + varios `<Skeleton>`;
  no hace falta un componente extra en el kit.

#### 2.13 `ui/Fab.tsx` (NUEVO)
- Botón flotante circular 56px. Firma:
  `Fab = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>`.
  `type` por defecto `"button"`. Clases:
  ```
  fixed right-4 z-40 inline-flex h-14 w-14 items-center justify-center
  rounded-full bg-btn text-btn-fg shadow-(--shadow-fab)
  transition-transform duration-(--duration-fast) ease-(--ease-emphasized)
  active:scale-[0.94]
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
  focus-visible:ring-offset-2 focus-visible:ring-offset-bg
  bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:hidden
  ```
  (posicionado sobre la BottomNav en móvil; oculto en `md` porque en desktop la acción vive
  en el `PageHeader`).
- El icono/label lo pasa el consumidor como `children` (p. ej. `+`); exigir `aria-label` por
  parte del consumidor (documentar en comentario; no forzar en tipos).
- Export `Fab` y `type FabProps = ButtonHTMLAttributes<HTMLButtonElement>`.

#### 2.14 `ui/BottomNav.tsx` (NUEVO)
- Barra inferior fija solo en móvil. Firma:
  ```ts
  interface BottomNavItem { to: string; label: string; icon: ReactNode; }
  interface BottomNavProps { items: BottomNavItem[]; }
  ```
  El **AppShell** decide qué items pasar (misma lógica de modo local/auth). BottomNav es
  presentacional: no importa `USE_LOCAL` ni la sesión.
- Contenedor:
  ```
  fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur
  md:hidden pb-[env(safe-area-inset-bottom)]
  ```
- Cada item usa `NavLink` de `react-router-dom` (import nuevo permitido en este archivo) para
  obtener estado activo sin lógica manual:
  ```
  flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs
  transition-colors duration-(--duration-fast) ease-(--ease-emphasized)
  ```
  con `className={({isActive}) => cn(base, isActive ? "text-accent" : "text-muted")}`.
  El icono en un `<span aria-hidden="true">`, la etiqueta (i18n, ya traducida por el
  AppShell) como texto visible. `min-h-14` garantiza target ≥44px.
- Sin animaciones de desplazamiento; solo transición de color en el activo (spec §5).
- Export `BottomNav`, `type BottomNavProps`, `type BottomNavItem`.

#### 2.15 `ui/index.ts` (editado SOLO por Agente Kit-Nuevo)
Añadir al final, sin tocar líneas existentes:
```ts
export { Skeleton, type SkeletonProps } from "./Skeleton.js";
export { Fab, type FabProps } from "./Fab.js";
export { BottomNav, type BottomNavProps, type BottomNavItem } from "./BottomNav.js";
```

---

## 3. APPSHELL Y NAVEGACIÓN — Fase D (Agente Shell)

**Archivo:** `packages/web/src/layout/AppShell.tsx`. Depende de que Fase C haya exportado
`BottomNav` y de que Fase A haya definido tokens.

### 3.1 Header compacto móvil
- Mantener el header sticky (`sticky top-0 z-40 border-b border-border bg-surface/95
  backdrop-blur`). Añadir respeto de safe-area superior:
  `pt-[env(safe-area-inset-top)]` en el `<header>`.
- Móvil: el header ya no lleva botón ☰ (se elimina el drawer). Mantiene logo + `ThemeToggle`
  + `LanguageSelector` compactados. Reemplazar el bloque `md:hidden` del botón menú por el
  bloque de idioma+tema también en móvil (compacto). Reducir `gap` si es necesario para que
  entre a 375px.
- Desktop (`md:`): la nav superior actual (`NavLinks`) se conserva con los enlaces intactos.

### 3.2 BottomNav con la MISMA lógica de modo local/auth
- El AppShell construye el array de items replicando exactamente la lógica actual de
  `NavLinks`:
  - Si `USE_LOCAL`: items = `[Characters(/characters), Avatar(/avatar)]`.
  - Si NO local y `authed`: items = `[Characters, Avatar, Parties(/parties),
    Account(/account)]`.
  - Si NO local y NO authed: **no se renderiza BottomNav**; Login/Signup quedan como enlaces
    en el header (o pantalla de bienvenida). (Spec §3: no autenticado no lleva pestañas.)
- Las etiquetas se traducen en el AppShell con `t("Characters")`, `t("Avatar")`,
  `t("Parties")`, `t("Account")` — **mismas claves i18n existentes**, sin añadir claves.
- Iconos: usar glifos/emoji simples ya sin dependencia nueva (coherente con `☀/☾` y `☰`
  actuales), p. ej. Characters `🧙`, Avatar `👤`, Parties `⚔`, Account `⚙`. (No introducen
  librería de iconos; si se prefiere, texto-only también válido, pero el spec pide icono +
  etiqueta.) Elegir glifos monocromos y envolverlos en `aria-hidden`.
- Renderizar `<BottomNav items={items} />` fuera del `<main>`, al final del árbol.

### 3.3 Eliminación de NavDrawer
- Quitar de AppShell: `import { NavDrawer }`, el estado `drawerOpen`/`setDrawerOpen`, el
  botón ☰ y el bloque `<NavDrawer>...</NavDrawer>`.
- **Verificar que nadie más importa `NavDrawer`** (grep en §5). Si no hay otros consumidores,
  **borrar el archivo** `packages/web/src/layout/NavDrawer.tsx`.
- La función `NavLinks` interna se conserva (la usa la nav superior desktop). Su firma no
  cambia.

### 3.4 Padding inferior del contenido
- Ya resuelto en `Container` (§2.10) con `pb-[calc(6rem+env(safe-area-inset-bottom))]
  md:pb-8`. El AppShell no necesita padding extra en `<main>` **siempre que todas las
  pantallas usen `<Container>`**. Si alguna pantalla no lo usa, esa pantalla añade el padding
  inferior equivalente (nota para agentes de pantallas).

---

## 4. PASADA POR PANTALLAS — Fases E1..E6

**Reglas comunes (todas las pantallas):**
- Solo tokens + componentes del kit. Prohibido color/radio/sombra/duración ad hoc y
  `emerald-*`.
- Mobile-first, revisar a 375px. Targets interactivos ≥44px (los da el kit si se usan
  Button/Input/Card interactivo).
- **No** cambiar textos ni claves `t(...)`.
- **No** tocar impresión ni el `<canvas>` 3D.
- Sustituir spinners de **listado/carga de página** por Skeletons (Spinner sigue válido para
  acciones puntuales dentro de botones).
- Envolver Cards clicables de lista con `interactive` + `<Link>`.

Cada dominio es un agente independiente; los archivos no se solapan entre dominios.

### E1 · Personajes (prioridad 1) — Agente Chars
Archivos:
- `characters/CharacterListPage.tsx`: lista con `<Card interactive>` envuelta en `<Link>`;
  añadir `<Fab aria-label={t("Create Character")}>+</Fab>` (la acción de crear ya existe en
  el `PageHeader`; el Fab la duplica solo en móvil). Sustituir el `<Spinner/>` de carga por
  una grilla de Skeletons (p. ej. 6 `<Card>` con `<Skeleton className="h-5 w-2/3"/>` +
  `<Skeleton className="h-4 w-1/2"/>`). Mantener el estado vacío y el botón Delete
  (que puede pasar a variante `danger` `size="sm"`).
- `characters/CharacterViewPage.tsx`, `characters/CharacterEditPage.tsx`,
  `characters/create/CharacterCreatePage.tsx`, `characters/ImportCharacterPage.tsx`,
  `characters/CharacterAvatarPage.tsx`: pasada de tokens/kit; formularios con Field/Input/
  Select/Textarea del kit; Skeletons donde haya carga.
- **NO** tocar `characters/PrintCharacterPage.tsx` (impresión).

### E2 · Generadores / creación — Agente Tools
Archivos: `generators/ToolsPage.tsx` (y cualquier subcomponente de creación bajo
`characters/create/` no cubierto por E1 si el orquestador lo asigna aquí; por defecto
`create/` va en E1). Pasada de kit/tokens; Skeletons en carga.

### E3 · Inventario — Agente Inv
Archivos: `inventory/InventoryEditorPage.tsx`. Cards/inputs del kit, targets ≥44px,
Skeleton en carga. Badges de estado positivo → variante `moss`.

### E4 · Partidas (tiempo real) — Agente Parties
Archivos: `parties/PartyListPage.tsx`, `parties/PartyCreatePage.tsx`,
`parties/PartyViewPage.tsx`, `parties/PartyEditPage.tsx`, `parties/JoinPartyPage.tsx`.
Cards interactivas en listas, Fab de crear partida en `PartyListPage` (móvil), Skeletons
donde haya carga (incluye estados de carga por realtime).

### E5 · Avatar — Agente Avatar
Archivos: `avatar/AvatarForgePage.tsx` (marco/controles alrededor del editor). **No tocar el
`<canvas>` 3D ni su lógica.** Solo restilizar controles/paneles con kit/tokens.

### E6 · Auth + Cuenta + Home — Agente Auth
Archivos: `auth/LoginPage.tsx`, `auth/SignupPage.tsx`, `auth/ResendConfirmationPage.tsx`,
`auth/RequestPasswordResetPage.tsx`, `auth/ResetPasswordPage.tsx`, `auth/AccountPage.tsx`,
`auth/ChangePasswordPage.tsx`, `auth/ChangeEmailPage.tsx`, `auth/DeleteAccountPage.tsx`,
`pages/HomePage.tsx`. Formularios centrados con `<Card>` + `<Field>`, botones del kit,
Skeleton en cargas de cuenta. Enlaces de acento subrayados (ya global vía `a.text-accent`).

---

## 5. VERIFICACIÓN — comandos exactos y criterios

Comandos (del inventario; ejecutar desde la raíz del monorepo):

```bash
pnpm --filter @kw/web typecheck   # tsc -p tsconfig.json --noEmit
pnpm --filter @kw/web build       # typecheck + vite build (incluye prebuild de gamedata)
pnpm --filter @kw/web test        # vitest run --passWithNoTests
pnpm --filter @kw/web dev         # dev server para revisión visual
```

O globalmente: `pnpm -r typecheck && pnpm -r build && pnpm -r test`.

### Criterios de aceptación

**Técnicos (obligatorios, en verde):**
- [ ] `typecheck` sin errores (API pública del kit intacta; solo adiciones).
- [ ] `build` correcto.
- [ ] `test` sin fallos.

**Regresión (grep manual — el Agente Shell y un revisor final):**
- [ ] `NavDrawer` sin consumidores antes de borrarlo:
  `Grep "NavDrawer" packages/web/src` → solo el propio archivo (que se elimina).
- [ ] Sin colores emerald residuales:
  `Grep "emerald" packages/web/src` → 0 resultados.
- [ ] Sin valores ad hoc introducidos: revisar que no aparezcan `bg-[#`, `rounded-[`,
  `duration-[` nuevos fuera de las utilidades token `-(--...)`.
- [ ] Claves i18n intactas: no hay nuevas claves ni cadenas literales en la UI; todo texto
  sigue vía `t(...)` con las mismas claves. `git diff` de `src/i18n/locales/**` vacío.
- [ ] `viewport-fit=cover` presente en `index.html`.
- [ ] Impresión intacta: `git diff` de `characters/PrintCharacterPage.tsx` vacío; utilidades
  `print:` no alteradas.
- [ ] Canvas 3D intacto: `git diff` sin cambios en la lógica del `<canvas>` de
  `avatar/AvatarForgePage.tsx`.

**Visuales (revisión manual a 375px y desktop, claro y oscuro):**
- [ ] Modo oscuro cálido aplicado (fondo marrón, no stone puro); texto stone-100 legible.
- [ ] Musgo visible en badges/estados positivos y botón success; nada emerald.
- [ ] BottomNav en móvil con estado activo en ámbar; oculta Partidas en modo local; ausente
  para usuario no autenticado en modo online.
- [ ] Fab sobre la BottomNav sin solaparse; contenido no tapado (padding inferior OK).
- [ ] Modal como bottom-sheet en móvil (asa visible, entra desde abajo, scroll interno en
  formularios largos) y centrado en desktop; focus-trap y Escape siguen funcionando.
- [ ] Safe-area inferior respetada en dispositivo con notch/APK.
- [ ] Targets ≥44px en botones/inputs/nav.
- [ ] `prefers-reduced-motion` sigue neutralizando animaciones.

### Accesibilidad (contrastes ya calculados en §1)
Todos los pares nuevos verificados AA ≥4.5:1 (oscuro cálido 14–16:1; musgo 7.1–8.9:1). No
re-verificar salvo cambio de valores; si un agente ajusta un hex, debe recalcular con la
misma fórmula WCAG y documentarlo.

---

## 6. Orden de ejecución recomendado

1. **A (Tokens)** — desbloquea todo.
2. **C (Kit nuevo)** y **B (Kit existente)** en paralelo (archivos disjuntos salvo
   `index.ts`, que solo toca C).
3. **D (AppShell)** — tras C.
4. **E1..E6 (Pantallas)** en paralelo — tras B y C (y D para verificación de padding).
5. Revisión final de regresión + verificación técnica y visual (§5).

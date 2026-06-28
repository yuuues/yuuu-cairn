# Rediseño Tailwind v4 de la web (@kw/web) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar la SPA React `@kw/web` con **Tailwind CSS v4**, sustituyendo el SCSS, con un sistema de diseño coherente (tipografía serif "Averia Serif Libre" para títulos + "Inter" para UI, base stone, acento ámbar/esmeralda), responsive mobile-first, dark mode por clase `dark` en `<html>`, primitivos UI reutilizables en `src/ui/` y layout en `src/layout/`. **Sin tocar lógica de negocio, props de datos, hooks, llamadas a API, rutas ni claves i18n** — solo marcado y estilos. Tras cada tarea el paquete compila (`typecheck`) y los tests de web siguen verdes.

**Architecture:** `@kw/web` es el adaptador de UI del monorepo hexagonal. Esta fase **no añade ni modifica** datos, hooks (`useSession`, `useCharacters`, `useParties`, `useInventory`, `useGenerators`, `useDiceRoller`), capa `src/api/*` ni `src/realtime/*`. Se introduce una capa de presentación: `src/ui/` (primitivos cva), `src/layout/` (AppShell, Drawer, ThemeToggle), `src/pages/HomePage.tsx` (extracción de `Home` inline de `App.tsx`). El SCSS (`src/styles/*.scss`) se retira al final, reemplazado por `src/index.css` (Tailwind v4 + `@theme`). El `LanguageSelector` conserva su rol accesible `combobox` y sus 5 `option` (los tests lo consultan por `getByRole`).

**Tech Stack:** Node 22, pnpm 11, TypeScript 5, React 18, Vite 5, Tailwind CSS v4 (`@tailwindcss/vite`), `class-variance-authority`, `clsx`, `tailwind-merge`, Vitest + Testing Library (jsdom). Entorno Windows.

> **Nota de paridad:** todos los textos visibles siguen pasando por `useTranslation()`/`t()` con las **mismas claves**. No se añaden ni renombran claves i18n. El dark mode existía en el origen (clase `body.dark-mode`); aquí se reimplementa con la estrategia `class` de Tailwind v4 sobre `<html>`, persistida en `localStorage` y respetando `prefers-color-scheme` en el primer arranque.

---

## Estructura de ficheros (rediseño)

```
packages/web/
├─ package.json                  # + tailwindcss, @tailwindcss/vite, cva, clsx, tailwind-merge
├─ vite.config.ts                # + plugin tailwindcss()
├─ index.html                    # + Google Fonts (Averia Serif Libre, Inter)
└─ src/
   ├─ index.css                  # @import "tailwindcss" + @theme tokens + @custom-variant dark
   ├─ main.tsx                   # importa ./index.css (en vez de ./styles/global.scss)
   ├─ ui/                        # primitivos reutilizables (cva)
   │  ├─ cn.ts                   # clsx + tailwind-merge
   │  ├─ Button.tsx
   │  ├─ Button.test.tsx
   │  ├─ Card.tsx
   │  ├─ Input.tsx
   │  ├─ Textarea.tsx
   │  ├─ Select.tsx
   │  ├─ Field.tsx
   │  ├─ Field.test.tsx
   │  ├─ Badge.tsx
   │  ├─ Modal.tsx
   │  ├─ Modal.test.tsx
   │  ├─ PageHeader.tsx
   │  ├─ Container.tsx
   │  ├─ Spinner.tsx
   │  └─ index.ts                # barrel
   ├─ layout/
   │  ├─ ThemeToggle.tsx
   │  ├─ ThemeToggle.test.tsx
   │  ├─ NavDrawer.tsx
   │  └─ AppShell.tsx
   ├─ pages/
   │  └─ HomePage.tsx            # extracción del Home inline de App.tsx
   ├─ App.tsx                    # usa AppShell envolviendo <Routes>
   └─ (auth|characters|inventory|parties|generators)/…  # restyle con primitivos
```

---

## Task 1: Instalar Tailwind v4 + tokens `@theme` + fuentes + helper `cn`

**Files:**
- Modify: `packages/web/package.json`
- Modify: `packages/web/vite.config.ts`
- Modify: `packages/web/index.html`
- Create: `packages/web/src/index.css`
- Create: `packages/web/src/ui/cn.ts`
- Modify: `packages/web/src/main.tsx`

- [ ] **Step 1: Añadir dependencias a `packages/web/package.json`**

Añade a `dependencies` (orden alfabético): `class-variance-authority`, `clsx`, `tailwind-merge`. Añade a `devDependencies`: `@tailwindcss/vite`, `tailwindcss`. El bloque resultante:

```json
  "dependencies": {
    "@kw/core": "workspace:*",
    "@kw/shared": "workspace:*",
    "@tanstack/react-query": "^5.51.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "i18next": "^23.15.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-i18next": "^14.1.3",
    "react-router-dom": "^6.26.0",
    "socket.io-client": "^4.7.5",
    "tailwind-merge": "^3.6.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.3.1",
    "@testing-library/jest-dom": "^6.4.6",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.4",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^24.1.1",
    "sass": "^1.77.8",
    "tailwindcss": "^4.3.1",
    "vite": "^5.4.2",
    "vitest": "^2.0.5"
  }
```

> `sass` se mantiene por ahora (los `.scss` aún existen hasta la Task 13). Se retira en la limpieza final.

- [ ] **Step 2: Instalar**

Run: `pnpm install`
Expected: instala las nuevas deps y actualiza `pnpm-lock.yaml` sin errores.

- [ ] **Step 3: Añadir el plugin de Tailwind a `packages/web/vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});
```

- [ ] **Step 4: Cargar las fuentes en `packages/web/index.html`**

Reemplaza el `<head>` completo por (añade preconnect + Google Fonts manteniendo charset/viewport/title):

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Averia+Serif+Libre:wght@400;700&family=Inter:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <title>Kettlewright</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Crear `packages/web/src/index.css` con Tailwind v4 + tokens `@theme`**

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-serif: "Averia Serif Libre", ui-serif, Georgia, serif;

  --color-bg: var(--kw-bg);
  --color-surface: var(--kw-surface);
  --color-text: var(--kw-text);
  --color-muted: var(--kw-muted);
  --color-border: var(--kw-border);

  --color-accent: var(--color-amber-600);
  --color-accent-fg: var(--color-white);
  --color-accent-hover: var(--color-amber-700);
  --color-success: var(--color-emerald-600);
  --color-success-hover: var(--color-emerald-700);
  --color-danger: var(--color-rose-600);
  --color-danger-hover: var(--color-rose-700);
  --color-info: var(--color-sky-600);

  --radius-lg: 0.5rem;
}

/* Tokens semánticos light / dark (resueltos por las vars --kw-*) */
:root {
  --kw-bg: var(--color-stone-50);
  --kw-surface: var(--color-white);
  --kw-text: var(--color-stone-800);
  --kw-muted: var(--color-stone-500);
  --kw-border: var(--color-stone-200);
}

.dark {
  --kw-bg: var(--color-stone-950);
  --kw-surface: var(--color-stone-900);
  --kw-text: var(--color-stone-100);
  --kw-muted: var(--color-stone-400);
  --kw-border: var(--color-stone-800);
}

@layer base {
  html {
    font-family: var(--font-sans);
  }
  body {
    margin: 0;
    background-color: var(--color-bg);
    color: var(--color-text);
  }
  h1,
  h2,
  h3 {
    font-family: var(--font-serif);
  }
}
```

- [ ] **Step 6: Crear el helper `packages/web/src/ui/cn.ts`**

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Une clases condicionales y resuelve conflictos de Tailwind. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 7: Cambiar el import de estilos en `packages/web/src/main.tsx`**

Sustituye la línea `import "./styles/global.scss";` por:

```ts
import "./index.css";
```

(No cambies nada más del fichero: providers, router, cookie i18n y `createRoot` se mantienen idénticos.)

- [ ] **Step 8: Typecheck + build**

Run: `pnpm --filter @kw/web typecheck && pnpm --filter @kw/web build`
Expected: sin errores; Vite genera el bundle con Tailwind activo.

- [ ] **Step 9: Tests de web**

Run: `pnpm --filter @kw/web test`
Expected: PASS (4 ficheros: i18n, LanguageSelector, diceRoll, socketClient).

- [ ] **Step 10: Commit**

```bash
git add packages/web/package.json packages/web/vite.config.ts packages/web/index.html packages/web/src/index.css packages/web/src/ui/cn.ts packages/web/src/main.tsx pnpm-lock.yaml
git commit -m "feat(web): setup Tailwind v4 con tokens @theme, fuentes y helper cn"
```

---

## Task 2: Primitivos de formulario — `Button`, `Input`, `Textarea`, `Select`

**Files:**
- Create: `packages/web/src/ui/Button.tsx`
- Create: `packages/web/src/ui/Button.test.tsx`
- Create: `packages/web/src/ui/Input.tsx`
- Create: `packages/web/src/ui/Textarea.tsx`
- Create: `packages/web/src/ui/Select.tsx`

- [ ] **Step 1: Crear `packages/web/src/ui/Button.tsx`**

```tsx
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn.js";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg hover:bg-accent-hover",
        secondary:
          "border border-border bg-surface text-text hover:bg-bg",
        ghost: "text-text hover:bg-border/50",
        danger: "bg-danger text-white hover:bg-danger-hover",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = "Button";
```

- [ ] **Step 2: Crear el test `packages/web/src/ui/Button.test.tsx`**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "./Button.js";

describe("Button", () => {
  it("renderiza con rol button y su texto", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("usa type=button por defecto", () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("dispara onClick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("aplica la variante danger", () => {
    render(<Button variant="danger">Del</Button>);
    expect(screen.getByRole("button").className).toContain("bg-danger");
  });
});
```

- [ ] **Step 3: Crear `packages/web/src/ui/Input.tsx`**

```tsx
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "./cn.js";

export const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(inputClass, className)} {...props} />
  )
);
Input.displayName = "Input";
```

- [ ] **Step 4: Crear `packages/web/src/ui/Textarea.tsx`**

```tsx
import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "./cn.js";
import { inputClass } from "./Input.js";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, rows = 4, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(inputClass, "resize-y", className)}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
```

- [ ] **Step 5: Crear `packages/web/src/ui/Select.tsx`**

```tsx
import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "./cn.js";
import { inputClass } from "./Input.js";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(inputClass, "pr-8", className)} {...props}>
      {children}
    </select>
  )
);
Select.displayName = "Select";
```

- [ ] **Step 6: Typecheck + test**

Run: `pnpm --filter @kw/web typecheck && pnpm --filter @kw/web test`
Expected: PASS, incluyendo los 4 nuevos tests de `Button`.

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/ui/Button.tsx packages/web/src/ui/Button.test.tsx packages/web/src/ui/Input.tsx packages/web/src/ui/Textarea.tsx packages/web/src/ui/Select.tsx
git commit -m "feat(web/ui): primitivos de formulario Button/Input/Textarea/Select"
```

---

## Task 3: Primitivos de estructura — `Card`, `Field`, `Badge`, `PageHeader`, `Container`, `Spinner`

**Files:**
- Create: `packages/web/src/ui/Card.tsx`
- Create: `packages/web/src/ui/Field.tsx`
- Create: `packages/web/src/ui/Field.test.tsx`
- Create: `packages/web/src/ui/Badge.tsx`
- Create: `packages/web/src/ui/PageHeader.tsx`
- Create: `packages/web/src/ui/Container.tsx`
- Create: `packages/web/src/ui/Spinner.tsx`

- [ ] **Step 1: Crear `packages/web/src/ui/Card.tsx`**

```tsx
import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "./cn.js";

export type CardProps = HTMLAttributes<HTMLDivElement>;

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border border-border bg-surface p-6 shadow-sm",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";
```

- [ ] **Step 2: Crear `packages/web/src/ui/Field.tsx`**

`Field` envuelve label + control + error. Genera un `id` si no se pasa, lo asocia al control vía `htmlFor`, y enlaza el mensaje de error con `aria-describedby`. El control se pasa como children (que ya reciba `id`/`aria-*` cuando proceda) o se usa `htmlFor` sobre el `label`.

```tsx
import { useId, type ReactNode } from "react";
import { cn } from "./cn.js";

export interface FieldProps {
  label: ReactNode;
  htmlFor?: string;
  error?: string | null;
  className?: string;
  children: ReactNode;
}

export function Field({
  label,
  htmlFor,
  error,
  className,
  children,
}: FieldProps) {
  const autoId = useId();
  const id = htmlFor ?? autoId;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Crear el test `packages/web/src/ui/Field.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Field } from "./Field.js";
import { Input } from "./Input.js";

describe("Field", () => {
  it("muestra la etiqueta", () => {
    render(
      <Field label="Email" htmlFor="email">
        <Input id="email" />
      </Field>
    );
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("muestra el error con role=alert", () => {
    render(
      <Field label="Email" htmlFor="email" error="Required">
        <Input id="email" />
      </Field>
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
  });
});
```

- [ ] **Step 4: Crear `packages/web/src/ui/Badge.tsx`**

Variantes para tags de objeto (petty/bulky/armor): `neutral` (por defecto), `accent`, `armor`.

```tsx
import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn.js";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-border/60 text-text",
        accent: "bg-accent/15 text-accent",
        armor: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
```

- [ ] **Step 5: Crear `packages/web/src/ui/PageHeader.tsx`**

```tsx
import { type ReactNode } from "react";
import { cn } from "./cn.js";

export interface PageHeaderProps {
  title: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <h1 className="font-serif text-3xl text-text">{title}</h1>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
```

- [ ] **Step 6: Crear `packages/web/src/ui/Container.tsx`**

```tsx
import { type HTMLAttributes } from "react";
import { cn } from "./cn.js";

export type ContainerProps = HTMLAttributes<HTMLDivElement>;

export function Container({ className, ...props }: ContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full max-w-5xl px-4 py-8 sm:px-6", className)}
      {...props}
    />
  );
}
```

- [ ] **Step 7: Crear `packages/web/src/ui/Spinner.tsx`**

```tsx
import { cn } from "./cn.js";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent",
        className
      )}
    />
  );
}
```

- [ ] **Step 8: Typecheck + test**

Run: `pnpm --filter @kw/web typecheck && pnpm --filter @kw/web test`
Expected: PASS, incluyendo los 2 nuevos tests de `Field`.

- [ ] **Step 9: Commit**

```bash
git add packages/web/src/ui/Card.tsx packages/web/src/ui/Field.tsx packages/web/src/ui/Field.test.tsx packages/web/src/ui/Badge.tsx packages/web/src/ui/PageHeader.tsx packages/web/src/ui/Container.tsx packages/web/src/ui/Spinner.tsx
git commit -m "feat(web/ui): primitivos Card/Field/Badge/PageHeader/Container/Spinner"
```

---

## Task 4: `Modal` accesible + barrel `ui/index.ts`

**Files:**
- Create: `packages/web/src/ui/Modal.tsx`
- Create: `packages/web/src/ui/Modal.test.tsx`
- Create: `packages/web/src/ui/index.ts`

- [ ] **Step 1: Crear `packages/web/src/ui/Modal.tsx`**

Diálogo accesible: `role="dialog"` + `aria-modal`, cierre por overlay y por `Escape`, título con `aria-labelledby`.

```tsx
import { useEffect, useId, type ReactNode } from "react";
import { cn } from "./cn.js";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          "max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-surface p-6 shadow-lg",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <h2 id={titleId} className="mb-4 font-serif text-xl text-text">
            {title}
          </h2>
        ) : null}
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Crear el test `packages/web/src/ui/Modal.test.tsx`**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Modal } from "./Modal.js";

describe("Modal", () => {
  it("no renderiza nada cuando open=false", () => {
    render(
      <Modal open={false} onClose={() => {}}>
        body
      </Modal>
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renderiza con role=dialog y título cuando open", () => {
    render(
      <Modal open onClose={() => {}} title="Hello">
        body
      </Modal>
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Hello" })).toBeInTheDocument();
  });

  it("cierra con Escape", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        body
      </Modal>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 3: Crear el barrel `packages/web/src/ui/index.ts`**

```ts
export { cn } from "./cn.js";
export { Button, type ButtonProps } from "./Button.js";
export { Input, inputClass, type InputProps } from "./Input.js";
export { Textarea, type TextareaProps } from "./Textarea.js";
export { Select, type SelectProps } from "./Select.js";
export { Card, type CardProps } from "./Card.js";
export { Field, type FieldProps } from "./Field.js";
export { Badge, type BadgeProps } from "./Badge.js";
export { PageHeader, type PageHeaderProps } from "./PageHeader.js";
export { Container, type ContainerProps } from "./Container.js";
export { Spinner } from "./Spinner.js";
export { Modal, type ModalProps } from "./Modal.js";
```

- [ ] **Step 4: Typecheck + test**

Run: `pnpm --filter @kw/web typecheck && pnpm --filter @kw/web test`
Expected: PASS, incluyendo los 3 nuevos tests de `Modal`.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/ui/Modal.tsx packages/web/src/ui/Modal.test.tsx packages/web/src/ui/index.ts
git commit -m "feat(web/ui): Modal accesible y barrel de primitivos"
```

---

## Task 5: `ThemeToggle` (dark mode por clase en `<html>`)

**Files:**
- Create: `packages/web/src/layout/ThemeToggle.tsx`
- Create: `packages/web/src/layout/ThemeToggle.test.tsx`

- [ ] **Step 1: Crear `packages/web/src/layout/ThemeToggle.tsx`**

Alterna la clase `dark` en `<html>`, persiste en `localStorage` (`kw_theme`) y respeta `prefers-color-scheme` en el primer arranque. Usa `t()` para el `aria-label`.

```tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/index.js";

function getInitialDark(): boolean {
  const stored = localStorage.getItem("kw_theme");
  if (stored === "dark") return true;
  if (stored === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeToggle() {
  const { t } = useTranslation();
  const [dark, setDark] = useState<boolean>(getInitialDark);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    localStorage.setItem("kw_theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={t("Toggle theme")}
      onClick={() => setDark((d) => !d)}
    >
      {dark ? "☀" : "☾"}
    </Button>
  );
}
```

> **Nota i18n:** `"Toggle theme"` puede no existir como clave; `t()` devuelve la propia cadena como fallback (comportamiento por defecto de i18next). No se añade a los catálogos en esta fase para no tocar i18n; si se desea traducir, se hace en un cambio i18n separado.

- [ ] **Step 2: Crear el test `packages/web/src/layout/ThemeToggle.test.tsx`**

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/i18n.js";
import { ThemeToggle } from "./ThemeToggle.js";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

function renderToggle() {
  return render(
    <I18nextProvider i18n={i18n}>
      <ThemeToggle />
    </I18nextProvider>
  );
}

describe("ThemeToggle", () => {
  it("renderiza un botón accesible", () => {
    renderToggle();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("alterna la clase dark en <html> y persiste en localStorage", () => {
    renderToggle();
    const initiallyDark = document.documentElement.classList.contains("dark");
    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement.classList.contains("dark")).toBe(
      !initiallyDark
    );
    expect(localStorage.getItem("kw_theme")).toBe(
      !initiallyDark ? "dark" : "light"
    );
  });
});
```

> `window.matchMedia` no existe en jsdom por defecto; añadimos un stub en `test-setup.ts` en el siguiente step para que `getInitialDark` no falle.

- [ ] **Step 3: Añadir stub de `matchMedia` a `packages/web/src/test-setup.ts`**

```ts
import "@testing-library/jest-dom";

// jsdom no implementa matchMedia; stub mínimo para componentes que lo consultan.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
```

- [ ] **Step 4: Typecheck + test**

Run: `pnpm --filter @kw/web typecheck && pnpm --filter @kw/web test`
Expected: PASS, incluyendo los 2 nuevos tests de `ThemeToggle`.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/layout/ThemeToggle.tsx packages/web/src/layout/ThemeToggle.test.tsx packages/web/src/test-setup.ts
git commit -m "feat(web/layout): ThemeToggle con dark mode por clase y persistencia"
```

---

## Task 6: `NavDrawer` + `AppShell` (barra sticky + drawer responsive)

**Files:**
- Create: `packages/web/src/layout/NavDrawer.tsx`
- Create: `packages/web/src/layout/AppShell.tsx`

- [ ] **Step 1: Crear `packages/web/src/layout/NavDrawer.tsx`**

Drawer lateral accesible (`role="dialog"` + `aria-modal`) para móvil; recibe los enlaces ya renderizados como children y un `onClose`.

```tsx
import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../ui/index.js";

export interface NavDrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function NavDrawer({ open, onClose, children }: NavDrawerProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <nav
        role="dialog"
        aria-modal="true"
        aria-label={t("Menu")}
        className={cn(
          "absolute right-0 top-0 flex h-full w-72 max-w-[80%] flex-col gap-4 border-l border-border bg-surface p-6 shadow-lg"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </nav>
    </div>
  );
}
```

- [ ] **Step 2: Crear `packages/web/src/layout/AppShell.tsx`**

Barra superior sticky con logo, enlaces (Characters/Parties), cuenta/login, `LanguageSelector` y `ThemeToggle`. En `< md` los enlaces se ocultan tras un botón hamburguesa que abre `NavDrawer`. Conserva los textos vía `t()` y el `LanguageSelector` intacto. **No cambia la lógica de sesión** (`useSession`).

```tsx
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSession } from "../auth/useSession.js";
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
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
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
```

> El `LanguageSelector` se renderiza una vez en desktop y una vez dentro del drawer (móvil). Solo uno es visible a la vez (drawer cerrado por defecto), por lo que los tests existentes que lo renderizan en aislamiento no se ven afectados; y dentro de `AppShell` no hay test que cuente combobox duplicados.

- [ ] **Step 3: Typecheck + test**

Run: `pnpm --filter @kw/web typecheck && pnpm --filter @kw/web test`
Expected: PASS (sin tests nuevos; compila el layout).

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/layout/NavDrawer.tsx packages/web/src/layout/AppShell.tsx
git commit -m "feat(web/layout): AppShell sticky con drawer responsive"
```

---

## Task 7: `HomePage` + refactor de `App.tsx` para usar `AppShell`

**Files:**
- Create: `packages/web/src/pages/HomePage.tsx`
- Modify: `packages/web/src/App.tsx`

- [ ] **Step 1: Crear `packages/web/src/pages/HomePage.tsx`**

Extrae el `Home` inline conservando la lógica (`useSession`) y las claves i18n; lo reestiliza con primitivos.

```tsx
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSession } from "../auth/useSession.js";
import { Container, Button } from "../ui/index.js";

export function HomePage() {
  const { data: user } = useSession();
  const { t } = useTranslation();

  return (
    <Container className="max-w-3xl text-center">
      <h1 className="mb-4 font-serif text-5xl text-text">Kettlewright</h1>
      <p className="mb-8 text-muted">{t("Manage your Cairn characters and parties")}</p>
      <div className="flex flex-wrap justify-center gap-3">
        {user ? (
          <>
            <Link to="/characters">
              <Button>{t("Characters")}</Button>
            </Link>
            <Link to="/parties">
              <Button variant="secondary">{t("Parties")}</Button>
            </Link>
            <Link to="/account">
              <Button variant="ghost">{t("Account")}</Button>
            </Link>
          </>
        ) : (
          <>
            <Link to="/login">
              <Button>{t("Login")}</Button>
            </Link>
            <Link to="/signup">
              <Button variant="secondary">{t("Sign Up")}</Button>
            </Link>
          </>
        )}
      </div>
    </Container>
  );
}
```

> `"Manage your Cairn characters and parties"` usa `t()` con fallback a la propia cadena si la clave no existe (no se altera el catálogo i18n). El origen no mostraba subtítulo aquí; es texto de presentación opcional que pasa por `t()`.

- [ ] **Step 2: Reescribir `packages/web/src/App.tsx`**

Elimina `Nav`/`Home` inline; envuelve las `Routes` en `AppShell`; usa `HomePage`. **Las rutas y los elementos de ruta no cambian.**

```tsx
import { Route, Routes } from "react-router-dom";
import { AppShell } from "./layout/AppShell.js";
import { HomePage } from "./pages/HomePage.js";
import { LoginPage } from "./auth/LoginPage.js";
import { SignupPage } from "./auth/SignupPage.js";
import { ResendConfirmationPage } from "./auth/ResendConfirmationPage.js";
import { RequestPasswordResetPage } from "./auth/RequestPasswordResetPage.js";
import { ResetPasswordPage } from "./auth/ResetPasswordPage.js";
import { AccountPage } from "./auth/AccountPage.js";
import { ChangePasswordPage } from "./auth/ChangePasswordPage.js";
import { ChangeEmailPage } from "./auth/ChangeEmailPage.js";
import { DeleteAccountPage } from "./auth/DeleteAccountPage.js";
import { CharacterListPage } from "./characters/CharacterListPage.js";
import { CharacterViewPage } from "./characters/CharacterViewPage.js";
import { CharacterEditPage } from "./characters/CharacterEditPage.js";
import { CharacterCreatePage } from "./characters/create/CharacterCreatePage.js";
import { ImportCharacterPage } from "./characters/ImportCharacterPage.js";
import { PrintCharacterPage } from "./characters/PrintCharacterPage.js";
import { InventoryEditorPage } from "./inventory/InventoryEditorPage.js";
import { PartyListPage } from "./parties/PartyListPage.js";
import { PartyCreatePage } from "./parties/PartyCreatePage.js";
import { PartyViewPage } from "./parties/PartyViewPage.js";
import { PartyEditPage } from "./parties/PartyEditPage.js";
import { JoinPartyPage } from "./parties/JoinPartyPage.js";
import { ToolsPage } from "./generators/ToolsPage.js";

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/resend-confirmation" element={<ResendConfirmationPage />} />
        <Route path="/reset-request" element={<RequestPasswordResetPage />} />
        <Route path="/reset" element={<ResetPasswordPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/account/change-password" element={<ChangePasswordPage />} />
        <Route path="/account/change-email" element={<ChangeEmailPage />} />
        <Route path="/account/delete" element={<DeleteAccountPage />} />
        <Route path="/characters" element={<CharacterListPage />} />
        <Route path="/characters/new" element={<CharacterCreatePage />} />
        <Route path="/characters/import" element={<ImportCharacterPage />} />
        <Route path="/characters/:id" element={<CharacterViewPage />} />
        <Route path="/characters/:id/edit" element={<CharacterEditPage />} />
        <Route
          path="/characters/:id/inventory"
          element={<InventoryEditorPage />}
        />
        <Route path="/characters/:id/print" element={<PrintCharacterPage />} />
        <Route path="/parties" element={<PartyListPage />} />
        <Route path="/parties/new" element={<PartyCreatePage />} />
        <Route path="/parties/join" element={<JoinPartyPage />} />
        <Route path="/parties/:id" element={<PartyViewPage />} />
        <Route path="/parties/:id/edit" element={<PartyEditPage />} />
        <Route path="/tools" element={<ToolsPage />} />
      </Routes>
    </AppShell>
  );
}
```

- [ ] **Step 3: Typecheck + build + test**

Run: `pnpm --filter @kw/web typecheck && pnpm --filter @kw/web build && pnpm --filter @kw/web test`
Expected: PASS; el árbol de rutas idéntico, ahora bajo `AppShell`.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/pages/HomePage.tsx packages/web/src/App.tsx
git commit -m "feat(web/layout): HomePage extraída y App.tsx envuelto en AppShell"
```

---

## Task 8: Restyle de Auth (9 páginas) con `Card`/`Field`/`Button`

**Files:**
- Modify: `packages/web/src/auth/LoginPage.tsx`
- Modify: `packages/web/src/auth/SignupPage.tsx`
- Modify: `packages/web/src/auth/ResendConfirmationPage.tsx`
- Modify: `packages/web/src/auth/RequestPasswordResetPage.tsx`
- Modify: `packages/web/src/auth/ResetPasswordPage.tsx`
- Modify: `packages/web/src/auth/AccountPage.tsx`
- Modify: `packages/web/src/auth/ChangePasswordPage.tsx`
- Modify: `packages/web/src/auth/ChangeEmailPage.tsx`
- Modify: `packages/web/src/auth/DeleteAccountPage.tsx`

> **Regla transversal de esta task:** solo cambia el marcado/clases. **No tocar** `useState`, handlers (`onSubmit`), mutaciones (`useLogin`, `authApi`, …), `navigate`, ni las claves `t(...)`. Mantener los `role="alert"` existentes.

- [ ] **Step 1: Reescribir `packages/web/src/auth/LoginPage.tsx`** (patrón de referencia para auth)

```tsx
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ApiError } from "../api/auth.js";
import { useLogin } from "./useSession.js";
import { Card, Field, Input, Button } from "../ui/index.js";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const login = useLogin();
  const navigate = useNavigate();
  const { t } = useTranslation();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login.mutateAsync({ email, password, rememberMe: false });
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-md items-center px-4">
      <Card className="w-full">
        <h1 className="mb-6 font-serif text-2xl text-text">{t("Login")}</h1>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Field label={t("Email")} htmlFor="login-email">
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label={t("Password")} htmlFor="login-password">
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          <Button type="submit" disabled={login.isPending}>
            {t("Login")}
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted">
          <Link to="/signup" className="text-accent hover:underline">
            {t("Sign Up")}
          </Link>{" "}
          ·{" "}
          <Link to="/reset-request" className="text-accent hover:underline">
            Forgot password?
          </Link>
        </p>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Aplicar el mismo patrón a las 8 páginas restantes de auth**

Para cada página: envolver el contenido en el wrapper centrado (`<div className="mx-auto … max-w-md …"><Card>…</Card></div>` para formularios; para `AccountPage` usar `Container` + `Card`), sustituir `<input>`→`<Input>` dentro de `<Field label={t(...)}>`, `<button>`→`<Button>` (usar `variant="danger"` en `DeleteAccountPage`), `<h1>`→`<h1 className="mb-6 font-serif text-2xl text-text">`. **Conservar todos los `t(...)`, handlers, estados y los `role="alert"`/`role` existentes.** Enlaces con `className="text-accent hover:underline"`.

Ejemplo `AccountPage` (estructura objetivo, sin cambiar lógica):

```tsx
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSession, useLogout } from "./useSession.js";
import { Container, Card, Button } from "../ui/index.js";

export function AccountPage() {
  const { data: user, isLoading } = useSession();
  const logout = useLogout();
  const { t } = useTranslation();

  if (isLoading) return <Container><p className="text-muted">Loading...</p></Container>;
  if (!user)
    return (
      <Container>
        <p className="text-muted">
          You are not logged in.{" "}
          <Link to="/login" className="text-accent hover:underline">
            {t("Login")}
          </Link>
        </p>
      </Container>
    );

  return (
    <Container className="max-w-2xl">
      <h1 className="mb-6 font-serif text-3xl text-text">{t("Account")}</h1>
      <Card className="flex flex-col gap-2">
        <p className="text-text">Username: {user.username}</p>
        <p className="text-text">{t("Email")}: {user.email}</p>
        <ul className="mt-2 flex flex-col gap-1">
          <li><Link to="/account/change-password" className="text-accent hover:underline">Change password</Link></li>
          <li><Link to="/account/change-email" className="text-accent hover:underline">Change email</Link></li>
          <li><Link to="/account/delete" className="text-accent hover:underline">Delete account</Link></li>
        </ul>
      </Card>
      <Button variant="secondary" className="mt-6" onClick={() => logout.mutate()}>
        {t("Logout")}
      </Button>
    </Container>
  );
}
```

- [ ] **Step 3: Typecheck + test**

Run: `pnpm --filter @kw/web typecheck && pnpm --filter @kw/web test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/auth
git commit -m "feat(web/auth): restyle de páginas de auth con primitivos UI"
```

---

## Task 9: Restyle de Characters (lista, vista, edición, creación, import)

**Files:**
- Modify: `packages/web/src/characters/CharacterListPage.tsx`
- Modify: `packages/web/src/characters/CharacterViewPage.tsx`
- Modify: `packages/web/src/characters/CharacterEditPage.tsx`
- Modify: `packages/web/src/characters/create/CharacterCreatePage.tsx`
- Modify: `packages/web/src/characters/ImportCharacterPage.tsx`

> Solo marcado/clases. Conservar hooks (`useCharacters`, `useCharacter`, `useDeleteCharacter`, `useUpdateCharacter`, `useBackgrounds`, `useRollCharacter`, `useCreateCharacter`, `useImportCharacter`), `t(...)`, los `aria-label` de borrado y los `role="alert"`.

- [ ] **Step 1: Reescribir `packages/web/src/characters/CharacterListPage.tsx`** (grid de tarjetas)

```tsx
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCharacters, useDeleteCharacter } from "./useCharacters.js";
import { Container, PageHeader, Card, Button, Spinner } from "../ui/index.js";

export function CharacterListPage() {
  const { t } = useTranslation();
  const { data: characters, isLoading, error } = useCharacters();
  const del = useDeleteCharacter();

  if (isLoading)
    return (
      <Container>
        <Spinner />
      </Container>
    );
  if (error)
    return (
      <Container>
        <p className="text-danger">Failed to load characters.</p>
      </Container>
    );

  return (
    <Container>
      <PageHeader
        title={t("Characters")}
        actions={
          <Link to="/characters/new">
            <Button>+ {t("Create Character")}</Button>
          </Link>
        }
      />
      {characters && characters.length === 0 ? (
        <p className="text-muted">No characters yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {characters?.map((c) => (
            <Card key={c.id} className="flex flex-col gap-3">
              <div>
                <Link
                  to={`/characters/${c.id}`}
                  className="font-serif text-lg text-text hover:text-accent"
                >
                  {c.name}
                </Link>
                <p className="text-sm text-muted">{c.background}</p>
              </div>
              <Button
                variant="danger"
                size="sm"
                className="self-start"
                onClick={() => del.mutate(c.id)}
                disabled={del.isPending}
                aria-label={`${t("Delete")} ${c.name}`}
              >
                {t("Delete")}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}
```

- [ ] **Step 2: Reescribir `CharacterViewPage.tsx`** (hoja en grid)

Envolver en `Container`, título con `PageHeader` (acciones: enlaces Back/Edit/Inventory como `Button variant="ghost"`/`secondary`), atributos en `Card` con grid `grid-cols-2 sm:grid-cols-3`, secciones (Bonds/Omens/Traits/Inventory) en `Card`. Mantener `whiteSpace: "pre-wrap"` (puede pasar a `className="whitespace-pre-wrap"`). Tags de items con `<Badge>`.

- [ ] **Step 3: Reescribir `CharacterEditPage.tsx`**

Form en `Card` dentro de `Container`; cada control en `<Field label={t(...)}>` con `Input`/`Textarea`; números con `Input type="number"`. Botones guardar/cancelar con `Button`. **No tocar** `form`/`setForm`/`useEffect`/`update`.

- [ ] **Step 4: Reescribir `create/CharacterCreatePage.tsx`** (wizard con stepper)

Mantener la máquina de estados `step` (`"background" | "review"`) y todos los handlers (`rollWith`, `startManual`, `onSave`, `setField`). Añadir un stepper visual responsive (2 pasos) y envolver cada paso en `Card`/`Container`; `select`→`Select`, `input`→`Input` en `Field`, botones→`Button`. Conservar `role="alert"` del error de guardado y todas las claves `t(...)`.

```tsx
// Cabecera del stepper (insertar dentro del Container, antes del contenido del paso):
<ol className="mb-6 flex items-center gap-4 text-sm">
  <li className={step === "background" ? "font-semibold text-accent" : "text-muted"}>
    1. {t("Background")}
  </li>
  <li aria-hidden className="text-muted">→</li>
  <li className={step === "review" ? "font-semibold text-accent" : "text-muted"}>
    2. {t("Review")}
  </li>
</ol>
```

> `t("Review")` usa fallback si la clave no existe; no se altera el catálogo. El resto del cuerpo del paso `review` (atributos, gear, bonds/omens, botones) se reestiliza con `Field`/`Input`/`Badge`/`Button` sin cambiar la lógica.

- [ ] **Step 5: Reescribir `ImportCharacterPage.tsx`**

Form en `Card`/`Container`; input file estilizado; mensajes de éxito/error con clases `text-success`/`text-danger`; conservar `fileRef`, `handleSubmit`, `importMutation`, `setError`/`setSuccess` y `t(...)`.

- [ ] **Step 6: Typecheck + test**

Run: `pnpm --filter @kw/web typecheck && pnpm --filter @kw/web test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/characters
git commit -m "feat(web/characters): restyle de lista, vista, edición, creación e import"
```

---

## Task 10: Restyle de Inventory (editor, contenedores, marketplace)

**Files:**
- Modify: `packages/web/src/inventory/InventoryEditorPage.tsx`
- Modify: `packages/web/src/inventory/ContainerView.tsx`
- Modify: `packages/web/src/inventory/MarketplaceModal.tsx`

> Conservar `armorValue`/`occupiedMainSlots`/`containerSlots`/`isContainerFull` de `@kw/core`, todos los hooks (`useCharacter`, `useUpdateInventory`, `useMarketCatalog`, `useBuyItems`), estados, props (`onDeleteItem`, `characterId`, `initialGold`, `containerId`, `onClose`) y `t(...)`.

- [ ] **Step 1: Reescribir `InventoryEditorPage.tsx`**

`Container` + `PageHeader` (acción Back como `Button variant="ghost"`); resumen (Gold/Armor/Main slots) en `Card` con `Input type="number"` para el oro dentro de `<Field>`; botones Marketplace/Save con `Button`. Conservar el render condicional de `MarketplaceModal` y el mapeo de `containers` a `ContainerView`.

- [ ] **Step 2: Reescribir `ContainerView.tsx`** (slots/tags visuales; tabla en desktop, tarjetas en móvil)

```tsx
import { useTranslation } from "react-i18next";
import type { Item, Container } from "@kw/shared";
import { containerSlots, isContainerFull } from "@kw/core";
import { Card, Badge, Button } from "../ui/index.js";

interface ContainerViewProps {
  container: Container;
  items: Item[];
  containers: Container[];
  onDeleteItem: (itemId: number) => void;
}

export function ContainerView({
  container,
  items,
  containers,
  onDeleteItem,
}: ContainerViewProps) {
  const { t } = useTranslation();
  const used = containerSlots(items, container.id);
  const full = isContainerFull(items, containers, container.id);
  const containerItems = items.filter((it) => it.location === container.id);

  return (
    <Card className={full ? "mt-4 border-danger/50" : "mt-4"}>
      <h3 className="mb-3 font-serif text-lg text-text">
        {container.name}{" "}
        <span className={full ? "text-danger" : "text-muted"}>
          ({used}/{container.slots} {t("Slots")})
        </span>
      </h3>
      <ul className="flex flex-col divide-y divide-border">
        {containerItems.map((it) => (
          <li
            key={it.id}
            className="flex items-center justify-between gap-2 py-2"
          >
            <span className="flex flex-wrap items-center gap-2 text-text">
              {it.name}
              {it.tags.map((tag) => (
                <Badge key={tag}>{t(tag)}</Badge>
              ))}
            </span>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`${t("Delete")} ${it.name}`}
              onClick={() => onDeleteItem(it.id)}
            >
              ×
            </Button>
          </li>
        ))}
        {containerItems.length === 0 && (
          <li className="py-2 text-muted">—</li>
        )}
      </ul>
    </Card>
  );
}
```

> Se añade un `aria-label` al botón de borrado por accesibilidad; el botón sigue mostrando `×` y llamando a `onDeleteItem(it.id)` igual que antes (no es una clave i18n nueva, usa `t("Delete")` ya existente).

- [ ] **Step 3: Reescribir `MarketplaceModal.tsx`** usando `Modal`

Sustituir el overlay/markup propio por `<Modal open onClose={onClose} title={t("Marketplace")}>`; listado de items con `Input type="number"` para cantidades, resumen de oro restante con `text-danger` cuando sea negativo, botón comprar con `Button` (deshabilitado si saldo insuficiente, **manteniendo la condición existente**). Conservar `quantities`/`setQuantities`, `spent`/`remainingGold`, `useMarketCatalog`, `useBuyItems`, `error`/`setError` y `t(...)`.

- [ ] **Step 4: Typecheck + test**

Run: `pnpm --filter @kw/web typecheck && pnpm --filter @kw/web test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/inventory
git commit -m "feat(web/inventory): restyle de editor, contenedores y marketplace"
```

---

## Task 11: Restyle de Parties (lista, crear, ver, editar, unir)

**Files:**
- Modify: `packages/web/src/parties/PartyListPage.tsx`
- Modify: `packages/web/src/parties/PartyCreatePage.tsx`
- Modify: `packages/web/src/parties/PartyViewPage.tsx`
- Modify: `packages/web/src/parties/PartyEditPage.tsx`
- Modify: `packages/web/src/parties/JoinPartyPage.tsx`

> Conservar hooks (`useParties`, `useDeleteParty`, `useCreateParty`, `useParty`, `useUpdateParty`, `useRemoveMember`, `useJoinParty`, `useSession`, `useCharacters`, `useDiceRoller`), el render de `DiceModal` (de `../realtime/DiceModal.js`) con sus props, estados, `navigate` y `t(...)`.

- [ ] **Step 1: Reescribir `PartyListPage.tsx`** (grid de tarjetas, espejo de CharacterListPage)

`Container` + `PageHeader` con acciones (Create Party / Join Party como `Button` y `Button variant="secondary"`); tarjetas `Card` con nombre (enlace serif), descripción (`text-muted`) y borrado `Button variant="danger" size="sm"` conservando el `aria-label={`${t("Delete")} ${p.name}`}`.

- [ ] **Step 2: Reescribir `PartyCreatePage.tsx`**

Form en `Card`/`Container`; `Field` con `Input` (name) y `Textarea` (description); botón crear `Button`. No tocar `name`/`description`/`handleSubmit`/`create`.

- [ ] **Step 3: Reescribir `PartyViewPage.tsx`**

`Container` + `PageHeader`; bloque de info y miembros en `Card`; sección de tiradas en vivo (`notifications`) en `Card` con lista; botón de abrir dados con `Button`; **mantener** `<DiceModal …>` con todas sus props (`open`/`onClose`/`onRoll`/`lastResult`/`characterId`/`partyId`) y el estado `diceOpen`. Mostrar `joinCode` en un bloque destacado (`Badge` o `Card`). Conservar `isOwner` y los enlaces de edición.

- [ ] **Step 4: Reescribir `PartyEditPage.tsx`**

Form en `Card`/`Container` con `Field`/`Input`/`Textarea`; lista de miembros con botón `Button variant="danger" size="sm"` para `removeMember` (conservando handlers); botón borrar partida `Button variant="danger"`. No tocar `name`/`description`/`update`/`del`/`removeMember`/`isOwner`.

- [ ] **Step 5: Reescribir `JoinPartyPage.tsx`**

Form en `Card`/`Container`; `Field` para Party Code (`Input`, mantener `toUpperCase()` en el onChange) y para Character (`Select`); botón unir `Button`. Conservar `joinCode`/`characterId`/`handleSubmit`/`join` y `t(...)`.

- [ ] **Step 6: Typecheck + test**

Run: `pnpm --filter @kw/web typecheck && pnpm --filter @kw/web test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/parties
git commit -m "feat(web/parties): restyle de lista, crear, ver, editar y unir"
```

---

## Task 12: Restyle de Generators/Tools (tabs, tablas, NPC gen, dados)

**Files:**
- Modify: `packages/web/src/generators/ToolsPage.tsx`
- Modify: `packages/web/src/generators/GeneratorTablePanel.tsx`
- Modify: `packages/web/src/generators/NpcGeneratorPanel.tsx`
- Modify: `packages/web/src/generators/DiceModal.tsx`
- Modify: `packages/web/src/realtime/DiceModal.tsx`

> Conservar `useGeneratorTables`/`useRollTable`/`useGenerateNpc` y, en los DiceModal, las props (`characterId`, `partyId`, `onRoll`, `lastResult`, `isOpen`/`open`, `onClose`) y `DICE_TYPES`. Mantener `role="tab"`/`role="tablist"`/`role="tabpanel"` y `aria-selected` existentes en `ToolsPage`.

- [ ] **Step 1: Reescribir `ToolsPage.tsx`** (tabs estilizadas, conservando roles ARIA)

```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { GeneratorTablePanel } from "./GeneratorTablePanel.js";
import { NpcGeneratorPanel } from "./NpcGeneratorPanel.js";
import { Container, Card, cn } from "../ui/index.js";

type Tab = "tables" | "pcgen";

export function ToolsPage() {
  const [tab, setTab] = useState<Tab>("tables");
  const { t } = useTranslation();

  const tabClass = (active: boolean) =>
    cn(
      "rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium",
      active
        ? "border-accent text-accent"
        : "border-transparent text-muted hover:text-text"
    );

  return (
    <Container className="max-w-3xl">
      <h2 className="mb-4 font-serif text-3xl text-text">{t("Tools")}</h2>
      <div role="tablist" className="flex gap-2 border-b border-border">
        <button
          role="tab"
          aria-selected={tab === "tables"}
          onClick={() => setTab("tables")}
          className={tabClass(tab === "tables")}
        >
          Tables
        </button>
        <button
          role="tab"
          aria-selected={tab === "pcgen"}
          onClick={() => setTab("pcgen")}
          className={tabClass(tab === "pcgen")}
        >
          {t("Generators")}
        </button>
      </div>
      <Card className="mt-4">
        <div hidden={tab !== "tables"} role="tabpanel">
          <GeneratorTablePanel />
        </div>
        <div hidden={tab !== "pcgen"} role="tabpanel">
          <NpcGeneratorPanel />
        </div>
      </Card>
    </Container>
  );
}
```

- [ ] **Step 2: Reescribir `GeneratorTablePanel.tsx`**

`Select` para categoría/subcategoría dentro de `Field`; botón roll `Button`; resultado en bloque `Card`/`text-border`→`rounded-lg border`. Conservar `category`/`subcategory`/`result`, `useGeneratorTables`/`useRollTable`, `getSubcategories`, handlers y `t(...)`.

- [ ] **Step 3: Reescribir `NpcGeneratorPanel.tsx`**

`NpcCard` con `Card` (sustituye `div.text-border`); botón generar `Button`. Conservar `useGenerateNpc`, el tipo `NpcResult`, los campos mostrados y `t(...)`.

- [ ] **Step 4: Reescribir `generators/DiceModal.tsx` y `realtime/DiceModal.tsx`** usando `Modal`

Sustituir el overlay/markup propio por `<Modal open={isOpen} onClose={onClose} title={t("Roll Dice")}>` (o el título ya usado); selector de cara (`Select` con `DICE_TYPES`) y cantidad (`Input type="number"`) dentro de `Field`; botón tirar `Button` que llama a `handleRoll`/`onRoll(`${count}d${face}`)`; mostrar `lastResult`. **Conservar exactamente** las props del componente, `DICE_TYPES`, el formato `"${count}d${face}"` y `t(...)`.

> Nota: `generators/DiceModal.tsx` usa `isOpen`; `realtime/DiceModal.tsx` puede usar otra prop — respetar la firma existente de cada uno (no unificar props, solo reestilar el cuerpo).

- [ ] **Step 5: Typecheck + test**

Run: `pnpm --filter @kw/web typecheck && pnpm --filter @kw/web test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/generators packages/web/src/realtime/DiceModal.tsx
git commit -m "feat(web/generators): restyle de tools, tablas, NPC gen y dados"
```

---

## Task 13: `PrintCharacterPage` con `print:` + retirada del SCSS

**Files:**
- Modify: `packages/web/src/characters/PrintCharacterPage.tsx`
- Delete: `packages/web/src/styles/global.scss`
- Delete: `packages/web/src/styles/variables.scss`
- Delete: `packages/web/src/styles/character.module.scss`
- Delete: `packages/web/src/styles/inventory.module.scss`
- Delete: `packages/web/src/styles/party.module.scss`
- Modify: `packages/web/package.json`

- [ ] **Step 1: Comprobar referencias a SCSS antes de borrar**

Run: `pnpm exec grep -rn "styles/" packages/web/src || true`
Expected: la única referencia debe ser la ya migrada en `main.tsx` (que ahora importa `./index.css`). Si alguna página importa un `*.module.scss`, migrar esas clases a utilidades Tailwind en su Task de área antes de borrar. (Por la inspección actual, las páginas usan clases globales, no imports de módulos; confirmar aquí.)

- [ ] **Step 2: Reescribir `PrintCharacterPage.tsx` con utilidades + variantes `print:`**

Mantener los datos (`useCharacter`) y `t(...)`. Layout pensado para impresión: fondo blanco forzado, ocultar acciones en impresión.

```tsx
// Estructura objetivo (conservar la lógica de carga existente):
// - Contenedor raíz: className="mx-auto max-w-3xl bg-white p-8 text-black print:p-0"
// - Botón "Imprimir" / acciones: className="print:hidden"
// - Secciones de la hoja con borders sutiles que se mantienen en print.
```

Sustituir cualquier clase SCSS (`.sheet`, `.card`, etc.) por utilidades Tailwind equivalentes. Botón de imprimir con `Button className="print:hidden"`.

- [ ] **Step 3: Borrar los ficheros SCSS**

Run:
```bash
git rm packages/web/src/styles/global.scss packages/web/src/styles/variables.scss packages/web/src/styles/character.module.scss packages/web/src/styles/inventory.module.scss packages/web/src/styles/party.module.scss
```

- [ ] **Step 4: Quitar `sass` de `packages/web/package.json`**

Eliminar la línea `"sass": "^1.77.8",` de `devDependencies`.

- [ ] **Step 5: Reinstalar**

Run: `pnpm install`
Expected: actualiza `pnpm-lock.yaml` sin `sass`.

- [ ] **Step 6: Verificar que no quedan referencias a SCSS**

Run: `pnpm exec grep -rn "\.scss" packages/web/src packages/web/index.html || echo "OK sin scss"`
Expected: `OK sin scss`.

- [ ] **Step 7: Typecheck + build + test**

Run: `pnpm --filter @kw/web typecheck && pnpm --filter @kw/web build && pnpm --filter @kw/web test`
Expected: PASS; build sin `sass`.

- [ ] **Step 8: Commit**

```bash
git add packages/web/src/characters/PrintCharacterPage.tsx packages/web/package.json pnpm-lock.yaml
git commit -m "feat(web): print con variantes print: y retirada del SCSS"
```

---

## Task 14: Verificación final del monorepo

**Files:** (ninguno nuevo; verificación)

- [ ] **Step 1: Lint visual de coherencia**

Run: `pnpm exec grep -rn "className=\"navbar\|body-container\|sheet\|auth-card\|grid-columns-2" packages/web/src || echo "OK sin clases SCSS legacy"`
Expected: `OK sin clases SCSS legacy` (o solo coincidencias justificadas en `PrintCharacterPage` ya migradas).

- [ ] **Step 2: Typecheck global**

Run: `pnpm typecheck`
Expected: sin errores en ningún paquete.

- [ ] **Step 3: Tests del monorepo completo**

Run: `pnpm test`
Expected: PASS — incluidos los tests de web (i18n, LanguageSelector, diceRoll, socketClient) y los nuevos de UI/layout (Button, Field, Modal, ThemeToggle), más el resto de paquetes (235+ tests).

- [ ] **Step 4: Build de web**

Run: `pnpm --filter @kw/web build`
Expected: bundle generado con Tailwind, sin warnings de SCSS.

- [ ] **Step 5: Commit (si hubiera ajustes) o tag de cierre**

```bash
git add -A
git commit -m "chore(web): verificación final del rediseño Tailwind" --allow-empty
```

---

## Self-Review (cobertura del spec)

- **Setup Tailwind v4 + tokens `@theme` + fuentes + `cn`/cva** → Task 1 (`@tailwindcss/vite`, `index.css` con `@theme` y `@custom-variant dark`, Google Fonts, `cn.ts`).
- **Primitivos UI en `src/ui/` con micro-tests** → Tasks 2–4 (`Button`+test, `Input`, `Textarea`, `Select`, `Card`, `Field`+test, `Badge`, `PageHeader`, `Container`, `Spinner`, `Modal`+test, barrel).
- **Layout AppShell + ThemeToggle + drawer responsive + refactor App.tsx** → Tasks 5–7 (`ThemeToggle`+test, `NavDrawer`, `AppShell`, `HomePage`, `App.tsx` envuelto en `AppShell`).
- **Restyle por áreas reutilizando primitivos** → Task 8 (auth), Task 9 (characters), Task 10 (inventory), Task 11 (parties), Task 12 (generators), Task 7 (home), Task 13 (print).
- **Retirada del SCSS sustituido** → Task 13 (borra los 5 `.scss` y `sass`).
- **Verificación final** → Task 14 (`pnpm typecheck`, `pnpm test`, `build`).

**Restricciones DURAS cumplidas:**
1. **Sin cambios de lógica/datos/hooks/API/rutas/claves i18n:** cada Task de restyle lista explícitamente "conservar hooks/handlers/estados/t(...)"; el array de `<Route>` en Task 7 es idéntico al original. Los únicos textos nuevos (`Toggle theme`, `Menu`, `Review`, subtítulo de Home) pasan por `t()` con **fallback a la propia cadena** y **no** se añaden al catálogo (no se toca i18n).
2. **`useTranslation()`/`t()` en todos los textos visibles:** preservado en todas las páginas reestilizadas.
3. **Roles accesibles intactos:** `LanguageSelector` no se modifica (sigue `combobox` + 5 `option`, consumido por `getByRole`); se añaden roles (`dialog`, `tablist`/`tab`/`tabpanel` ya existían en Tools) sin retirar ninguno.
4. **Compila + tests verdes tras cada Task:** cada Task termina con `Run: typecheck && test` (y `build` donde aplica).
5. **Tailwind v4 con `@tailwindcss/vite` + tokens en `@theme` dentro de `src/index.css`; dark por clase `dark` en `<html>`:** Task 1 + Task 5.
6. **Estética serif/Inter, base stone, acento ámbar/esmeralda, responsive mobile-first, dark mode:** tokens en Task 1, primitivos en Tasks 2–4, layout responsive en Task 6.
7. **Primitivos en `src/ui` y layout en `src/layout`, reutilizados en todas las páginas:** importados vía barrel `../ui/index.js` en todas las Tasks de restyle.
8. **Write/Edit nativos, Windows, pnpm 11, Node 22, @kw/web:** comandos `pnpm --filter @kw/web …`.

**Consistencia de nombres entre tareas:** `Button`, `Input`, `Textarea`, `Select`, `Card`, `Field`, `Badge`, `PageHeader`, `Container`, `Spinner`, `Modal`, `cn` (Tasks 2–4) se importan idénticos desde `../ui/index.js` en Tasks 7–13. `AppShell`, `NavDrawer`, `ThemeToggle` (Tasks 5–6) usados por `App.tsx` (Task 7). `HomePage` (Task 7) ruta `/`. `inputClass` exportado por `Input.tsx` y reutilizado por `Textarea`/`Select`.

**Tests no rotos / añadidos:** los 4 tests existentes (i18n, LanguageSelector, diceRoll, socketClient) no cambian. Nuevos: `Button.test`, `Field.test`, `Modal.test`, `ThemeToggle.test`. Stub de `window.matchMedia` añadido a `test-setup.ts` (Task 5) para que los componentes que lo consultan no fallen en jsdom.

**Sin placeholders:** todos los ficheros de configuración y los primitivos/layout llevan código completo. Las Tasks de restyle de área (8–13) dan el patrón completo en la primera página y, para las repetitivas, especifican la transformación exacta (qué primitivo sustituye a qué etiqueta, qué conservar) sin TODO/TBD.

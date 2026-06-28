# Fase 8 — i18n y pulido — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir internacionalización completa (en, de, es, pl, pt_BR) con i18next y react-i18next, convirtiendo los catálogos gettext `.po` del origen a recursos JSON; selector de idioma con cookie `kw_lang` y fallback `en`; traducciones de emails del servidor. Migrar los estilos SASS propios del origen a CSS Modules (descartando Bulma, ya obsoleto), conservando el look&feel. Repaso final de paridad de vistas para dejar la app lista de punta a punta.

**Architecture:** Monorepo hexagonal. Los recursos i18n del front van en `packages/web/src/i18n/`. El selector de idioma guarda la cookie `kw_lang` (paridad con el origen: `request.cookies.get('kw_lang')`). La lógica de traducción de emails en el servidor usa i18next con backend de archivos JSON en `packages/server/src/infrastructure/i18n/`; el `NodemailerMailer` ya existente no cambia, pero los casos de uso de auth reciben un `EmailTranslator` (nuevo puerto `driven`) para generar asuntos y cuerpos localizados. Los estilos se migran como CSS Modules en `packages/web/src/styles/`. No se toca `core`; todo lo nuevo son adaptadores o capa web.

**Tech Stack:** i18next ^23, react-i18next ^14, i18next-http-backend ^2 (web), i18next ^23 (server side), sass ^1.77 (Vite bundled, sin Flask-Assets), CSS Modules (soporte nativo en Vite). Todas las demás versiones del monorepo permanecen igual.

> **Nota de paridad:** el origen determina el idioma con esta prioridad: (1) query param `lang`, (2) cookie `kw_lang`, (3) fallback `en` (ver `app/__init__.py` `get_locale()`). Los 5 idiomas del origen: `en`, `de`, `es`, `pl`, `pt_BR`. Las cadenas sin traducir en los `.po` del origen (msgstr vacío) caen al inglés — este comportamiento es correcto y lo gestiona i18next automáticamente con `fallbackLng: 'en'`.

---

## Estructura de ficheros (Fase 8)

```
packages/
├─ shared/
│  └─ src/
│     └─ schemas/
│        └─ i18n.ts                         # LocaleSchema (z.enum(['en','de','es','pl','pt_BR']))
├─ web/
│  ├─ package.json                           # + i18next, react-i18next, i18next-http-backend
│  └─ src/
│     ├─ i18n/
│     │  ├─ i18n.ts                          # configuración i18next para el front
│     │  ├─ locales/
│     │  │  ├─ en/translation.json
│     │  │  ├─ de/translation.json
│     │  │  ├─ es/translation.json
│     │  │  ├─ pl/translation.json
│     │  │  └─ pt_BR/translation.json
│     │  └─ LanguageSelector.tsx             # <select> con cookie kw_lang
│     ├─ styles/
│     │  ├─ variables.module.scss            # variables SASS portadas del origen
│     │  ├─ global.scss                      # estilos globales (portados de main.scss + others)
│     │  ├─ character.module.scss            # portado de character.scss
│     │  ├─ inventory.module.scss            # portado de inventory.scss
│     │  └─ party.module.scss                # portado de party.scss
│     ├─ main.tsx                            # + import './styles/global.scss', I18nextProvider
│     └─ App.tsx                             # añade <LanguageSelector> en el nav
└─ server/
   └─ src/
      └─ infrastructure/
         └─ i18n/
            ├─ emailTranslations.ts          # función translate(locale, key, vars) → string
            ├─ emailTranslations.test.ts
            └─ locales/
               ├─ en.json                   # cadenas de emails en inglés
               ├─ de.json
               ├─ es.json
               ├─ pl.json
               └─ pt_BR.json
```

---

## Task 1: `shared` — esquema de idioma (Locale)

**Files:**
- Create: `packages/shared/src/schemas/i18n.ts`
- Modify: `packages/shared/src/index.ts`

> Fija el tipo `Locale` como unión estricta de los 5 idiomas. Será importado por `web` e `server`.

- [ ] **Step 1: Crear `packages/shared/src/schemas/i18n.ts`**

```ts
import { z } from "zod";

export const SUPPORTED_LOCALES = ["en", "de", "es", "pl", "pt_BR"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Valida un valor de cookie/query-param y devuelve un Locale válido o 'en'. */
export const LocaleSchema = z.enum(SUPPORTED_LOCALES);

export function parseLocale(raw: string | undefined | null): Locale {
  const result = LocaleSchema.safeParse(raw);
  return result.success ? result.data : "en";
}
```

- [ ] **Step 2: Añadir export a `packages/shared/src/index.ts`**

Añadir al final:

```ts
export * from "./schemas/i18n.js";
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @kw/shared typecheck`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/schemas/i18n.ts packages/shared/src/index.ts
git commit -m "feat(shared): esquema Locale y parseLocale para los 5 idiomas"
```

---

## Task 2: Generar los catálogos JSON de traducción para el front (en/de/es/pl/pt_BR)

**Files:**
- Create: `packages/web/src/i18n/locales/en/translation.json`
- Create: `packages/web/src/i18n/locales/de/translation.json`
- Create: `packages/web/src/i18n/locales/es/translation.json`
- Create: `packages/web/src/i18n/locales/pl/translation.json`
- Create: `packages/web/src/i18n/locales/pt_BR/translation.json`

> **Decisión:** los ficheros `.po` del origen tienen msgstr vacío en `es` y `de` para la mayoría de cadenas de UI (el texto base ya está en inglés). Se generan los JSON con las traducciones disponibles y el resto queda vacío para que i18next use el fallback `en`. Las claves son el propio `msgid` del `.po` (cadena en inglés). Las 5 categorías de claves son: auth (login/signup/reset), character (stats, atributos), inventory (items, contenedores, tags), party (partida, miembros) y common (botones, acciones).

- [ ] **Step 1: Crear `packages/web/src/i18n/locales/en/translation.json`**

```json
{
  "Email": "Email",
  "Password": "Password",
  "Keep me logged in": "Keep me logged in",
  "Login": "Login",
  "Invalid email address": "Invalid email address",
  "Username": "Username",
  "Password must be between 8 and 64 characters": "Password must be between 8 and 64 characters",
  "Passwords must match": "Passwords must match",
  "Confirm password": "Confirm password",
  "Signup Code": "Signup Code",
  "Sign Up": "Sign Up",
  "Reset Password": "Reset Password",
  "New Password": "New Password",
  "Resend Confirmation": "Resend Confirmation",
  "Email addresses must match": "Email addresses must match",
  "Change": "Change",
  "Current Password": "Current Password",
  "New password": "New password",
  "Confirm new password": "Confirm new password",
  "Background": "Background",
  "Name": "Name",
  "Custom Background": "Custom Background",
  "Custom Name": "Custom Name",
  "Strength": "Strength",
  "Strength Max": "Strength Max",
  "Dexterity": "Dexterity",
  "Dexterity Max": "Dexterity Max",
  "Willpower": "Willpower",
  "Willpower Max": "Willpower Max",
  "HP": "HP",
  "HP Max": "HP Max",
  "Notes": "Notes",
  "Description": "Description",
  "Gold": "Gold",
  "Save Character": "Save Character",
  "Save": "Save",
  "Deprived": "Deprived",
  "Panicked": "Panicked",
  "Traits": "Traits",
  "Bonds": "Bonds",
  "Omens": "Omens",
  "Scars": "Scars",
  "Party Code": "Party Code",
  "Items": "Items",
  "Containers": "Containers",
  "Image URL": "Image URL",
  "Armor": "Armor",
  "Save Party": "Save Party",
  "petty": "petty",
  "bulky": "bulky",
  "1 Armor": "1 Armor",
  "2 Armor": "2 Armor",
  "3 Armor": "3 Armor",
  "uses": "uses",
  "charges": "charges",
  "blast": "blast",
  "d6": "d6",
  "d8": "d8",
  "d10": "d10",
  "d12": "d12",
  "Rations": "Rations",
  "Torch": "Torch",
  "Characters": "Characters",
  "Parties": "Parties",
  "Account": "Account",
  "Logout": "Logout",
  "Create Character": "Create Character",
  "Create Party": "Create Party",
  "Join Party": "Join Party",
  "Delete": "Delete",
  "Cancel": "Cancel",
  "Edit": "Edit",
  "Print": "Print",
  "Export": "Export",
  "Import": "Import",
  "Tools": "Tools",
  "Generators": "Generators",
  "Dice": "Dice",
  "Roll": "Roll",
  "Leave Party": "Leave Party",
  "Inventory": "Inventory",
  "Marketplace": "Marketplace",
  "Transfer": "Transfer",
  "Buy": "Buy",
  "Cost": "Cost",
  "Slots": "Slots",
  "Overburdened": "Overburdened",
  "Dark Mode": "Dark Mode",
  "Language": "Language"
}
```

- [ ] **Step 2: Crear `packages/web/src/i18n/locales/de/translation.json`**

```json
{
  "Email": "E-Mail",
  "Password": "Passwort",
  "Keep me logged in": "Angemeldet bleiben",
  "Login": "Anmelden",
  "Invalid email address": "Ungültige E-Mail-Adresse",
  "Username": "Benutzername",
  "Password must be between 8 and 64 characters": "Das Passwort muss zwischen 8 und 64 Zeichen lang sein",
  "Passwords must match": "Die Passwörter müssen übereinstimmen",
  "Confirm password": "Passwort bestätigen",
  "Signup Code": "Registrierungscode",
  "Sign Up": "Registrieren",
  "Reset Password": "Passwort zurücksetzen",
  "New Password": "Neues Passwort",
  "Resend Confirmation": "Bestätigung erneut senden",
  "Email addresses must match": "E-Mail-Adressen müssen übereinstimmen",
  "Change": "Ändern",
  "Current Password": "Aktuelles Passwort",
  "New password": "Neues Passwort",
  "Confirm new password": "Neues Passwort bestätigen",
  "Background": "Hintergrund",
  "Name": "Name",
  "Custom Background": "Benutzerdefinierter Hintergrund",
  "Custom Name": "Benutzerdefinierter Name",
  "Strength": "Stärke",
  "Strength Max": "Stärke Max",
  "Dexterity": "Geschicklichkeit",
  "Dexterity Max": "Geschicklichkeit Max",
  "Willpower": "Willenskraft",
  "Willpower Max": "Willenskraft Max",
  "HP": "LP",
  "HP Max": "LP Max",
  "Notes": "Notizen",
  "Description": "Beschreibung",
  "Gold": "Gold",
  "Save Character": "Charakter speichern",
  "Save": "Speichern",
  "Deprived": "Entzogen",
  "Panicked": "In Panik",
  "Traits": "Eigenschaften",
  "Bonds": "Bindungen",
  "Omens": "Vorzeichen",
  "Scars": "Narben",
  "Party Code": "Gruppencode",
  "Items": "Gegenstände",
  "Containers": "Behälter",
  "Image URL": "Bild-URL",
  "Armor": "Rüstung",
  "Save Party": "Gruppe speichern",
  "petty": "kleiner",
  "bulky": "sperrig",
  "1 Armor": "1 Rüstung",
  "2 Armor": "2 Rüstung",
  "3 Armor": "3 Rüstung",
  "Characters": "Charaktere",
  "Parties": "Gruppen",
  "Account": "Konto",
  "Logout": "Abmelden",
  "Create Character": "Charakter erstellen",
  "Create Party": "Gruppe erstellen",
  "Join Party": "Gruppe beitreten",
  "Delete": "Löschen",
  "Cancel": "Abbrechen",
  "Edit": "Bearbeiten",
  "Print": "Drucken",
  "Export": "Exportieren",
  "Import": "Importieren",
  "Inventory": "Inventar",
  "Marketplace": "Marktplatz",
  "Transfer": "Übertragen",
  "Buy": "Kaufen",
  "Cost": "Kosten",
  "Dark Mode": "Dunkelmodus",
  "Language": "Sprache"
}
```

- [ ] **Step 3: Crear `packages/web/src/i18n/locales/es/translation.json`**

```json
{
  "Email": "Correo electrónico",
  "Password": "Contraseña",
  "Keep me logged in": "Mantenerme conectado",
  "Login": "Iniciar sesión",
  "Invalid email address": "Dirección de correo inválida",
  "Username": "Nombre de usuario",
  "Password must be between 8 and 64 characters": "La contraseña debe tener entre 8 y 64 caracteres",
  "Passwords must match": "Las contraseñas deben coincidir",
  "Confirm password": "Confirmar contraseña",
  "Signup Code": "Código de registro",
  "Sign Up": "Registrarse",
  "Reset Password": "Restablecer contraseña",
  "New Password": "Nueva contraseña",
  "Resend Confirmation": "Reenviar confirmación",
  "Email addresses must match": "Las direcciones de correo deben coincidir",
  "Change": "Cambiar",
  "Current Password": "Contraseña actual",
  "New password": "Nueva contraseña",
  "Confirm new password": "Confirmar nueva contraseña",
  "Background": "Trasfondo",
  "Name": "Nombre",
  "Custom Background": "Trasfondo personalizado",
  "Custom Name": "Nombre personalizado",
  "Strength": "Fuerza",
  "Strength Max": "Fuerza máx.",
  "Dexterity": "Destreza",
  "Dexterity Max": "Destreza máx.",
  "Willpower": "Voluntad",
  "Willpower Max": "Voluntad máx.",
  "HP": "PV",
  "HP Max": "PV máx.",
  "Notes": "Notas",
  "Description": "Descripción",
  "Gold": "Oro",
  "Save Character": "Guardar personaje",
  "Save": "Guardar",
  "Deprived": "Privado",
  "Panicked": "En pánico",
  "Traits": "Rasgos",
  "Bonds": "Vínculos",
  "Omens": "Presagios",
  "Scars": "Cicatrices",
  "Party Code": "Código de partida",
  "Items": "Objetos",
  "Containers": "Contenedores",
  "Image URL": "URL de imagen",
  "Armor": "Armadura",
  "Save Party": "Guardar partida",
  "petty": "insignificante",
  "bulky": "voluminoso",
  "1 Armor": "1 Armadura",
  "2 Armor": "2 Armadura",
  "3 Armor": "3 Armadura",
  "Characters": "Personajes",
  "Parties": "Partidas",
  "Account": "Cuenta",
  "Logout": "Cerrar sesión",
  "Create Character": "Crear personaje",
  "Create Party": "Crear partida",
  "Join Party": "Unirse a partida",
  "Delete": "Eliminar",
  "Cancel": "Cancelar",
  "Edit": "Editar",
  "Print": "Imprimir",
  "Export": "Exportar",
  "Import": "Importar",
  "Inventory": "Inventario",
  "Marketplace": "Mercado",
  "Transfer": "Transferir",
  "Buy": "Comprar",
  "Cost": "Coste",
  "Dark Mode": "Modo oscuro",
  "Language": "Idioma"
}
```

- [ ] **Step 4: Crear `packages/web/src/i18n/locales/pl/translation.json`**

```json
{
  "Email": "E-mail",
  "Password": "Hasło",
  "Keep me logged in": "Pozostań zalogowany",
  "Login": "Zaloguj się",
  "Invalid email address": "Nieprawidłowy adres e-mail",
  "Username": "Nazwa użytkownika",
  "Password must be between 8 and 64 characters": "Hasło musi mieć od 8 do 64 znaków",
  "Passwords must match": "Hasła muszą być identyczne",
  "Confirm password": "Potwierdź hasło",
  "Signup Code": "Kod rejestracyjny",
  "Sign Up": "Zarejestruj się",
  "Reset Password": "Resetuj hasło",
  "New Password": "Nowe hasło",
  "Resend Confirmation": "Wyślij ponownie potwierdzenie",
  "Email addresses must match": "Adresy e-mail muszą być identyczne",
  "Change": "Zmień",
  "Current Password": "Aktualne hasło",
  "New password": "Nowe hasło",
  "Confirm new password": "Potwierdź nowe hasło",
  "Background": "Klasa",
  "Name": "Imię",
  "Custom Background": "Własna klasa",
  "Custom Name": "Własne imię",
  "Strength": "Siła",
  "Strength Max": "Siła maks.",
  "Dexterity": "Zręczność",
  "Dexterity Max": "Zręczność maks.",
  "Willpower": "Wola",
  "Willpower Max": "Wola maks.",
  "HP": "PŻ",
  "HP Max": "PŻ maks.",
  "Notes": "Notatki",
  "Description": "Opis",
  "Gold": "Złoto",
  "Save Character": "Zapisz postać",
  "Save": "Zapisz",
  "Deprived": "Wyczerpany",
  "Panicked": "Spanikowany",
  "Traits": "Cechy",
  "Bonds": "Więzi",
  "Omens": "Przepowiednie",
  "Scars": "Blizny",
  "Party Code": "Kod drużyny",
  "Items": "Przedmioty",
  "Containers": "Pojemniki",
  "Image URL": "URL obrazka",
  "Armor": "Pancerz",
  "Save Party": "Zapisz drużynę",
  "petty": "drobny",
  "bulky": "nieporęczny",
  "1 Armor": "1 Pancerz",
  "2 Armor": "2 Pancerz",
  "3 Armor": "3 Pancerz",
  "Characters": "Postacie",
  "Parties": "Drużyny",
  "Account": "Konto",
  "Logout": "Wyloguj",
  "Create Character": "Stwórz postać",
  "Create Party": "Stwórz drużynę",
  "Join Party": "Dołącz do drużyny",
  "Delete": "Usuń",
  "Cancel": "Anuluj",
  "Edit": "Edytuj",
  "Print": "Drukuj",
  "Export": "Eksportuj",
  "Import": "Importuj",
  "Inventory": "Ekwipunek",
  "Marketplace": "Targowisko",
  "Transfer": "Przenieś",
  "Buy": "Kup",
  "Cost": "Koszt",
  "Dark Mode": "Tryb ciemny",
  "Language": "Język"
}
```

- [ ] **Step 5: Crear `packages/web/src/i18n/locales/pt_BR/translation.json`**

```json
{
  "Email": "E-mail",
  "Password": "Senha",
  "Keep me logged in": "Manter conectado",
  "Login": "Entrar",
  "Invalid email address": "Endereço de e-mail inválido",
  "Username": "Nome de usuário",
  "Password must be between 8 and 64 characters": "A senha deve ter entre 8 e 64 caracteres",
  "Passwords must match": "As senhas devem ser iguais",
  "Confirm password": "Confirmar senha",
  "Signup Code": "Código de cadastro",
  "Sign Up": "Cadastrar",
  "Reset Password": "Redefinir senha",
  "New Password": "Nova senha",
  "Resend Confirmation": "Reenviar confirmação",
  "Email addresses must match": "Os endereços de e-mail devem ser iguais",
  "Change": "Alterar",
  "Current Password": "Senha atual",
  "New password": "Nova senha",
  "Confirm new password": "Confirmar nova senha",
  "Background": "Antecedente",
  "Name": "Nome",
  "Custom Background": "Antecedente personalizado",
  "Custom Name": "Nome personalizado",
  "Strength": "Força",
  "Strength Max": "Força máx.",
  "Dexterity": "Destreza",
  "Dexterity Max": "Destreza máx.",
  "Willpower": "Vontade",
  "Willpower Max": "Vontade máx.",
  "HP": "PV",
  "HP Max": "PV máx.",
  "Notes": "Anotações",
  "Description": "Descrição",
  "Gold": "Ouro",
  "Save Character": "Salvar personagem",
  "Save": "Salvar",
  "Deprived": "Privado",
  "Panicked": "Em pânico",
  "Traits": "Traços",
  "Bonds": "Vínculos",
  "Omens": "Presságios",
  "Scars": "Cicatrizes",
  "Party Code": "Código do grupo",
  "Items": "Itens",
  "Containers": "Contêineres",
  "Image URL": "URL da imagem",
  "Armor": "Armadura",
  "Save Party": "Salvar grupo",
  "petty": "miúdo",
  "bulky": "volumoso",
  "1 Armor": "1 Armadura",
  "2 Armor": "2 Armadura",
  "3 Armor": "3 Armadura",
  "Characters": "Personagens",
  "Parties": "Grupos",
  "Account": "Conta",
  "Logout": "Sair",
  "Create Character": "Criar personagem",
  "Create Party": "Criar grupo",
  "Join Party": "Entrar no grupo",
  "Delete": "Excluir",
  "Cancel": "Cancelar",
  "Edit": "Editar",
  "Print": "Imprimir",
  "Export": "Exportar",
  "Import": "Importar",
  "Inventory": "Inventário",
  "Marketplace": "Mercado",
  "Transfer": "Transferir",
  "Buy": "Comprar",
  "Cost": "Custo",
  "Dark Mode": "Modo escuro",
  "Language": "Idioma"
}
```

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/i18n/locales
git commit -m "feat(web/i18n): catálogos de traducción JSON para los 5 idiomas"
```

---

## Task 3: Configurar i18next en el frontend (TDD)

**Files:**
- Modify: `packages/web/package.json`
- Create: `packages/web/src/i18n/i18n.ts`
- Create: `packages/web/src/i18n/i18n.test.ts`

- [ ] **Step 1: Añadir dependencias en `packages/web/package.json`**

```json
{
  "name": "@kw/web",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.json --noEmit && vite build",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run --passWithNoTests"
  },
  "dependencies": {
    "@kw/core": "workspace:*",
    "@kw/shared": "workspace:*",
    "@tanstack/react-query": "^5.51.0",
    "i18next": "^23.15.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-i18next": "^14.1.3",
    "react-router-dom": "^6.26.0",
    "socket.io-client": "^4.7.5"
  },
  "devDependencies": {
    "@types/react": "^18.3.4",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "sass": "^1.77.8",
    "vite": "^5.4.2",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Escribir el test que falla `packages/web/src/i18n/i18n.test.ts`**

```ts
import { describe, it, expect, beforeAll } from "vitest";
import i18n from "./i18n.js";
import enTranslation from "./locales/en/translation.json";

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

describe("i18n setup", () => {
  it("está inicializado", () => {
    expect(i18n.isInitialized).toBe(true);
  });

  it("fallback es 'en'", () => {
    expect(i18n.options.fallbackLng).toContain("en");
  });

  it("traduce una clave existente en inglés", () => {
    expect(i18n.t("Login")).toBe(enTranslation["Login"]);
  });

  it("devuelve la clave si no existe traducción", () => {
    expect(i18n.t("__clave_inexistente__")).toBe("__clave_inexistente__");
  });

  it("cambia de idioma a 'es' y traduce correctamente", async () => {
    await i18n.changeLanguage("es");
    expect(i18n.t("Login")).toBe("Iniciar sesión");
    await i18n.changeLanguage("en");
  });
});
```

- [ ] **Step 3: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/web test`
Expected: FAIL — "Cannot find module './i18n.js'".

- [ ] **Step 4: Implementar `packages/web/src/i18n/i18n.ts`**

```ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en/translation.json";
import de from "./locales/de/translation.json";
import es from "./locales/es/translation.json";
import pl from "./locales/pl/translation.json";
import ptBR from "./locales/pt_BR/translation.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de },
    es: { translation: es },
    pl: { translation: pl },
    pt_BR: { translation: ptBR },
  },
  fallbackLng: "en",
  supportedLngs: ["en", "de", "es", "pl", "pt_BR"],
  interpolation: {
    escapeValue: false, // React ya escapa
  },
  keySeparator: false, // las claves son cadenas en inglés completas
  nsSeparator: false,
});

export default i18n;
```

- [ ] **Step 5: Instalar dependencias**

Run: `pnpm install`
Expected: instala `i18next`, `react-i18next`, `sass` sin errores.

- [ ] **Step 6: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/web test`
Expected: PASS (todos los describes en verde).

- [ ] **Step 7: Commit**

```bash
git add packages/web/package.json packages/web/src/i18n/i18n.ts packages/web/src/i18n/i18n.test.ts pnpm-lock.yaml
git commit -m "feat(web/i18n): configuración i18next con bundled resources para los 5 idiomas"
```

---

## Task 4: Componente LanguageSelector con cookie kw_lang (TDD)

**Files:**
- Create: `packages/web/src/i18n/LanguageSelector.test.tsx`
- Create: `packages/web/src/i18n/LanguageSelector.tsx`

> Paridad con `app/templates/lang.html` del origen: `<select>` con las 5 opciones, en el mismo orden. Al cambiar, escribe la cookie `kw_lang` (sin HttpOnly — es la misma cookie del origen, que el front también podía leer) y llama a `i18n.changeLanguage()`.

- [ ] **Step 1: Escribir el test que falla `packages/web/src/i18n/LanguageSelector.test.tsx`**

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n.js";
import { LanguageSelector } from "./LanguageSelector.js";

// Stub document.cookie
const cookieStore: Record<string, string> = {};
Object.defineProperty(document, "cookie", {
  get: () =>
    Object.entries(cookieStore)
      .map(([k, v]) => `${k}=${v}`)
      .join("; "),
  set: (value: string) => {
    const [pair] = value.split(";");
    if (pair) {
      const [k, v] = pair.split("=");
      if (k && v !== undefined) cookieStore[k.trim()] = v.trim();
    }
  },
  configurable: true,
});

const changeLanguageSpy = vi.spyOn(i18n, "changeLanguage");

afterEach(() => {
  changeLanguageSpy.mockClear();
});

function renderSelector() {
  return render(
    <I18nextProvider i18n={i18n}>
      <LanguageSelector />
    </I18nextProvider>
  );
}

describe("LanguageSelector", () => {
  it("renderiza un <select> con 5 opciones", () => {
    renderSelector();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(5);
  });

  it("al cambiar idioma llama a i18n.changeLanguage", () => {
    renderSelector();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "es" } });
    expect(changeLanguageSpy).toHaveBeenCalledWith("es");
  });

  it("al cambiar idioma escribe la cookie kw_lang", () => {
    renderSelector();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "de" } });
    expect(document.cookie).toContain("kw_lang=de");
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/web test`
Expected: FAIL — "Cannot find module './LanguageSelector.js'" / componente no encontrado.

- [ ] **Step 3: Instalar @testing-library/react para el test**

Añadir a `devDependencies` de `packages/web/package.json`:

```json
"@testing-library/react": "^16.0.0",
"@testing-library/jest-dom": "^6.4.6",
"@testing-library/user-event": "^14.5.2",
"jsdom": "^24.1.1"
```

Añadir también la configuración de vitest en `packages/web/package.json`:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -p tsconfig.json --noEmit && vite build",
  "typecheck": "tsc -p tsconfig.json --noEmit",
  "test": "vitest run --passWithNoTests"
}
```

Crear `packages/web/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
```

Crear `packages/web/src/test-setup.ts`:

```ts
import "@testing-library/jest-dom";
```

- [ ] **Step 4: Implementar `packages/web/src/i18n/LanguageSelector.tsx`**

```tsx
import { useTranslation } from "react-i18next";
import type { Locale } from "@kw/shared";
import { SUPPORTED_LOCALES } from "@kw/shared";

const LOCALE_LABELS: Record<Locale, string> = {
  pt_BR: "Brasilian Português",
  de: "Deutsch",
  en: "English",
  es: "Español",
  pl: "polski",
};

/** Paridad con app/templates/lang.html del origen. */
export function LanguageSelector() {
  const { i18n } = useTranslation();
  const current = i18n.language as Locale;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const locale = e.target.value as Locale;
    i18n.changeLanguage(locale);
    // Escribe la cookie kw_lang (paridad: el origen la lee con request.cookies.get('kw_lang'))
    document.cookie = `kw_lang=${locale};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
  }

  return (
    <select
      id="lang-selector"
      value={current}
      onChange={handleChange}
      aria-label="Select language"
    >
      {(["pt_BR", "de", "en", "es", "pl"] as const).map((loc) => (
        <option key={loc} value={loc}>
          {LOCALE_LABELS[loc]}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 5: Instalar nuevas deps y ejecutar el test**

Run: `pnpm install && pnpm --filter @kw/web test`
Expected: PASS (todos los describes en verde).

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/i18n/LanguageSelector.tsx packages/web/src/i18n/LanguageSelector.test.tsx packages/web/vitest.config.ts packages/web/src/test-setup.ts packages/web/package.json pnpm-lock.yaml
git commit -m "feat(web/i18n): LanguageSelector con cookie kw_lang (paridad con origen)"
```

---

## Task 5: Integrar i18next en el árbol de componentes React

**Files:**
- Modify: `packages/web/src/main.tsx`
- Modify: `packages/web/src/App.tsx`

> `I18nextProvider` envuelve toda la app. Al montar, se lee la cookie `kw_lang` del documento para establecer el idioma inicial (paridad con el origen: la prioridad es cookie > fallback `en`). El `LanguageSelector` se añade al nav existente.

- [ ] **Step 1: Modificar `packages/web/src/main.tsx`**

Añadir la importación de i18n (efecto side-effect que inicializa) y leer la cookie al arrancar:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n/i18n.js";
import { parseLocale } from "@kw/shared";
import { App } from "./App.js";

// Paridad con get_locale(): prioridad cookie kw_lang > fallback 'en'
function readLangCookie(): string | undefined {
  const match = document.cookie.match(/(?:^|;\s*)kw_lang=([^;]+)/);
  return match?.[1] ?? undefined;
}

const initialLocale = parseLocale(readLangCookie());
i18n.changeLanguage(initialLocale);

const queryClient = new QueryClient();

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
```

- [ ] **Step 2: Añadir `LanguageSelector` al nav en `packages/web/src/App.tsx`**

```tsx
import { Link, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSession } from "./auth/useSession.js";
import { LanguageSelector } from "./i18n/LanguageSelector.js";
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
import { InventoryEditorPage } from "./inventory/InventoryEditorPage.js";
import { PartyListPage } from "./parties/PartyListPage.js";
import { PartyCreatePage } from "./parties/PartyCreatePage.js";
import { PartyViewPage } from "./parties/PartyViewPage.js";
import { PartyEditPage } from "./parties/PartyEditPage.js";
import { JoinPartyPage } from "./parties/JoinPartyPage.js";

function Nav() {
  const { data: user } = useSession();
  const { t } = useTranslation();

  return (
    <nav className="navbar">
      <div className="nav-logo-container">
        <Link to="/">Kettlewright</Link>
      </div>
      <div className="navbar-menu">
        <div className="navbar-start">
          {user ? (
            <>
              <Link className="navbar-item" to="/characters">{t("Characters")}</Link>
              <Link className="navbar-item" to="/parties">{t("Parties")}</Link>
            </>
          ) : null}
        </div>
        <div className="navbar-end">
          {user ? (
            <>
              <Link className="navbar-item" to="/account">{t("Account")}</Link>
            </>
          ) : (
            <>
              <Link className="navbar-item" to="/login">{t("Login")}</Link>
              <Link className="navbar-item" to="/signup">{t("Sign Up")}</Link>
            </>
          )}
          <LanguageSelector />
        </div>
      </div>
    </nav>
  );
}

function Home() {
  const { data: user } = useSession();
  const { t } = useTranslation();

  return (
    <div>
      <h1>Kettlewright</h1>
      {user ? (
        <p>
          {t("Characters")}: <Link to="/characters">{t("Characters")}</Link> ·{" "}
          <Link to="/parties">{t("Parties")}</Link> ·{" "}
          <Link to="/account">{t("Account")}</Link>
        </p>
      ) : (
        <p>
          <Link to="/login">{t("Login")}</Link> · <Link to="/signup">{t("Sign Up")}</Link>
        </p>
      )}
    </div>
  );
}

export function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
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
        <Route path="/characters/:id" element={<CharacterViewPage />} />
        <Route path="/characters/:id/edit" element={<CharacterEditPage />} />
        <Route
          path="/characters/:id/inventory"
          element={<InventoryEditorPage />}
        />
        <Route path="/parties" element={<PartyListPage />} />
        <Route path="/parties/new" element={<PartyCreatePage />} />
        <Route path="/parties/join" element={<JoinPartyPage />} />
        <Route path="/parties/:id" element={<PartyViewPage />} />
        <Route path="/parties/:id/edit" element={<PartyEditPage />} />
      </Routes>
    </>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @kw/web typecheck`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/main.tsx packages/web/src/App.tsx
git commit -m "feat(web/i18n): integrar I18nextProvider y LanguageSelector en el árbol React"
```

---

## Task 6: Traducciones de emails del servidor — catálogos JSON

**Files:**
- Create: `packages/server/src/infrastructure/i18n/locales/en.json`
- Create: `packages/server/src/infrastructure/i18n/locales/de.json`
- Create: `packages/server/src/infrastructure/i18n/locales/es.json`
- Create: `packages/server/src/infrastructure/i18n/locales/pl.json`
- Create: `packages/server/src/infrastructure/i18n/locales/pt_BR.json`

> El origen (Flask) envía los emails en inglés hardcoded (`Register.ts`, `ResendConfirmation.ts`, etc.). Esta tarea introduce los catálogos de las cadenas de email con interpolación de variables (i18next `{{variable}}`).

- [ ] **Step 1: Crear `packages/server/src/infrastructure/i18n/locales/en.json`**

```json
{
  "email.confirm.subject": "Confirm Your Account",
  "email.confirm.text": "Hi {{username}},\n\nTo confirm your account please use this token: {{token}}\n\nNote: replies to this email address are not monitored.",
  "email.confirm.html": "<p>Hi {{username}},</p><p>To confirm your account please use this token: <code>{{token}}</code></p><p><small>Note: replies to this email address are not monitored.</small></p>",
  "email.reset.subject": "Reset Your Password",
  "email.reset.text": "Hi {{username}},\n\nTo reset your password please use this token: {{token}}\n\nIf you did not request a password reset, please ignore this email.\n\nNote: replies to this email address are not monitored.",
  "email.reset.html": "<p>Hi {{username}},</p><p>To reset your password please use this token: <code>{{token}}</code></p><p>If you did not request a password reset, please ignore this email.</p><p><small>Note: replies to this email address are not monitored.</small></p>",
  "email.changeEmail.subject": "Confirm Your New Email Address",
  "email.changeEmail.text": "Hi {{username}},\n\nTo confirm your new email address please use this token: {{token}}\n\nNote: replies to this email address are not monitored.",
  "email.changeEmail.html": "<p>Hi {{username}},</p><p>To confirm your new email address please use this token: <code>{{token}}</code></p><p><small>Note: replies to this email address are not monitored.</small></p>"
}
```

- [ ] **Step 2: Crear `packages/server/src/infrastructure/i18n/locales/de.json`**

```json
{
  "email.confirm.subject": "Bitte bestätige dein Konto",
  "email.confirm.text": "Hallo {{username}},\n\nbitte bestätige dein Konto mit diesem Token: {{token}}\n\nHinweis: Antworten auf diese E-Mail-Adresse werden nicht überwacht.",
  "email.confirm.html": "<p>Hallo {{username}},</p><p>bitte bestätige dein Konto mit diesem Token: <code>{{token}}</code></p><p><small>Hinweis: Antworten auf diese E-Mail-Adresse werden nicht überwacht.</small></p>",
  "email.reset.subject": "Passwort zurücksetzen",
  "email.reset.text": "Hallo {{username}},\n\nbitte setze dein Passwort mit diesem Token zurück: {{token}}\n\nFalls du kein Zurücksetzen angefordert hast, ignoriere diese E-Mail.\n\nHinweis: Antworten auf diese E-Mail-Adresse werden nicht überwacht.",
  "email.reset.html": "<p>Hallo {{username}},</p><p>bitte setze dein Passwort mit diesem Token zurück: <code>{{token}}</code></p><p>Falls du kein Zurücksetzen angefordert hast, ignoriere diese E-Mail.</p><p><small>Hinweis: Antworten auf diese E-Mail-Adresse werden nicht überwacht.</small></p>",
  "email.changeEmail.subject": "Neue E-Mail-Adresse bestätigen",
  "email.changeEmail.text": "Hallo {{username}},\n\nbitte bestätige deine neue E-Mail-Adresse mit diesem Token: {{token}}\n\nHinweis: Antworten auf diese E-Mail-Adresse werden nicht überwacht.",
  "email.changeEmail.html": "<p>Hallo {{username}},</p><p>bitte bestätige deine neue E-Mail-Adresse mit diesem Token: <code>{{token}}</code></p><p><small>Hinweis: Antworten auf diese E-Mail-Adresse werden nicht überwacht.</small></p>"
}
```

- [ ] **Step 3: Crear `packages/server/src/infrastructure/i18n/locales/es.json`**

```json
{
  "email.confirm.subject": "Confirma tu cuenta",
  "email.confirm.text": "Hola {{username}},\n\npara confirmar tu cuenta utiliza este token: {{token}}\n\nNota: los mensajes dirigidos a esta dirección no son monitorizados.",
  "email.confirm.html": "<p>Hola {{username}},</p><p>para confirmar tu cuenta utiliza este token: <code>{{token}}</code></p><p><small>Nota: los mensajes dirigidos a esta dirección no son monitorizados.</small></p>",
  "email.reset.subject": "Restablece tu contraseña",
  "email.reset.text": "Hola {{username}},\n\npara restablecer tu contraseña utiliza este token: {{token}}\n\nSi no solicitaste el restablecimiento, ignora este mensaje.\n\nNota: los mensajes dirigidos a esta dirección no son monitorizados.",
  "email.reset.html": "<p>Hola {{username}},</p><p>para restablecer tu contraseña utiliza este token: <code>{{token}}</code></p><p>Si no solicitaste el restablecimiento, ignora este mensaje.</p><p><small>Nota: los mensajes dirigidos a esta dirección no son monitorizados.</small></p>",
  "email.changeEmail.subject": "Confirma tu nueva dirección de correo",
  "email.changeEmail.text": "Hola {{username}},\n\npara confirmar tu nueva dirección de correo utiliza este token: {{token}}\n\nNota: los mensajes dirigidos a esta dirección no son monitorizados.",
  "email.changeEmail.html": "<p>Hola {{username}},</p><p>para confirmar tu nueva dirección de correo utiliza este token: <code>{{token}}</code></p><p><small>Nota: los mensajes dirigidos a esta dirección no son monitorizados.</small></p>"
}
```

- [ ] **Step 4: Crear `packages/server/src/infrastructure/i18n/locales/pl.json`**

```json
{
  "email.confirm.subject": "Potwierdź swoje konto",
  "email.confirm.text": "Cześć {{username}},\n\naby potwierdzić swoje konto, użyj tego tokenu: {{token}}\n\nUwaga: odpowiedzi na ten adres e-mail nie są monitorowane.",
  "email.confirm.html": "<p>Cześć {{username}},</p><p>aby potwierdzić swoje konto, użyj tego tokenu: <code>{{token}}</code></p><p><small>Uwaga: odpowiedzi na ten adres e-mail nie są monitorowane.</small></p>",
  "email.reset.subject": "Resetuj hasło",
  "email.reset.text": "Cześć {{username}},\n\naby zresetować hasło, użyj tego tokenu: {{token}}\n\nJeśli nie prosiłeś o reset, zignoruj tę wiadomość.\n\nUwaga: odpowiedzi na ten adres e-mail nie są monitorowane.",
  "email.reset.html": "<p>Cześć {{username}},</p><p>aby zresetować hasło, użyj tego tokenu: <code>{{token}}</code></p><p>Jeśli nie prosiłeś o reset, zignoruj tę wiadomość.</p><p><small>Uwaga: odpowiedzi na ten adres e-mail nie są monitorowane.</small></p>",
  "email.changeEmail.subject": "Potwierdź nowy adres e-mail",
  "email.changeEmail.text": "Cześć {{username}},\n\naby potwierdzić nowy adres e-mail, użyj tego tokenu: {{token}}\n\nUwaga: odpowiedzi na ten adres e-mail nie są monitorowane.",
  "email.changeEmail.html": "<p>Cześć {{username}},</p><p>aby potwierdzić nowy adres e-mail, użyj tego tokenu: <code>{{token}}</code></p><p><small>Uwaga: odpowiedzi na ten adres e-mail nie są monitorowane.</small></p>"
}
```

- [ ] **Step 5: Crear `packages/server/src/infrastructure/i18n/locales/pt_BR.json`**

```json
{
  "email.confirm.subject": "Confirme sua conta",
  "email.confirm.text": "Olá {{username}},\n\npara confirmar sua conta use este token: {{token}}\n\nObs.: respostas para este endereço não são monitoradas.",
  "email.confirm.html": "<p>Olá {{username}},</p><p>para confirmar sua conta use este token: <code>{{token}}</code></p><p><small>Obs.: respostas para este endereço não são monitoradas.</small></p>",
  "email.reset.subject": "Redefina sua senha",
  "email.reset.text": "Olá {{username}},\n\npara redefinir sua senha use este token: {{token}}\n\nSe você não solicitou a redefinição, ignore este e-mail.\n\nObs.: respostas para este endereço não são monitoradas.",
  "email.reset.html": "<p>Olá {{username}},</p><p>para redefinir sua senha use este token: <code>{{token}}</code></p><p>Se você não solicitou a redefinição, ignore este e-mail.</p><p><small>Obs.: respostas para este endereço não são monitoradas.</small></p>",
  "email.changeEmail.subject": "Confirme seu novo endereço de e-mail",
  "email.changeEmail.text": "Olá {{username}},\n\npara confirmar seu novo endereço de e-mail use este token: {{token}}\n\nObs.: respostas para este endereço não são monitoradas.",
  "email.changeEmail.html": "<p>Olá {{username}},</p><p>para confirmar seu novo endereço de e-mail use este token: <code>{{token}}</code></p><p><small>Obs.: respostas para este endereço não são monitoradas.</small></p>"
}
```

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/infrastructure/i18n/locales
git commit -m "feat(server/i18n): catálogos JSON de emails para los 5 idiomas"
```

---

## Task 7: Función `translateEmail` del servidor (TDD)

**Files:**
- Create: `packages/server/src/infrastructure/i18n/emailTranslations.test.ts`
- Create: `packages/server/src/infrastructure/i18n/emailTranslations.ts`

> Función pura que, dado un locale y una clave de email, devuelve el asunto, texto plano y HTML. No es un puerto (no pertenece al core): es un helper de infraestructura que usa los JSON locales. Los casos de uso de auth siguen inyectando un `Mailer`; la construcción de los mensajes pasa a las rutas HTTP (adaptadores de entrada), que reciben el idioma del usuario desde la cookie `kw_lang`.

- [ ] **Step 1: Escribir el test que falla `emailTranslations.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { buildConfirmEmail, buildResetEmail, buildChangeEmailEmail } from "./emailTranslations.js";

describe("buildConfirmEmail", () => {
  it("genera el email de confirmación en inglés", () => {
    const msg = buildConfirmEmail("en", "alice", "TOKEN123");
    expect(msg.subject).toBe("Confirm Your Account");
    expect(msg.text).toContain("alice");
    expect(msg.text).toContain("TOKEN123");
    expect(msg.html).toContain("<code>TOKEN123</code>");
  });

  it("genera el email de confirmación en español", () => {
    const msg = buildConfirmEmail("es", "alice", "TOKEN123");
    expect(msg.subject).toBe("Confirma tu cuenta");
    expect(msg.text).toContain("Hola alice");
  });

  it("cae a inglés para locale desconocido", () => {
    const msg = buildConfirmEmail("xx" as "en", "bob", "TK");
    expect(msg.subject).toBe("Confirm Your Account");
  });
});

describe("buildResetEmail", () => {
  it("genera el email de reset en alemán", () => {
    const msg = buildResetEmail("de", "hans", "RESET99");
    expect(msg.subject).toBe("Passwort zurücksetzen");
    expect(msg.text).toContain("hans");
    expect(msg.text).toContain("RESET99");
  });
});

describe("buildChangeEmailEmail", () => {
  it("genera el email de cambio de email en pt_BR", () => {
    const msg = buildChangeEmailEmail("pt_BR", "maria", "CHANGE42");
    expect(msg.subject).toBe("Confirme seu novo endereço de e-mail");
    expect(msg.html).toContain("<code>CHANGE42</code>");
  });
});
```

- [ ] **Step 2: Ejecutar el test para ver que falla**

Run: `pnpm --filter @kw/server test`
Expected: FAIL — "Cannot find module './emailTranslations.js'".

- [ ] **Step 3: Implementar `emailTranslations.ts`**

```ts
import type { EmailMessage } from "@kw/core";
import type { Locale } from "@kw/shared";
import { parseLocale } from "@kw/shared";

import en from "./locales/en.json" assert { type: "json" };
import de from "./locales/de.json" assert { type: "json" };
import es from "./locales/es.json" assert { type: "json" };
import pl from "./locales/pl.json" assert { type: "json" };
import ptBR from "./locales/pt_BR.json" assert { type: "json" };

type EmailCatalog = typeof en;

const catalogs: Record<Locale, EmailCatalog> = { en, de, es, pl, pt_BR: ptBR };

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

function catalog(locale: string): EmailCatalog {
  return catalogs[parseLocale(locale)] ?? catalogs["en"];
}

export function buildConfirmEmail(
  locale: string,
  username: string,
  token: string
): EmailMessage {
  const c = catalog(locale);
  const vars = { username, token };
  return {
    to: "",
    subject: interpolate(c["email.confirm.subject"], vars),
    text: interpolate(c["email.confirm.text"], vars),
    html: interpolate(c["email.confirm.html"], vars),
  };
}

export function buildResetEmail(
  locale: string,
  username: string,
  token: string
): EmailMessage {
  const c = catalog(locale);
  const vars = { username, token };
  return {
    to: "",
    subject: interpolate(c["email.reset.subject"], vars),
    text: interpolate(c["email.reset.text"], vars),
    html: interpolate(c["email.reset.html"], vars),
  };
}

export function buildChangeEmailEmail(
  locale: string,
  username: string,
  token: string
): EmailMessage {
  const c = catalog(locale);
  const vars = { username, token };
  return {
    to: "",
    subject: interpolate(c["email.changeEmail.subject"], vars),
    text: interpolate(c["email.changeEmail.text"], vars),
    html: interpolate(c["email.changeEmail.html"], vars),
  };
}
```

- [ ] **Step 4: Ejecutar el test para ver que pasa**

Run: `pnpm --filter @kw/server test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/infrastructure/i18n/emailTranslations.ts packages/server/src/infrastructure/i18n/emailTranslations.test.ts
git commit -m "feat(server/i18n): buildConfirmEmail/buildResetEmail/buildChangeEmailEmail con 5 idiomas"
```

---

## Task 8: Conectar traducciones de email en las rutas de auth del servidor

**Files:**
- Modify: `packages/server/src/interfaces/http/authRoutes.ts`

> Las rutas de auth reciben la cookie `kw_lang` del request y la pasan como `locale` al construir los mensajes de email. Se reemplazan los emails hardcoded de los casos de uso de auth (que ya existían en inglés) por llamadas a `buildConfirmEmail`, `buildResetEmail` y `buildChangeEmailEmail`. Los casos de uso NO cambian (arquitectura hexagonal: el Mailer sigue siendo el mismo puerto).

**Decisión de diseño:** El locale para emails se detecta en el adaptador HTTP (capa de entrada), no en el dominio. Las tres rutas que envían email son: `POST /api/auth/signup` (confirmación), `POST /api/auth/resend-confirmation`, `POST /api/auth/password-reset-request` y `POST /api/auth/change-email`. Se extiende el `Mailer` con un wrapper que intercepta el `send` y sobreescribe `subject`, `text` y `html` con los generados por `emailTranslations`.

- [ ] **Step 1: Leer `packages/server/src/interfaces/http/authRoutes.ts`**

Inspeccionar las firmas existentes de las rutas para identificar dónde se usa el mailer y cómo inyectar el locale.

- [ ] **Step 2: Crear helper `LocalizedMailer` en `authRoutes.ts`**

Añadir al inicio del fichero `authRoutes.ts` (sin cambiar la firma de `buildAuthRoutes` ni los casos de uso):

```ts
import {
  buildConfirmEmail,
  buildResetEmail,
  buildChangeEmailEmail,
} from "../../infrastructure/i18n/emailTranslations.js";
import { parseLocale } from "@kw/shared";
import type { Locale } from "@kw/shared";
import type { Mailer, EmailMessage } from "@kw/core";

/** Lee la cookie kw_lang del header Cookie de Fastify. */
function localeFromCookie(cookieHeader: string | undefined): Locale {
  if (!cookieHeader) return "en";
  const match = cookieHeader.match(/(?:^|;\s*)kw_lang=([^;]+)/);
  return parseLocale(match?.[1]);
}

/**
 * Wrapper de Mailer que intercepta el send de emails de auth y los
 * sobreescribe con la versión localizada según el locale dado.
 * Los demás correos pasan sin cambios.
 */
class LocalizedAuthMailer implements Mailer {
  constructor(
    private readonly inner: Mailer,
    private readonly locale: Locale,
    private readonly username: string
  ) {}

  async send(message: EmailMessage): Promise<void> {
    // Detectar por el subject (hardcoded en los casos de uso)
    let localized: Partial<EmailMessage> = {};
    if (message.subject.startsWith("Confirm Your Account")) {
      const token = this.extractToken(message.text);
      const built = buildConfirmEmail(this.locale, this.username, token);
      localized = { subject: built.subject, text: built.text, html: built.html };
    } else if (message.subject.startsWith("Reset Your Password")) {
      const token = this.extractToken(message.text);
      const built = buildResetEmail(this.locale, this.username, token);
      localized = { subject: built.subject, text: built.text, html: built.html };
    } else if (message.subject.startsWith("Confirm Your New Email")) {
      const token = this.extractToken(message.text);
      const built = buildChangeEmailEmail(this.locale, this.username, token);
      localized = { subject: built.subject, text: built.text, html: built.html };
    }
    await this.inner.send({ ...message, ...localized });
  }

  /** Extrae el token del body de texto (formato: 'token: <TOKEN>') */
  private extractToken(text: string): string {
    const match = text.match(/token:\s*(\S+)/i);
    return match?.[1] ?? "";
  }
}
```

- [ ] **Step 3: Usar `LocalizedAuthMailer` en las rutas que envían email**

En cada handler que construye un caso de uso que envía email (`register`, `resendConfirmation`, `requestPasswordReset`, `changeEmail`), envolver el `mailer` con `LocalizedAuthMailer`:

```ts
// Ejemplo en el handler de signup:
const locale = localeFromCookie(request.headers.cookie);
const localizedMailer = new LocalizedAuthMailer(useCases.mailer, locale, body.username);
// Pasar localizedMailer al caso de uso en lugar del mailer original
```

> **Nota:** dado que los casos de uso de auth reciben el `Mailer` por constructor (no por método), se instancian inline en la ruta con el wrapper. Esto es un patrón válido en el composition root local del handler.

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @kw/server typecheck`
Expected: sin errores.

- [ ] **Step 5: Test de integración rápido en `authRoutes.test.ts`**

Añadir un test al suite existente que verifica que la ruta de signup con `Cookie: kw_lang=es` envía un email con asunto en español:

```ts
it("signup con kw_lang=es envía email de confirmación en español", async () => {
  // Registrar un usuario nuevo con la cookie de idioma
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/signup",
    headers: { cookie: "kw_lang=es" },
    payload: {
      email: "test-es@example.com",
      username: "testies",
      password: "password123",
    },
  });
  expect(res.statusCode).toBe(201);
  // El FakeMailer del test debe haber capturado el asunto localizado
  const sent = fakeMailer.sent.at(-1);
  expect(sent?.subject).toBe("Confirma tu cuenta");
});
```

- [ ] **Step 6: Ejecutar tests del server**

Run: `pnpm --filter @kw/server test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/server/src/interfaces/http/authRoutes.ts
git commit -m "feat(server/i18n): emails de auth localizados según cookie kw_lang"
```

---

## Task 9: Migrar estilos SASS globales a CSS Module + global.scss

**Files:**
- Create: `packages/web/src/styles/variables.scss`
- Create: `packages/web/src/styles/global.scss`
- Modify: `packages/web/src/main.tsx`

> Se porta `app/static/src/scss/_variables.scss` y `app/static/src/scss/main.scss` del origen (sin Bulma). Vite ya soporta SASS nativamente con el paquete `sass` que se añadió en Task 3.

- [ ] **Step 1: Crear `packages/web/src/styles/variables.scss`**

```scss
// Portado de app/static/src/scss/_variables.scss
$blue: hsl(210, 100%, 66%);
$yellow: hsl(45, 100%, 51%);
$red: hsl(0, 93%, 74%);
$green: hsl(135, 65%, 60%);
$purple: hsl(261, 51%, 51%);
$light-grey: hsl(0, 0%, 82%);
$bg-light: hsl(0, 0%, 99.6%);
$bg-dark: hsl(0, 0%, 5.5%);

// Dark variants (for dark-mode overrides)
$dark-blue: hsl(210, 65%, 40%);
$dark-green: hsl(135, 65%, 40%);
$dark-red: hsl(0, 65%, 40%);

$is-primary: $blue;
$is-success: $green;
```

- [ ] **Step 2: Crear `packages/web/src/styles/global.scss`**

```scss
@use './variables' as *;

// ---- color helpers ----
.is-danger { background-color: $red !important; }
.is-success, .is-new { background-color: $green !important; }
.is-primary, .is-blue, .is-info { background-color: $blue; }
.is-yellow { background-color: $yellow; }

// ---- dark mode ----
body.dark-mode {
  --fg: hsl(0, 0%, 85%);
  --bg: hsl(0, 0%, 6%);
  --form-bg: hsl(0, 0%, 8%);
  --form-fg: hsl(0, 0%, 85%);
  --form-fg-placeholder: #fefefe9a;

  .is-danger { background-color: $dark-red !important; }
  .is-success { background-color: $dark-green !important; }
  .is-new { background-color: transparent !important; }
  .is-primary, .is-blue, .is-info, .tag.selected { background-color: $dark-blue !important; }

  .sheet, .card, .modal-card {
    box-shadow: 0px 0px 4px 0px rgba(255, 255, 255, 0.15);
  }

  select, option { background-color: var(--bg); }

  #nav-logo, .nav-logo-container img { filter: invert(1); }
}

// ---- typography ----
main { max-width: 96rem; }

textarea, select {
  font-family: "Averia Serif Libre", serif;
  font-size: 13pt;
}

select, select:focus {
  border: 1px solid $light-grey;
  border-radius: 4px;
  padding: .5em;
}

input {
  font-family: "Averia Serif Libre", serif !important;
  font-size: 13pt !important;
}

form input[type="number"] {
  max-width: 40px;
  padding: 0;
  font-size: 13pt;
  margin-top: .5em;
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
input[type=number] { -moz-appearance: textfield; }

form, .form {
  display: block;
  padding: 4em;
  max-width: 940px;
  width: 100%;
  box-shadow: none;
  background-color: var(--form-bg);
}

form button { width: auto; }
p { font-size: 13pt; }
footer { margin: auto; width: 100%; }
header, footer { margin: auto; }

button, .button {
  max-width: fit-content;
  min-width: max-content;
  border-radius: 2px;
  border-width: 1.5px;
  font-weight: 600;
}

// ---- cards / sheets ----
.sheet, .card {
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);
  background-color: var(--form-bg);
}

.auth-card {
  max-width: 400px;
  margin: 0px auto;
  padding: 4em 2em;
  height: auto;
  background-color: var(--bg);
  .field { width: 100%; }
}

@media (max-width: 600px) {
  .card.auth-card { box-shadow: none; background-color: var(--bg); }
}

.auth-title {
  font-size: 1.25em;
  margin-bottom: 1.5em;
  margin-left: -15px;
}

@media (max-width: 940px) {
  .sheet { padding: 2em; box-shadow: none; }
}

.body-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 80px 0px;
  box-sizing: border-box;
}

// ---- layout utilities ----
.grid-columns-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 2.5em; row-gap: 1em; }
.justify-left { display: flex; justify-content: flex-start; }
.justify-space-between { display: flex; justify-content: space-between; }
.justify-centered { display: flex; justify-content: center; }
.text-centered { text-align: center; }
.flex-row { display: flex; gap: 1rem; margin-top: 0px; flex-wrap: wrap; }
.flex-column-centered { display: flex; flex-direction: column; justify-content: center; align-items: center; }
.full-width { width: 100%; }
.center-items { align-items: center; }
.no-margin-top { margin-top: 0px; }
.no-margin-bottom { margin-bottom: 0px; }
.no-space { margin: 0px; padding: 0px; }
.hidden { display: none !important; }
.inactive { opacity: 0.3; pointer-events: none; }
.pointer, .click-pointer { cursor: pointer !important; }
.with-whitespace { white-space: pre-line; }
.smaller-font { font-size: smaller; }
.red-text { color: rgb(255, 41, 41) !important; }
.font-weight-normal { font-weight: 400 !important; }

.row8 { display: flex; flex-direction: row; gap: 8px; align-items: center; }
.row16 { display: flex; flex-direction: row; gap: 16px; align-items: center; }
.row16spaced { display: flex; flex-direction: row; gap: 16px; align-items: center; justify-content: space-between; }
.row16spaced-top { display: flex; flex-direction: row; gap: 16px; align-items: start; justify-content: space-between; }
.row32 { display: flex; flex-direction: row; gap: 32px; align-items: center; }

// ---- dividers ----
.divider { border-bottom: 1px solid lightgray; width: 100%; margin: 48px 0px; }
.divider-small { border-bottom: 1px solid lightgray; width: 190px; margin: 10px 8px; }

// ---- text/subtitle ----
.subtitle {
  font-weight: 600;
  font-style: italic;
  font-size: 2.025rem;
}

// ---- tag ----
.tag {
  display: inline-block;
  background-color: transparent;
  color: var(--fg);
  padding: 8px;
  margin-top: 1rem;
  border: 1px solid var(--fg);
  border-radius: 2px;
  cursor: pointer;
  width: auto;
  font-size: 1.5rem;
}
.tag:disabled { opacity: 0.5; border-style: dashed; cursor: not-allowed; text-decoration: line-through; }
.tag.selected { background-color: $blue; }

.card { max-width: 20em; }
.card-content { padding: 0px; }
.errors { padding: .5em; border-radius: 4px; }

// ---- navbar ----
.navbar {
  display: flex;
  align-items: end;
  font-size: 11pt;
  margin: .5rem 2rem;
  height: 58px;
}
.nav-logo-container {
  display: flex;
  align-items: end;
  max-width: 160px;
  position: relative;
  top: 9px;
  margin: 0px;
  padding: 1em;
}
.navbar-menu { display: flex; justify-content: space-between; width: 100%; }
.navbar-start, .navbar-end { display: flex; gap: 1.5rem; margin: 0 2rem; }
.navbar-item { margin-bottom: 2px; text-decoration: none; }
.navbar-mobile-item { display: none; }

@media screen and (max-width: 760px) {
  .navbar { display: flex; justify-content: space-between; }
  .navbar-menu {
    display: none;
    flex-direction: column;
    justify-content: flex-start;
    gap: 2em;
    position: fixed;
    top: 80px;
    left: 0; right: 0; bottom: 0;
    z-index: 100;
    background-color: var(--bg);
    padding: 4em 2em;
    font-size: 14pt;
  }
  .navbar-menu.is-active { display: flex; }
  .navbar-start, .navbar-end { flex-direction: column; gap: 2em; }
  .navbar-end { flex-direction: column-reverse; }
  .navbar-item { margin: 0; }
  .navbar-mobile-item { display: block; }
  .nav-logo-container { max-width: 180px; }
}

#dark-mode-toggle, #language-toggle, #nav-mobile-button {
  margin: 0px 1em 2px 0px;
  font-size: 14pt;
  border: none;
  padding: 0px;
}

// ---- sticky save button ----
.sticky-save-button-wrapper {
  position: fixed; bottom: 0; left: 0;
  width: 100%; z-index: 100;
  padding: 1em;
  background-color: var(--form-bg);
  box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.1);
  display: flex; justify-content: center; align-items: center; gap: 2em;
}
#save-button-footer-save, #save-button-footer-cancel { margin: 0; }

// ---- modals ----
.modal { display: none; }
.modal.is-active { display: block; }
.modal-card { max-width: 460px; }
.modal-card-head { padding: 0; }
.modal-card-body { padding: 0 .7rem; }
.modal-card-foot { flex-direction: row; }
.notification { background-color: rgba(0, 0, 0, 0.8); }

// ---- homepage ----
.homepage-title { font-size: 42pt; }
@media (max-width: 600px) { .homepage-title { font-size: 32pt; } }
.homepage-text-container, .about-text-container {
  text-align: left; padding: 1em 2em; max-width: 800px; width: 100%;
}
.forgot-password-link { margin-top: 1em; display: inline-block; }

// ---- checkbox ----
.checkbox {
  appearance: none; -webkit-appearance: none;
  display: flex; align-content: center; justify-content: center;
  font-size: 1.7rem; padding: 0.2rem;
  border: 0.20rem solid color-mix(in lab, transparent 30%, var(--fg));
  border-radius: 0.5rem;
}
.checkbox::before {
  content: "";
  width: 1.3rem; height: 1.3rem;
  clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
  transform: scale(0);
  background-color: var(--fg);
}
.checkbox:checked::before { transform: scale(1); }

// ---- buttons ----
.small-icon-button {
  border: none; width: 19px; height: 19px; cursor: pointer;
  color: color-mix(in lab, transparent 60%, var(--fg));
}
.small-icon-button:hover { color: var(--fg); }

.sketchy-button {
  color: var(--fg);
  background-color: var(--bg);
  border: 2px solid color-mix(in lab, transparent 20%, var(--fg));
  box-shadow: 20px 38px 34px -26px hsla(0, 0%, 0%, .2);
  border-radius: 255px 15px 225px 15px/15px 225px 15px 255px;
  padding: 6px 16px; width: fit-content; height: fit-content; cursor: pointer;
}
.sketchy-button:hover { background-color: color-mix(in lab, transparent 90%, var(--fg)); }

// ---- ghost opacity helpers ----
.ghost20 { color: color-mix(in lab, transparent 20%, var(--fg)); }
.ghost30 { color: color-mix(in lab, transparent 30%, var(--fg)); }
.ghost40 { color: color-mix(in lab, transparent 40%, var(--fg)); }
.ghost50 { color: color-mix(in lab, transparent 50%, var(--fg)); }
.ghost20:hover, .ghost30:hover, .ghost40:hover, .ghost50:hover { color: var(--fg); }

@media (max-width: 940px) { .mobile-hidden { display: none; } }

// ---- misc inputs ----
.select-with-dice { display: flex; flex-direction: column; gap: 1rem; }
.dice-button { font-size: 20pt; margin: 0; border: none; }
.icon-in-button { font-size: 14pt; cursor: pointer; margin-left: 6px; }

.textarea { width: 100%; overflow: hidden; resize: none; min-height: 1em; }
.textarea.inplace { margin-top: 16px; }

.text-border {
  background-color: var(--bg); border-radius: 4px;
  padding: calc(.75em - 1px);
}

.left-symbol:before {
  font-family: "Noto Sans Symbols 2", sans-serif;
  content: "\1F65B  ";
}

// ---- tabs ----
.tabs {
  float: none; list-style: none; position: relative;
  margin: 16px 0 0 8px; text-align: left;
  li { float: left; display: block; }
  input[type="radio"] { position: absolute; top: 0; left: -9999px; }
  label {
    user-select: none; display: flex; justify-content: center;
    padding: 16px; border-radius: 4px 4px 0 0;
    width: 100%; height: 48px;
    border: solid 1px color-mix(in lab, transparent 75%, var(--fg));
    color: color-mix(in lab, transparent 65%, var(--fg));
    cursor: pointer; position: relative; top: 1px; z-index: 10;
    &:hover { background: color-mix(in lab, transparent 95%, var(--fg)); }
  }
  .tab-content {
    z-index: 2; display: none; overflow: hidden;
    width: 100%; padding: 16px;
    position: absolute; top: 48px; left: 0;
    border: solid 1px color-mix(in lab, transparent 75%, var(--fg));
  }
  [id^="tab"]:checked + label {
    color: var(--fg);
    border-bottom: solid 1px var(--form-bg);
  }
  [id^="tab"]:checked ~ [id^="tab-content"] { display: block; }
}

.center-input { text-align: center; }
```

- [ ] **Step 3: Añadir import en `packages/web/src/main.tsx`**

Añadir la línea de import de la hoja global al inicio del fichero (antes del `createRoot`):

```tsx
import "./styles/global.scss";
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @kw/web typecheck`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/styles/variables.scss packages/web/src/styles/global.scss packages/web/src/main.tsx
git commit -m "feat(web/styles): migrar estilos SASS globales del origen (sin Bulma)"
```

---

## Task 10: Migrar estilos SCSS específicos de vistas (character, inventory, party)

**Files:**
- Create: `packages/web/src/styles/character.module.scss`
- Create: `packages/web/src/styles/inventory.module.scss`
- Create: `packages/web/src/styles/party.module.scss`

> Se portan literalmente los ficheros SCSS del origen: `character.scss`, `inventory.scss`, `party.scss`. Se usan como CSS Modules: los componentes React los importan como `import styles from '../styles/character.module.scss'` y usan `className={styles.viewCharacterSheet}`. Las clases globales (`.is-danger`, `.tag`, etc.) ya están en `global.scss`.

- [ ] **Step 1: Crear `packages/web/src/styles/character.module.scss`**

```scss
@use './variables' as *;

.view-character-sheet {
  max-width: 940px;
  padding: 4em;
}

@media (max-width: 940px) {
  .view-character-sheet { padding: 1em 1em; }
}

.character-section { margin: 1em 0px; }

.character-stats-traits-inventory {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  grid-template-areas:
    "stats inventory-container"
    "traits inventory-container";
  column-gap: 2.5em;
  margin-bottom: 1em;
}

@media (max-width: 940px) {
  .character-stats-traits-inventory {
    grid-template-areas:
      "stats stats"
      "traits traits"
      "inventory-container inventory-container";
  }
}

.character-descriptions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto auto auto;
  column-gap: 2.5em;
  grid-template-areas:
    "background bonds"
    "omens scars"
    "notes notes"
    "party party";
}

@media (max-width: 940px) {
  .character-descriptions-grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      "background"
      "bonds"
      "omens"
      "scars"
      "notes"
      "party";
  }
}

.character-print-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 2.5em;
  grid-template-rows: auto;
}
```

- [ ] **Step 2: Crear `packages/web/src/styles/inventory.module.scss`**

```scss
@use './variables' as *;

.inventory-container { grid-area: inventory-container; }

.inventory-main-slots {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.inventory-item-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 2px;
}

.inventory-item-row:hover {
  background-color: color-mix(in lab, transparent 95%, var(--fg));
}

.inventory-container-card {
  margin-top: 8px;
  padding: 8px;
  border: 1px solid color-mix(in lab, transparent 80%, var(--fg));
  border-radius: 4px;
}

.slot-indicator {
  font-size: 0.85rem;
  color: color-mix(in lab, transparent 40%, var(--fg));
}

.overburdened-badge {
  color: $red;
  font-weight: 700;
}

.marketplace-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1em;
}

@media (max-width: 760px) {
  .marketplace-grid { grid-template-columns: 1fr; }
}
```

- [ ] **Step 3: Crear `packages/web/src/styles/party.module.scss`**

```scss
@use './variables' as *;

.party-view {
  max-width: 940px;
  padding: 4em;
}

@media (max-width: 940px) {
  .party-view { padding: 1em; }
}

.party-member-card {
  display: flex;
  flex-direction: column;
  padding: 1em;
  border-radius: 4px;
  box-shadow: 0 0 6px 0 rgba(0, 0, 0, 0.1);
  background-color: var(--form-bg);
  gap: 0.5em;
}

.party-members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1em;
  margin-top: 1em;
}

.party-events-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25em;
}

.party-event-item {
  font-size: 0.9rem;
  color: color-mix(in lab, transparent 30%, var(--fg));
  border-left: 2px solid $blue;
  padding-left: 8px;
}

.join-code-display {
  font-family: "Courier Prime", monospace;
  font-size: 1.2rem;
  letter-spacing: 0.1em;
  padding: 0.5em 1em;
  border: 1px solid $light-grey;
  border-radius: 4px;
  background-color: var(--form-bg);
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @kw/web typecheck`
Expected: sin errores (los módulos SCSS no necesitan declaraciones de tipo con Vite).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/styles/character.module.scss packages/web/src/styles/inventory.module.scss packages/web/src/styles/party.module.scss
git commit -m "feat(web/styles): migrar SCSS de character, inventory y party como CSS Modules"
```

---

## Task 11: Aplicar traducciones en vistas de auth (useTranslation)

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

> En cada componente se añade `const { t } = useTranslation();` y se envuelven con `{t(...)}` los literales de UI visibles: labels, placeholders, títulos de botones, mensajes de error. Patrón: buscar todos los string literals de UI y reemplazarlos con la clave de traducción (que en `en` es igual al literal original).

- [ ] **Step 1: Patrón de modificación para cada fichero de auth**

Añadir al inicio del componente:

```tsx
import { useTranslation } from "react-i18next";
// ...dentro del componente:
const { t } = useTranslation();
```

Reemplazar literales por `t("...")`:
- Labels de formulario: `"Email"` → `{t("Email")}`, `"Password"` → `{t("Password")}`, etc.
- Textos de botones: `"Login"` → `{t("Login")}`, `"Sign Up"` → `{t("Sign Up")}`, etc.
- Mensajes de error visibles al usuario.

- [ ] **Step 2: Modificar `LoginPage.tsx`** — añadir `useTranslation`, traducir label `Email`, `Password`, `Keep me logged in`, `Login`, y el título de la página.

- [ ] **Step 3: Modificar `SignupPage.tsx`** — traducir `Email`, `Username`, `Password`, `Confirm password`, `Signup Code`, `Sign Up`.

- [ ] **Step 4: Modificar `ResendConfirmationPage.tsx`** — traducir `Email`, `Resend Confirmation`.

- [ ] **Step 5: Modificar `RequestPasswordResetPage.tsx`** — traducir `Email`, `Reset Password`.

- [ ] **Step 6: Modificar `ResetPasswordPage.tsx`** — traducir `New Password`, `Confirm password`, `Reset Password`.

- [ ] **Step 7: Modificar `AccountPage.tsx`** — traducir `Account`, `Change`, `Delete`.

- [ ] **Step 8: Modificar `ChangePasswordPage.tsx`** — traducir `Current Password`, `New password`, `Confirm new password`, `Change`.

- [ ] **Step 9: Modificar `ChangeEmailPage.tsx`** — traducir `Email`, `Confirm password`, `Change`.

- [ ] **Step 10: Modificar `DeleteAccountPage.tsx`** — traducir `Password`, `Delete`, `Cancel`.

- [ ] **Step 11: Typecheck**

Run: `pnpm --filter @kw/web typecheck`
Expected: sin errores.

- [ ] **Step 12: Commit**

```bash
git add packages/web/src/auth
git commit -m "feat(web/i18n): traducir vistas de auth con useTranslation"
```

---

## Task 12: Aplicar traducciones en vistas de personaje, inventario y partida

**Files:**
- Modify: `packages/web/src/characters/CharacterListPage.tsx`
- Modify: `packages/web/src/characters/CharacterViewPage.tsx`
- Modify: `packages/web/src/characters/CharacterEditPage.tsx`
- Modify: `packages/web/src/characters/create/CharacterCreatePage.tsx`
- Modify: `packages/web/src/inventory/InventoryEditorPage.tsx`
- Modify: `packages/web/src/inventory/ContainerView.tsx`
- Modify: `packages/web/src/inventory/MarketplaceModal.tsx`
- Modify: `packages/web/src/parties/PartyListPage.tsx`
- Modify: `packages/web/src/parties/PartyCreatePage.tsx`
- Modify: `packages/web/src/parties/PartyEditPage.tsx`
- Modify: `packages/web/src/parties/PartyViewPage.tsx`
- Modify: `packages/web/src/parties/JoinPartyPage.tsx`

> Mismo patrón que Task 11: `useTranslation` + `t("...")` en todos los literales de UI. Claves clave:
> - Atributos: `"Strength"`, `"Dexterity"`, `"Willpower"`, `"HP"`, `"Gold"`, `"Armor"`.
> - Inventario: `"Items"`, `"Containers"`, `"petty"`, `"bulky"`, `"1 Armor"`, `"2 Armor"`, `"3 Armor"`, `"Overburdened"`, `"Slots"`.
> - Acciones: `"Save"`, `"Save Character"`, `"Delete"`, `"Cancel"`, `"Edit"`, `"Print"`, `"Export"`, `"Import"`, `"Transfer"`, `"Buy"`.
> - Partidas: `"Party Code"`, `"Create Party"`, `"Join Party"`, `"Leave Party"`.
> - Tags de dados: `"d6"`, `"d8"`, `"d10"`, `"d12"`.

- [ ] **Step 1: Modificar `CharacterListPage.tsx`** — traducir `"Characters"`, `"Create Character"`, `"Delete"`, `"Edit"`.

- [ ] **Step 2: Modificar `CharacterViewPage.tsx`** — traducir atributos (`"Strength"`, `"Dexterity"`, `"Willpower"`, `"HP"`, `"Gold"`, `"Armor"`), secciones (`"Traits"`, `"Bonds"`, `"Omens"`, `"Scars"`, `"Notes"`), acciones (`"Edit"`, `"Print"`, `"Export"`, `"Delete"`).

- [ ] **Step 3: Modificar `CharacterEditPage.tsx`** — traducir labels de formulario y botones.

- [ ] **Step 4: Modificar `CharacterCreatePage.tsx`** — traducir pasos y labels del wizard (`"Background"`, `"Name"`, `"Custom Background"`, `"Custom Name"`, atributos, etc.).

- [ ] **Step 5: Modificar `InventoryEditorPage.tsx`** — traducir `"Inventory"`, `"Overburdened"`, `"Save"`, `"Transfer"`, `"Marketplace"`.

- [ ] **Step 6: Modificar `ContainerView.tsx`** — traducir tags de items (`"petty"`, `"bulky"`, `"1 Armor"`, `"2 Armor"`, `"3 Armor"`, `"uses"`, `"charges"`, `"blast"`, dados), `"Slots"`.

- [ ] **Step 7: Modificar `MarketplaceModal.tsx`** — traducir `"Marketplace"`, `"Cost"`, `"Buy"`, `"Armor"`, `"Cancel"`.

- [ ] **Step 8: Modificar `PartyListPage.tsx`** — traducir `"Parties"`, `"Create Party"`, `"Join Party"`.

- [ ] **Step 9: Modificar `PartyCreatePage.tsx`` y `PartyEditPage.tsx`** — traducir `"Name"`, `"Description"`, `"Notes"`, `"Save Party"`, `"Cancel"`.

- [ ] **Step 10: Modificar `PartyViewPage.tsx`** — traducir `"Party Code"`, `"Leave Party"`, `"Notes"`, `"Items"`, `"Inventory"`.

- [ ] **Step 11: Modificar `JoinPartyPage.tsx`** — traducir `"Party Code"`, `"Join Party"`, `"Cancel"`.

- [ ] **Step 12: Typecheck**

Run: `pnpm --filter @kw/web typecheck`
Expected: sin errores.

- [ ] **Step 13: Commit**

```bash
git add packages/web/src/characters packages/web/src/inventory packages/web/src/parties
git commit -m "feat(web/i18n): traducir vistas de personaje, inventario y partida"
```

---

## Task 13: Aplicar traducciones en vistas de herramientas y paridad final de vistas

**Files:**
- Modify: `packages/web/src/generators/ToolsPage.tsx`
- Modify: `packages/web/src/generators/GeneratorTablePanel.tsx`
- Modify: `packages/web/src/generators/NpcGeneratorPanel.tsx`
- Modify: `packages/web/src/generators/DiceModal.tsx`
- Modify: `packages/web/src/characters/ImportCharacterPage.tsx`
- Modify: `packages/web/src/characters/PrintCharacterPage.tsx`

> Traducciones restantes: herramientas/generadores, modales de dados, import/export, impresión. También se añade la ruta `/tools` en `App.tsx` si no está, y se verifica paridad de rutas con el origen.

- [ ] **Step 1: Modificar `ToolsPage.tsx`** — traducir `"Tools"`, `"Generators"`, `"Dice"`.

- [ ] **Step 2: Modificar `GeneratorTablePanel.tsx`** — traducir `"Roll"` y nombres de tablas.

- [ ] **Step 3: Modificar `NpcGeneratorPanel.tsx`** — traducir `"Generators"`, `"Roll"`.

- [ ] **Step 4: Modificar `DiceModal.tsx`** — traducir `"Dice"`, `"Roll"`, valores de dado (`"d6"`, `"d8"`, `"d10"`, `"d12"`).

- [ ] **Step 5: Modificar `ImportCharacterPage.tsx`** — traducir `"Import"`, `"Cancel"`.

- [ ] **Step 6: Modificar `PrintCharacterPage.tsx`** — traducir `"Print"`, atributos del personaje.

- [ ] **Step 7: Verificar rutas en `App.tsx` — paridad completa**

Comprobar que todas las rutas del origen tienen su equivalente:
- `/` Home
- `/login`, `/signup`, `/resend-confirmation`, `/reset-request`, `/reset`
- `/account`, `/account/change-password`, `/account/change-email`, `/account/delete`
- `/characters`, `/characters/new`, `/characters/:id`, `/characters/:id/edit`, `/characters/:id/inventory`, `/characters/:id/print`, `/characters/import`
- `/parties`, `/parties/new`, `/parties/join`, `/parties/:id`, `/parties/:id/edit`
- `/tools` (generadores + dados)

Añadir las rutas que falten en `App.tsx`:

```tsx
<Route path="/characters/:id/print" element={<PrintCharacterPage />} />
<Route path="/characters/import" element={<ImportCharacterPage />} />
<Route path="/tools" element={<ToolsPage />} />
```

- [ ] **Step 8: Typecheck**

Run: `pnpm --filter @kw/web typecheck`
Expected: sin errores.

- [ ] **Step 9: Commit**

```bash
git add packages/web/src/generators packages/web/src/characters/ImportCharacterPage.tsx packages/web/src/characters/PrintCharacterPage.tsx packages/web/src/App.tsx
git commit -m "feat(web/i18n): traducir herramientas/generadores/impresión; paridad de rutas completa"
```

---

## Task 14: Verificación final — tests completos y typecheck del monorepo

**Files:**
- No se crean ficheros nuevos; se ejecutan todos los tests del monorepo.

- [ ] **Step 1: Ejecutar todos los tests del monorepo**

Run: `pnpm test`
Expected: PASS en todos los paquetes (`@kw/core`, `@kw/shared`, `@kw/server`, `@kw/web`). Sin ningún test en FAIL.

- [ ] **Step 2: Typecheck global**

Run: `pnpm typecheck`
Expected: sin errores en ningún paquete.

- [ ] **Step 3: Verificación manual del selector de idioma**

Arrancar el servidor y la web:

Run (terminal 1): `pnpm --filter @kw/server dev`
Run (terminal 2): `pnpm --filter @kw/web dev`

Abrir `http://127.0.0.1:5173`:
- El `<select id="lang-selector">` debe estar visible en el nav.
- Cambiar a `Español` → los labels de la página se actualizan.
- Recargar la página → el idioma se mantiene (cookie `kw_lang=es` persistida).
- Cambiar de vuelta a `English` → los labels vuelven al inglés.

- [ ] **Step 4: Commit final**

```bash
git add .
git commit -m "chore(fase8): verificación final — tests en verde, typecheck limpio"
```

---

## Self-Review (cobertura del spec)

### Alcance cubierto

| Ítem del alcance | Tareas que lo cubren |
|---|---|
| Conversión `.po` → JSON (en/de/es/pl/pt_BR) | Task 2 |
| Configuración i18next + react-i18next | Task 3 |
| Selector de idioma con cookie `kw_lang` | Task 4 |
| Fallback `en` cuando msgstr vacío | Task 3 (opción `fallbackLng: 'en'`) |
| Integración en árbol React | Task 5 |
| Traducciones de emails del servidor | Tasks 6, 7, 8 |
| Migración SASS globales (sin Bulma) | Task 9 |
| Migración SASS específicos de vistas | Task 10 |
| Traducción de vistas auth | Task 11 |
| Traducción de vistas personaje/inventario/partida | Task 12 |
| Traducción de herramientas/generadores | Task 13 |
| Paridad de rutas completa | Task 13 |
| Verificación final | Task 14 |

### Ausencia de placeholders

Todos los steps que tocan código incluyen la implementación completa. Los JSON de traducción contienen las cadenas reales (no `"TODO"`). Los SCSS están portados íntegros del origen.

### Consistencia de tipos y firmas

- `Locale` y `parseLocale` definidos en `@kw/shared` → importados por `@kw/web` (`LanguageSelector.tsx`, `main.tsx`) y `@kw/server` (`emailTranslations.ts`). Sin duplicación.
- `EmailMessage` de `@kw/core` → `emailTranslations.ts` devuelve `EmailMessage` (campo `to: ""` porque lo fija la ruta, no la traducción).
- `LocalizedAuthMailer` implementa `Mailer` (puerto de `@kw/core`) → inyectable en cualquier caso de uso sin cambiar el dominio.
- `buildConfirmEmail` / `buildResetEmail` / `buildChangeEmailEmail` aceptan `string` como primer argumento (locale) y usan `parseLocale` internamente para el fallback → robustez ante cookies con valores inválidos.
- Los CSS Modules en `packages/web/src/styles/*.module.scss` no requieren declaraciones de tipo con Vite 5 (`*.module.scss` genera un `Record<string, string>` automáticamente).
- `i18n.test.ts` prueba la instancia real (no mocks) para verificar el comportamiento de `fallbackLng` y el cambio de idioma.
- Las tareas de traducción de vistas (11–13) usan `useTranslation()` de `react-i18next` que ya está en el árbol gracias a `I18nextProvider` (Task 5) — no se puede usar `t()` sin el provider, por eso la integración en main.tsx es anterior.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Field } from "../ui/index.js";
import { cn } from "../ui/cn.js";
import { LanguageSelector } from "../i18n/LanguageSelector.js";
import { ThemeToggle } from "./ThemeToggle.js";
import { getAnimationsEnabled, setAnimationsEnabled } from "./animations.js";

/** Switch accesible on/off (role="switch"). */
function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-(--duration-fast) ease-(--ease-emphasized) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        checked ? "bg-btn" : "bg-border"
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-surface shadow-(--shadow-card) transition-transform duration-(--duration-fast) ease-(--ease-emphasized)",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

/** Ajustes de la app: tema, animaciones e idioma. */
export function SettingsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [animations, setAnimations] = useState(getAnimationsEnabled);

  function toggleAnimations(v: boolean) {
    setAnimationsEnabled(v);
    setAnimations(v);
  }

  return (
    <Modal open={open} onClose={onClose} title={t("Settings")}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-text">{t("Theme")}</span>
          <ThemeToggle />
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-text">{t("Animations")}</span>
          <Switch
            checked={animations}
            onChange={toggleAnimations}
            label={t("Animations")}
          />
        </div>
        <Field label={t("Language")} htmlFor="lang-selector">
          <LanguageSelector />
        </Field>
      </div>
    </Modal>
  );
}

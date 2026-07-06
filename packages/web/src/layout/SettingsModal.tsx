import { useTranslation } from "react-i18next";
import { Modal, Field } from "../ui/index.js";
import { LanguageSelector } from "../i18n/LanguageSelector.js";
import { ThemeToggle } from "./ThemeToggle.js";

/** Ajustes de la app: tema e idioma, antes sueltos en la cabecera. */
export function SettingsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal open={open} onClose={onClose} title={t("Settings")}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-text">{t("Theme")}</span>
          <ThemeToggle />
        </div>
        <Field label={t("Language")} htmlFor="lang-selector">
          <LanguageSelector />
        </Field>
      </div>
    </Modal>
  );
}

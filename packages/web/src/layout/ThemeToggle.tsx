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

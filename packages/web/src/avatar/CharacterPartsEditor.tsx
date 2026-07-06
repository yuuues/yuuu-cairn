import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Card, Spinner, Button, cn } from "../ui/index.js";
import { WebGLErrorBoundary } from "./WebGLErrorBoundary.js";
import {
  CharacterForgeScene,
  SLOTS,
  defaultParts,
  type CharacterParts,
  type SlotId,
} from "./CharacterRig.js";

// Paleta de colores para los slots. Un set fijo basta para un creador básico.
const PALETTE = [
  "#9ca3af",
  "#e0b48a",
  "#3b2a1a",
  "#6b7280",
  "#7c3aed",
  "#dc2626",
  "#16a34a",
  "#2563eb",
  "#eab308",
  "#f3f4f6",
  "#111827",
];

/**
 * Editor de personaje por piezas, CONTROLADO: el estado vive en el padre
 * (`value` / `onChange`). Así lo reutilizan tanto el sandbox /avatar como la
 * página por personaje /characters/:id/avatar (que además lo guarda).
 */
export function CharacterPartsEditor({
  value,
  onChange,
}: {
  value: CharacterParts;
  onChange: (next: CharacterParts) => void;
}) {
  const { t } = useTranslation();

  const setColor = (id: SlotId, color: string) =>
    onChange({ ...value, [id]: { ...value[id], color } });
  const toggleVisible = (id: SlotId) =>
    onChange({ ...value, [id]: { ...value[id], visible: !value[id].visible } });

  return (
    <>
      <Card className="overflow-hidden p-0">
        {/* El <Canvas> ocupa todo su contenedor, así que necesita una altura
            explícita. touch-none evita que el gesto de orbitar haga scroll. */}
        <div className="h-[60vh] min-h-80 w-full touch-none">
          <WebGLErrorBoundary
            fallback={
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                <p className="font-medium text-text">
                  {t("3D preview unavailable")}
                </p>
                <p className="max-w-md text-sm text-muted">
                  {t(
                    "Your browser or device couldn't create a WebGL context. Enable hardware acceleration (and avoid remote desktop), then reload."
                  )}
                </p>
              </div>
            }
          >
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center">
                  <Spinner />
                </div>
              }
            >
              <CharacterForgeScene parts={value} />
            </Suspense>
          </WebGLErrorBoundary>
        </div>
      </Card>

      <div className="mt-4 space-y-3">
        {SLOTS.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-2">
            <span className="w-20 shrink-0 text-sm text-text">{t(s.label)}</span>
            <div className="flex flex-wrap gap-1">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(s.id, c)}
                  aria-label={c}
                  style={{ backgroundColor: c }}
                  className={cn(
                    "h-6 w-6 rounded-lg border transition-transform duration-(--duration-fast) ease-(--ease-emphasized) active:scale-[0.9]",
                    value[s.id].color === c
                      ? "ring-2 ring-accent"
                      : "border-border"
                  )}
                />
              ))}
            </div>
            {s.hideable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleVisible(s.id)}
              >
                {value[s.id].visible ? t("Hide") : t("Show")}
              </Button>
            )}
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={() => onChange(defaultParts)}>
          {t("Reset")}
        </Button>
      </div>

      <p className="mt-3 text-sm text-muted">
        {t("Drag to orbit · scroll to zoom")}
      </p>
    </>
  );
}

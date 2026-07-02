import { Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { Container, Card, Spinner, Button, cn } from "../ui/index.js";
import { WebGLErrorBoundary } from "./WebGLErrorBoundary.js";
import { CharacterPartsEditor } from "./CharacterPartsEditor.js";
import {
  AvatarForgeScene,
  ROBOT_CLIPS,
  type RobotClip,
} from "./AvatarForgeScene.js";
import { defaultParts, type CharacterParts } from "./CharacterRig.js";

type Tab = "parts" | "anim";

/**
 * Banco de pruebas de ThreeJS / react-three-fiber (no ligado a ningún
 * personaje). Reutiliza el mismo <CharacterPartsEditor> que la página por
 * personaje. Dos modos:
 *  - "parts": creador de personajes por piezas (dirigido por datos).
 *  - "anim":  el robot .glb con sus animaciones.
 */
export function AvatarForgePage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("parts");
  const [clip, setClip] = useState<RobotClip>("Idle");
  const [parts, setParts] = useState<CharacterParts>(defaultParts);

  const tabClass = (active: boolean) =>
    cn(
      "rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium",
      active
        ? "border-accent text-accent"
        : "border-transparent text-muted hover:text-text"
    );

  return (
    <Container className="max-w-3xl">
      <h1 className="mb-4 font-serif text-3xl text-text">
        {t("Avatar Forge")}
      </h1>

      <div role="tablist" className="mb-4 flex gap-2 border-b border-border">
        <button
          role="tab"
          aria-selected={tab === "parts"}
          onClick={() => setTab("parts")}
          className={tabClass(tab === "parts")}
        >
          {t("Parts")}
        </button>
        <button
          role="tab"
          aria-selected={tab === "anim"}
          onClick={() => setTab("anim")}
          className={tabClass(tab === "anim")}
        >
          {t("Animation")}
        </button>
      </div>

      {tab === "parts" ? (
        <CharacterPartsEditor value={parts} onChange={setParts} />
      ) : (
        <>
          <Card className="overflow-hidden p-0">
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
                  <AvatarForgeScene clip={clip} />
                </Suspense>
              </WebGLErrorBoundary>
            </div>
          </Card>
          <div className="mt-4 flex flex-wrap gap-2">
            {ROBOT_CLIPS.map((c) => (
              <Button
                key={c}
                variant={c === clip ? "primary" : "ghost"}
                size="sm"
                onClick={() => setClip(c)}
              >
                {c}
              </Button>
            ))}
          </div>
        </>
      )}
    </Container>
  );
}

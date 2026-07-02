import { useEffect } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { SceneShell } from "./SceneShell.js";

/**
 * Paso 2 de la ruta de aprendizaje: cargar un modelo .glb real con useGLTF
 * y reproducir sus animaciones con useAnimations. El modelo (RobotExpressive,
 * licencia CC0 de three.js) vive en /public/models y se sirve como asset
 * estático, así que también funciona en modo local/offline.
 *
 * Cuando quieras tu propio personaje de Rol, basta con sustituir el .glb y
 * actualizar la lista de clips de abajo: el resto del andamiaje no cambia.
 */

const MODEL_URL = "/models/RobotExpressive.glb";

// Clips de animación que trae este modelo concreto. Si cambias de .glb,
// cambia esta lista por los nombres de animación del nuevo modelo.
export const ROBOT_CLIPS = ["Idle", "Wave", "Dance", "Running", "Jump"] as const;
export type RobotClip = (typeof ROBOT_CLIPS)[number];

function RobotAvatar({ clip }: { clip: RobotClip }) {
  // useGLTF cachea el modelo: cargarlo varias veces no lo re-descarga.
  const { scene, animations } = useGLTF(MODEL_URL);
  // useAnimations conecta los clips del .glb a un AnimationMixer y los corre
  // dentro del bucle de render de fiber automáticamente.
  const { actions } = useAnimations(animations, scene);

  useEffect(() => {
    const action = actions[clip];
    if (!action) return;
    // fadeIn/fadeOut = transición suave entre animaciones en vez de un corte seco.
    action.reset().fadeIn(0.3).play();
    return () => {
      action.fadeOut(0.3);
    };
  }, [actions, clip]);

  // primitive = "mete este objeto three.js tal cual en la escena de fiber".
  return <primitive object={scene} scale={0.5} position={[0, -1, 0]} />;
}

export function AvatarForgeScene({ clip }: { clip: RobotClip }) {
  return (
    <SceneShell>
      <RobotAvatar clip={clip} />
    </SceneShell>
  );
}

// Pre-carga el modelo para que esté listo antes de montar el <Canvas>.
useGLTF.preload(MODEL_URL);

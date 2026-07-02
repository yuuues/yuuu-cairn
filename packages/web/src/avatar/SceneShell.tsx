import type { ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

/**
 * Andamiaje 3D compartido: el <Canvas> (renderer) + cámara + luces + suelo +
 * OrbitControls. Lo reutilizan tanto la escena del robot animado como el
 * creador de personajes por piezas; solo cambia lo que metes dentro (children).
 */
export function SceneShell({
  children,
  cameraPosition = [3, 2, 5],
}: {
  children: ReactNode;
  cameraPosition?: [number, number, number];
}) {
  return (
    <Canvas
      camera={{ position: cameraPosition, fov: 50 }}
      // dpr limitado: en el webview de Android (Capacitor) conviene no
      // renderizar a resolución completa en pantallas de alta densidad.
      dpr={[1, 2]}
      gl={{
        // "default" en vez de "high-performance": en GPUs con el camino
        // degradado (HW accel off, RDP→Direct3D9) pedir alto rendimiento
        // puede hacer que falle la creación del contexto.
        powerPreference: "default",
        // No abortar si el navegador solo ofrece un contexto "lento"
        // (software/SwiftShader): mejor lento que nada.
        failIfMajorPerformanceCaveat: false,
      }}
    >
      {/* Luces: ambient da relleno global; directional crea sombras/relieve. */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 5, 5]} intensity={1.4} />

      {children}

      {/* Rejilla de suelo como referencia espacial al orbitar. */}
      <gridHelper args={[10, 10, "#4b5563", "#374151"]} position={[0, -1, 0]} />

      {/* Arrastra para orbitar, rueda para zoom. */}
      <OrbitControls enablePan={false} minDistance={2} maxDistance={12} />
    </Canvas>
  );
}

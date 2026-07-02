import type { Avatar } from "@kw/shared";
import { SceneShell } from "./SceneShell.js";

/**
 * Paso 3: creador de personajes por PIEZAS, dirigido por datos.
 *
 * La idea clave (la misma que usan HeroForge/Picrew por dentro): un personaje
 * NO es un modelo monolítico, es una lista de "slots" (cuerpo, cabeza, pelo,
 * armadura, arma), y cada slot tiene opciones (color, visible). La geometría
 * de aquí son primitivas-placeholder; el día que las cambies por GLBs reales,
 * este modelo de datos (SLOTS / CharacterParts) NO cambia. Eso es lo que se
 * aprende en este paso, no las cajas y esferas.
 */

export interface Slot {
  id: string;
  /** Clave i18n para la etiqueta del slot. */
  label: string;
  /** Si false, el slot es estructural y no se puede ocultar (cuerpo, cabeza). */
  hideable: boolean;
  defaultColor: string;
}

export const SLOTS = [
  { id: "body", label: "Body", hideable: false, defaultColor: "#9ca3af" },
  { id: "head", label: "Head", hideable: false, defaultColor: "#e0b48a" },
  { id: "hair", label: "Hair", hideable: true, defaultColor: "#3b2a1a" },
  { id: "armor", label: "Armor", hideable: true, defaultColor: "#6b7280" },
  { id: "weapon", label: "Weapon", hideable: true, defaultColor: "#7c3aed" },
] as const satisfies readonly Slot[];

export type SlotId = (typeof SLOTS)[number]["id"];

export interface PartState {
  color: string;
  visible: boolean;
}

export type CharacterParts = Record<SlotId, PartState>;

/** Estado inicial: cada slot con su color por defecto y visible. */
export const defaultParts: CharacterParts = Object.fromEntries(
  SLOTS.map((s) => [s.id, { color: s.defaultColor, visible: true }])
) as CharacterParts;

/** Envuelve los parts en el formato persistible (Avatar de @kw/shared). */
export function partsToAvatar(parts: CharacterParts): Avatar {
  return { v: 1, parts };
}

/**
 * Reconstruye los parts desde un Avatar guardado, fusionando sobre los
 * defaults: así los slots ausentes (o añadidos en el futuro) quedan con
 * valores sanos en vez de undefined.
 */
export function partsFromAvatar(avatar: Avatar | null | undefined): CharacterParts {
  const out = {} as CharacterParts;
  for (const s of SLOTS) {
    const stored = avatar?.parts[s.id];
    out[s.id] = stored
      ? { color: stored.color, visible: stored.visible }
      : { color: s.defaultColor, visible: true };
  }
  return out;
}

/**
 * Pinta una pieza concreta. La geometría depende del slot; el color y la
 * visibilidad vienen del estado. Devuelve null si la pieza está oculta.
 */
function Part({ id, state }: { id: SlotId; state: PartState }) {
  if (!state.visible) return null;
  const material = <meshStandardMaterial color={state.color} />;

  switch (id) {
    case "body":
      return (
        <mesh position={[0, 0.75, 0]}>
          <capsuleGeometry args={[0.3, 0.9, 8, 16]} />
          {material}
        </mesh>
      );
    case "head":
      return (
        <mesh position={[0, 1.75, 0]}>
          <sphereGeometry args={[0.28, 32, 16]} />
          {material}
        </mesh>
      );
    case "hair":
      return (
        <mesh position={[0, 1.92, 0]}>
          <sphereGeometry args={[0.31, 24, 12]} />
          {material}
        </mesh>
      );
    case "armor":
      // Coraza: una caja un pelín más ancha que el torso.
      return (
        <mesh position={[0, 0.85, 0]}>
          <boxGeometry args={[0.78, 0.7, 0.5]} />
          {material}
        </mesh>
      );
    case "weapon":
      // Bastón/espada a un lado.
      return (
        <mesh position={[0.55, 0.7, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 1.6, 8]} />
          {material}
        </mesh>
      );
    default:
      return null;
  }
}

export function CharacterRig({ parts }: { parts: CharacterParts }) {
  // group desplazado para que los pies queden sobre la rejilla (y = -1).
  return (
    <group position={[0, -1, 0]}>
      {SLOTS.map((s) => (
        <Part key={s.id} id={s.id} state={parts[s.id]} />
      ))}
    </group>
  );
}

export function CharacterForgeScene({ parts }: { parts: CharacterParts }) {
  return (
    <SceneShell cameraPosition={[3.5, 1.5, 4.5]}>
      <CharacterRig parts={parts} />
    </SceneShell>
  );
}

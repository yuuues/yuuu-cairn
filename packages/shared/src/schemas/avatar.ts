import { z } from "zod";

/**
 * Avatar 3D del personaje. El modelo de datos es deliberadamente agnóstico de
 * la representación: una lista de "slots" (cuerpo, cabeza, pelo, armadura,
 * arma…) con sus opciones. Hoy se pinta con primitivas; cuando se cambien por
 * GLBs reales, este schema NO cambia.
 *
 * El campo `v` versiona SOLO el formato del avatar, de forma independiente al
 * `schemaVersion` global del personaje: así el avatar puede evolucionar sin
 * forzar una nueva versión de toda la ficha.
 */

export const PartStateSchema = z.object({
  color: z.string(),
  visible: z.boolean(),
});
export type PartState = z.infer<typeof PartStateSchema>;

/** Mapa slotId -> estado de la pieza. Clave libre para tolerar slots nuevos. */
export const CharacterPartsSchema = z.record(z.string(), PartStateSchema);
export type CharacterParts = z.infer<typeof CharacterPartsSchema>;

export const AvatarSchema = z.object({
  v: z.literal(1),
  parts: CharacterPartsSchema,
});
export type Avatar = z.infer<typeof AvatarSchema>;

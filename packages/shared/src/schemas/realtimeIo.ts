import { z } from "zod";

/** Payload del evento WS `roll_dice` (paridad: { character_id, party_id, roll }). */
export const RollDiceInputSchema = z.object({
  characterId: z.coerce.number().int(),
  partyId: z.coerce.number().int(),
  roll: z.string().min(1),
});

export type RollDiceInput = z.infer<typeof RollDiceInputSchema>;

/** Mensaje emitido en el evento WS `dice_rolled` (string, paridad con el origen). */
export type DiceRolledMessage = string;

/** Nombres de eventos del canal de tiempo real (contrato cliente↔servidor). */
export const RealtimeEvents = {
  register: "register",
  rollDice: "roll_dice",
  diceRolled: "dice_rolled",
} as const;

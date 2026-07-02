import { describe, it, expect } from "vitest";
import {
  serializeCharacter, parseCharacterEnvelope, CHARACTER_SCHEMA_VERSION,
} from "./characterExport.js";
import type { Character } from "./character.js";

const sample: Character = {
  id: 1, ownerId: 1, name: "Test", background: "foundling",
  strength: 10, strengthMax: 10, dexterity: 10, dexterityMax: 10,
  willpower: 10, willpowerMax: 10, hp: 4, hpMax: 4, deprived: false,
  panicked: false, gold: 0, items: [], containers: [], description: null,
  traits: null, notes: null, bonds: null, scars: "", omens: null,
  armor: "0", imageUrl: null, partyId: null,
};

describe("characterExport", () => {
  it("round-trip serialize -> parse preserva el payload", () => {
    const json = serializeCharacter(sample);
    const env = parseCharacterEnvelope(json);
    expect(env.schemaVersion).toBe(CHARACTER_SCHEMA_VERSION);
    expect(env.payload.name).toBe(sample.name);
  });

  it("rechaza JSON con kind incorrecto", () => {
    expect(() => parseCharacterEnvelope(JSON.stringify({ kind: "x" }))).toThrow();
  });

  it("rechaza schemaVersion futura", () => {
    const bad = JSON.stringify({
      kind: "cairn-character", schemaVersion: 999, exportedAt: "", payload: sample,
    });
    expect(() => parseCharacterEnvelope(bad)).toThrow();
  });

  it("conserva el avatar en el round-trip (v2)", () => {
    const withAvatar: Character = {
      ...sample,
      avatar: { v: 1, parts: { body: { color: "#ffffff", visible: true } } },
    };
    const env = parseCharacterEnvelope(serializeCharacter(withAvatar));
    expect(env.schemaVersion).toBe(2);
    expect(env.payload.avatar?.parts.body?.color).toBe("#ffffff");
  });

  it("sigue importando exports v1 (sin avatar)", () => {
    const v1 = JSON.stringify({
      kind: "cairn-character", schemaVersion: 1, exportedAt: "", payload: sample,
    });
    const env = parseCharacterEnvelope(v1);
    expect(env.payload.avatar ?? null).toBeNull();
  });
});

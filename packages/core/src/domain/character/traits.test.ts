import { describe, it, expect } from "vitest";
import { traitsText, type TraitValue } from "./traits.js";

const tv = (name: string, value: string): TraitValue => ({ name, value });

describe("traitsText", () => {
  const traits: TraitValue[] = [
    tv("Physique", "Athletic"),
    tv("Skin", "Tanned"),
    tv("Hair", "Braided"),
    tv("Face", "Broken"),
    tv("Speech", "Booming"),
    tv("Clothing", "Antique"),
    tv("Virtue", "Ambitious"),
    tv("Vice", "Aggressive"),
  ];

  it("genera el texto literal del origen", () => {
    expect(traitsText(0, traits)).toBe(
      "You have a Athletic Physique, Tanned Skin, and Braided Hair. " +
        "Your Face is Broken, your Speech Booming. " +
        "You have Antique Clothing. You are Ambitious and Aggressive. "
    );
  });

  it("añade la frase de edad cuando age > 0", () => {
    expect(traitsText(24, traits)).toContain("You are 24 years old.");
  });

  it("no añade edad cuando age es 0", () => {
    expect(traitsText(0, traits)).not.toContain("years old");
  });
});

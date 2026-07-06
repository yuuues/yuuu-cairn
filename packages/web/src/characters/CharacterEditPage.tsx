import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { UpdateCharacterInput } from "@kw/shared";
import { useCharacter, useUpdateCharacter } from "./useCharacters.js";
import { Container, Card, Field, Input, Textarea, Button, Skeleton } from "../ui/index.js";
import { StatField, ATTR_DICE, HP_DICE } from "../dice/StatField.js";

export function CharacterEditPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const charId = Number(id);
  const navigate = useNavigate();
  const { data: character, isLoading } = useCharacter(charId);
  const update = useUpdateCharacter(charId);
  const [form, setForm] = useState<UpdateCharacterInput>({});

  useEffect(() => {
    if (character) {
      setForm({
        name: character.name,
        strength: character.strength,
        strengthMax: character.strengthMax,
        dexterity: character.dexterity,
        dexterityMax: character.dexterityMax,
        willpower: character.willpower,
        willpowerMax: character.willpowerMax,
        hp: character.hp,
        hpMax: character.hpMax,
        deprived: character.deprived,
        panicked: character.panicked,
        gold: character.gold,
        description: character.description,
        traits: character.traits,
        notes: character.notes,
        bonds: character.bonds,
        scars: character.scars,
        omens: character.omens,
      });
    }
  }, [character]);

  if (isLoading || !character)
    return (
      <Container className="max-w-2xl">
        <Card className="flex flex-col gap-4">
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-11 w-1/3" />
        </Card>
      </Container>
    );

  const setNum =
    (key: keyof UpdateCharacterInput) =>
    (value: number) =>
      setForm((f) => ({ ...f, [key]: value }));
  const str =
    (key: keyof UpdateCharacterInput) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  const bool =
    (key: keyof UpdateCharacterInput) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.checked }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await update.mutateAsync(form);
    navigate(`/characters/${charId}`);
  };

  return (
    <Container className="max-w-2xl">
      <Card>
        <h1 className="mb-6 font-serif text-2xl text-text">Edit {character.name}</h1>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label={t("Name")} htmlFor="edit-name">
            <Input
              id="edit-name"
              value={form.name ?? ""}
              onChange={str("name")}
            />
          </Field>

          {/* Atributos: se pulsan para tirar dados o escribir el valor */}
          <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <legend className="px-1 text-sm font-medium text-text">{t("Attributes")}</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatField label={t("Strength")} value={form.strength ?? 0} preset={ATTR_DICE} onChange={setNum("strength")} />
              <StatField label={`${t("Strength")} Max`} value={form.strengthMax ?? 0} preset={ATTR_DICE} onChange={setNum("strengthMax")} />
              <StatField label={t("Dexterity")} value={form.dexterity ?? 0} preset={ATTR_DICE} onChange={setNum("dexterity")} />
              <StatField label={`${t("Dexterity")} Max`} value={form.dexterityMax ?? 0} preset={ATTR_DICE} onChange={setNum("dexterityMax")} />
              <StatField label={t("Willpower")} value={form.willpower ?? 0} preset={ATTR_DICE} onChange={setNum("willpower")} />
              <StatField label={`${t("Willpower")} Max`} value={form.willpowerMax ?? 0} preset={ATTR_DICE} onChange={setNum("willpowerMax")} />
              <StatField label={t("HP")} value={form.hp ?? 0} preset={HP_DICE} onChange={setNum("hp")} />
              <StatField label={`${t("HP")} Max`} value={form.hpMax ?? 0} preset={HP_DICE} onChange={setNum("hpMax")} />
            </div>
          </fieldset>

          <StatField label={t("Gold")} value={form.gold ?? 0} preset={ATTR_DICE} onChange={setNum("gold")} className="w-full" />

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm font-medium text-text">
              <input
                type="checkbox"
                checked={form.deprived ?? false}
                onChange={bool("deprived")}
                className="h-4 w-4 rounded border-border"
              />
              {t("Deprived")}
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-text">
              <input
                type="checkbox"
                checked={form.panicked ?? false}
                onChange={bool("panicked")}
                className="h-4 w-4 rounded border-border"
              />
              {t("Panicked")}
            </label>
          </div>

          <Field label={t("Description")} htmlFor="edit-description">
            <Textarea id="edit-description" value={form.description ?? ""} onChange={str("description")} />
          </Field>
          <Field label={t("Traits")} htmlFor="edit-traits">
            <Textarea id="edit-traits" value={form.traits ?? ""} onChange={str("traits")} />
          </Field>
          <Field label={t("Bonds")} htmlFor="edit-bonds">
            <Textarea id="edit-bonds" value={form.bonds ?? ""} onChange={str("bonds")} />
          </Field>
          <Field label={t("Omens")} htmlFor="edit-omens">
            <Textarea id="edit-omens" value={form.omens ?? ""} onChange={str("omens")} />
          </Field>
          <Field label={t("Scars")} htmlFor="edit-scars">
            <Textarea id="edit-scars" value={form.scars ?? ""} onChange={str("scars")} />
          </Field>
          <Field label={t("Notes")} htmlFor="edit-notes">
            <Textarea id="edit-notes" value={form.notes ?? ""} onChange={str("notes")} />
          </Field>

          {update.isError && (
            <p role="alert" className="text-sm text-danger">
              Failed to save.
            </p>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={update.isPending}>
              {t("Save Character")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(`/characters/${charId}`)}
            >
              {t("Cancel")}
            </Button>
          </div>
        </form>
      </Card>
    </Container>
  );
}

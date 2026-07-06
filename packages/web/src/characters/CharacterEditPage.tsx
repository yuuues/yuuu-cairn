import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { UpdateCharacterInput } from "@kw/shared";
import { useCharacter, useUpdateCharacter } from "./useCharacters.js";
import { Container, Card, Field, Input, Textarea, Button, Skeleton } from "../ui/index.js";

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

  const num =
    (key: keyof UpdateCharacterInput) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: Number(e.target.value) }));
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

          <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <legend className="px-1 text-sm font-medium text-text">Attributes</legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label={t("Strength")} htmlFor="edit-str">
                <Input id="edit-str" type="number" value={form.strength ?? 0} onChange={num("strength")} />
              </Field>
              <Field label={`${t("Strength")} Max`} htmlFor="edit-str-max">
                <Input id="edit-str-max" type="number" value={form.strengthMax ?? 0} onChange={num("strengthMax")} />
              </Field>
              <Field label={t("Dexterity")} htmlFor="edit-dex">
                <Input id="edit-dex" type="number" value={form.dexterity ?? 0} onChange={num("dexterity")} />
              </Field>
              <Field label={`${t("Dexterity")} Max`} htmlFor="edit-dex-max">
                <Input id="edit-dex-max" type="number" value={form.dexterityMax ?? 0} onChange={num("dexterityMax")} />
              </Field>
              <Field label={t("Willpower")} htmlFor="edit-wil">
                <Input id="edit-wil" type="number" value={form.willpower ?? 0} onChange={num("willpower")} />
              </Field>
              <Field label={`${t("Willpower")} Max`} htmlFor="edit-wil-max">
                <Input id="edit-wil-max" type="number" value={form.willpowerMax ?? 0} onChange={num("willpowerMax")} />
              </Field>
              <Field label={t("HP")} htmlFor="edit-hp">
                <Input id="edit-hp" type="number" value={form.hp ?? 0} onChange={num("hp")} />
              </Field>
              <Field label={`${t("HP")} Max`} htmlFor="edit-hp-max">
                <Input id="edit-hp-max" type="number" value={form.hpMax ?? 0} onChange={num("hpMax")} />
              </Field>
            </div>
          </fieldset>

          <Field label={t("Gold")} htmlFor="edit-gold">
            <Input id="edit-gold" type="number" value={form.gold ?? 0} onChange={num("gold")} />
          </Field>

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

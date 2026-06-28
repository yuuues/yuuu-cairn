import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { CreateCharacterInput } from "@kw/shared";
import {
  useBackgrounds,
  useRollCharacter,
  useCreateCharacter,
} from "../useCharacters.js";
import { Container, Card, Field, Input, Select, Badge, Button, Spinner } from "../../ui/index.js";

type Step = "background" | "review";

const emptyDraft = (background: string): CreateCharacterInput => ({
  name: "",
  background,
  strengthMax: 10,
  dexterityMax: 10,
  willpowerMax: 10,
  hpMax: 1,
  gold: 0,
  items: [],
  containers: [{ id: 0, name: "Main", slots: 10 }],
  description: null,
  traits: null,
  notes: null,
  bonds: null,
  omens: null,
  imageUrl: "default-portrait.webp",
});

function Stepper({ step }: { step: Step }) {
  const { t } = useTranslation();
  return (
    <ol className="mb-6 flex items-center gap-4 text-sm">
      <li className={step === "background" ? "font-semibold text-accent" : "text-muted"}>
        1. {t("Background")}
      </li>
      <li aria-hidden className="text-muted">→</li>
      <li className={step === "review" ? "font-semibold text-accent" : "text-muted"}>
        2. {t("Review")}
      </li>
    </ol>
  );
}

export function CharacterCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: backgrounds } = useBackgrounds();
  const roll = useRollCharacter();
  const create = useCreateCharacter();

  const [step, setStep] = useState<Step>("background");
  const [selected, setSelected] = useState("");
  const [draft, setDraft] = useState<CreateCharacterInput | null>(null);

  const rollWith = async (background: string) => {
    const d = await roll.mutateAsync(background);
    setDraft(d);
    setStep("review");
  };

  const startManual = () => {
    setDraft(emptyDraft(selected));
    setStep("review");
  };

  const onSave = async () => {
    if (!draft) return;
    const created = await create.mutateAsync(draft);
    navigate(`/characters/${created.id}`);
  };

  if (step === "background") {
    return (
      <Container className="max-w-lg">
        <Stepper step={step} />
        <Card className="flex flex-col gap-4">
          <h1 className="font-serif text-2xl text-text">{t("Create Character")}</h1>
          <Button
            onClick={() => rollWith("")}
            disabled={roll.isPending}
          >
            {roll.isPending ? <Spinner className="h-4 w-4" /> : null}
            Roll a random character
          </Button>
          <p className="text-sm text-muted">…or pick a {t("Background")}</p>
          <Field label={t("Background")} htmlFor="create-background">
            <Select
              id="create-background"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Select…</option>
              {backgrounds &&
                Object.keys(backgrounds).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
            </Select>
          </Field>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => rollWith(selected)}
              disabled={!selected || roll.isPending}
            >
              Roll this background
            </Button>
            <Button
              variant="secondary"
              onClick={startManual}
              disabled={!selected}
            >
              Fill manually
            </Button>
          </div>
        </Card>
      </Container>
    );
  }

  if (!draft) return null;

  const setField = <K extends keyof CreateCharacterInput>(
    key: K,
    value: CreateCharacterInput[K]
  ) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  return (
    <Container className="max-w-lg">
      <Stepper step={step} />
      <Card className="flex flex-col gap-4">
        <h1 className="font-serif text-2xl text-text">Review character</h1>
        <p className="text-sm text-muted">{t("Background")}: {draft.background}</p>

        <Field label={t("Name")} htmlFor="review-name">
          <Input
            id="review-name"
            value={draft.name}
            onChange={(e) => setField("name", e.target.value)}
          />
        </Field>

        <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <legend className="px-1 text-sm font-medium text-text">Attributes (max)</legend>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("Strength")} htmlFor="review-str">
              <Input
                id="review-str"
                type="number"
                value={draft.strengthMax}
                onChange={(e) => setField("strengthMax", Number(e.target.value))}
              />
            </Field>
            <Field label={t("Dexterity")} htmlFor="review-dex">
              <Input
                id="review-dex"
                type="number"
                value={draft.dexterityMax}
                onChange={(e) => setField("dexterityMax", Number(e.target.value))}
              />
            </Field>
            <Field label={t("Willpower")} htmlFor="review-wil">
              <Input
                id="review-wil"
                type="number"
                value={draft.willpowerMax}
                onChange={(e) => setField("willpowerMax", Number(e.target.value))}
              />
            </Field>
            <Field label={t("HP")} htmlFor="review-hp">
              <Input
                id="review-hp"
                type="number"
                value={draft.hpMax}
                onChange={(e) => setField("hpMax", Number(e.target.value))}
              />
            </Field>
          </div>
        </fieldset>

        <Field label={t("Gold")} htmlFor="review-gold">
          <Input
            id="review-gold"
            type="number"
            value={draft.gold}
            onChange={(e) => setField("gold", Number(e.target.value))}
          />
        </Field>

        {draft.items.length > 0 && (
          <section>
            <h2 className="mb-2 font-serif text-lg text-text">Starting gear</h2>
            <ul className="flex flex-col gap-1">
              {draft.items.map((it) => (
                <li key={it.id} className="flex flex-wrap items-center gap-2 text-sm text-text">
                  {it.name}
                  {it.tags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </li>
              ))}
            </ul>
          </section>
        )}

        {draft.bonds && (
          <p className="text-sm text-text">
            <span className="font-medium">{t("Bonds")}:</span> {draft.bonds}
          </p>
        )}
        {draft.omens && (
          <p className="text-sm text-text">
            <span className="font-medium">{t("Omens")}:</span> {draft.omens}
          </p>
        )}

        {create.isError && (
          <p role="alert" className="text-sm text-danger">
            Failed to save. Check required fields.
          </p>
        )}

        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setStep("background")}>
            ← Back
          </Button>
          <Button onClick={onSave} disabled={!draft.name || create.isPending}>
            {t("Save Character")}
          </Button>
        </div>
      </Card>
    </Container>
  );
}

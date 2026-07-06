import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { CreateCharacterInput } from "@kw/shared";
import {
  useBackgrounds,
  useRollCharacter,
  useCreateCharacter,
} from "../useCharacters.js";
import {
  Container,
  Card,
  Field,
  Input,
  Badge,
  Button,
  Spinner,
  Skeleton,
} from "../../ui/index.js";
import { DiceIcon } from "../../ui/icons.js";
import { cn } from "../../ui/cn.js";
import { StatField, ATTR_DICE, HP_DICE } from "../../dice/StatField.js";

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
  const steps = [t("Background"), t("Review")];
  const current = step === "background" ? 0 : 1;
  return (
    <ol className="mb-6 flex items-center">
      {steps.map((label, i) => (
        <li key={label} className={i > 0 ? "flex flex-1 items-center" : "flex items-center"}>
          {i > 0 && (
            <span
              aria-hidden
              className={`mx-3 h-px flex-1 ${i <= current ? "bg-btn" : "bg-border"}`}
            />
          )}
          <span className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-(--duration-base) ${
                i === current
                  ? "bg-btn text-btn-fg"
                  : i < current
                    ? "bg-btn/20 text-accent"
                    : "border border-border text-muted"
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`text-sm ${i === current ? "font-semibold text-text" : "text-muted"}`}
            >
              {label}
            </span>
          </span>
        </li>
      ))}
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
    const names = backgrounds ? Object.keys(backgrounds) : null;
    return (
      <Container className="max-w-2xl">
        <Stepper step={step} />
        <h1 className="mb-5 font-serif text-3xl font-bold tracking-tight text-text">
          {t("Create Character")}
        </h1>

        <Button
          className="w-full"
          onClick={() => rollWith("")}
          disabled={roll.isPending}
        >
          {roll.isPending ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <DiceIcon className="h-5 w-5" />
          )}
          {t("Roll a random character")}
        </Button>

        <div className="my-5 flex items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-border" />
          <span className="text-sm text-muted">{t("…or pick a background")}</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        {/* Trasfondos como cartas seleccionables en vez de un <select>:
            en móvil se elige tocando, y el elegido queda marcado en ámbar. */}
        {names ? (
          <div
            role="radiogroup"
            aria-label={t("Background")}
            className="grid grid-cols-2 gap-2 sm:grid-cols-3"
          >
            {names.map((name) => (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={selected === name}
                onClick={() => setSelected(selected === name ? "" : name)}
                className={cn(
                  "min-h-11 rounded-(--radius-card) border p-3 text-left font-serif text-sm leading-snug transition-[color,border-color,background-color,transform] duration-(--duration-fast) ease-(--ease-emphasized) active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  selected === name
                    ? "border-accent bg-btn/10 font-bold text-text"
                    : "border-border bg-surface text-text hover:border-accent/50"
                )}
              >
                {name}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button
            className="w-full"
            onClick={() => rollWith(selected)}
            disabled={!selected || roll.isPending}
          >
            {t("Roll this background")}
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={startManual}
            disabled={!selected}
          >
            {t("Fill manually")}
          </Button>
        </div>
      </Container>
    );
  }

  if (!draft) return null;

  const setField = <K extends keyof CreateCharacterInput>(
    key: K,
    value: CreateCharacterInput[K]
  ) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  return (
    <Container className="max-w-2xl">
      <Stepper step={step} />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-text">
          {t("Review")}
        </h1>
        {draft.background ? <Badge>{draft.background}</Badge> : null}
      </div>

      <div className="flex flex-col gap-5">
        <Field label={t("Name")} htmlFor="review-name">
          <Input
            id="review-name"
            value={draft.name}
            onChange={(e) => setField("name", e.target.value)}
          />
        </Field>

        {/* Atributos como hoja de personaje: se pulsan para tirar o editar */}
        <div className="grid grid-cols-2 gap-2">
          <StatField
            label={t("Strength")}
            value={draft.strengthMax}
            preset={ATTR_DICE}
            onChange={(n) => setField("strengthMax", n)}
          />
          <StatField
            label={t("Dexterity")}
            value={draft.dexterityMax}
            preset={ATTR_DICE}
            onChange={(n) => setField("dexterityMax", n)}
          />
          <StatField
            label={t("Willpower")}
            value={draft.willpowerMax}
            preset={ATTR_DICE}
            onChange={(n) => setField("willpowerMax", n)}
          />
          <StatField
            label={t("HP")}
            value={draft.hpMax}
            preset={HP_DICE}
            onChange={(n) => setField("hpMax", n)}
          />
          <StatField
            label={t("Gold")}
            value={draft.gold}
            preset={ATTR_DICE}
            onChange={(n) => setField("gold", n)}
            className="col-span-2"
          />
        </div>

        {draft.items.length > 0 && (
          <Card>
            <h2 className="mb-3 font-serif text-lg font-bold text-text">Starting gear</h2>
            <ul className="flex flex-col gap-2">
              {draft.items.map((it) => (
                <li
                  key={it.id}
                  className="flex flex-wrap items-center gap-2 text-sm text-text"
                >
                  {it.name}
                  {it.tags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {draft.bonds && (
          <Card>
            <h2 className="mb-2 font-serif text-lg font-bold text-text">{t("Bonds")}</h2>
            <p className="text-sm text-muted">{draft.bonds}</p>
          </Card>
        )}
        {draft.omens && (
          <Card>
            <h2 className="mb-2 font-serif text-lg font-bold text-text">{t("Omens")}</h2>
            <p className="text-sm text-muted">{draft.omens}</p>
          </Card>
        )}

        {create.isError && (
          <p role="alert" className="text-sm text-danger">
            Failed to save. Check required fields.
          </p>
        )}

        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setStep("background")}>
            ← {t("Back")}
          </Button>
          <Button
            className="flex-1"
            onClick={onSave}
            disabled={!draft.name || create.isPending}
          >
            {t("Save Character")}
          </Button>
        </div>
      </div>
    </Container>
  );
}

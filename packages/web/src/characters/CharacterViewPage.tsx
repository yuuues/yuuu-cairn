import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import { serializeCharacter } from "@kw/shared";
import { useCharacter } from "./useCharacters.js";
import { downloadOrShare } from "../local/exportFile.js";
import { encodeForQr, fitsInQr } from "../local/qr.js";
import { Container, Card, Badge, Button, Skeleton, Modal } from "../ui/index.js";
import { ArrowLeftIcon } from "../ui/icons.js";

export function CharacterViewPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const charId = Number(id);
  const { data: character, isLoading, error } = useCharacter(charId);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  async function handleShowQr() {
    if (!character) return;
    setQrError(null);
    setQrDataUrl(null);
    const encoded = encodeForQr(serializeCharacter(character));
    if (!fitsInQr(encoded)) {
      setQrError(t("Character too large for QR, use Export file instead."));
      setQrOpen(true);
      return;
    }
    try {
      const url = await QRCode.toDataURL(encoded, { errorCorrectionLevel: "L" });
      setQrDataUrl(url);
      setQrOpen(true);
    } catch {
      setQrError(t("Could not generate QR code."));
      setQrOpen(true);
    }
  }

  if (isLoading)
    return (
      <Container>
        <div className="mb-6 flex flex-col gap-3">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex flex-col gap-4">
          <Card>
            <Skeleton className="mb-3 h-4 w-2/3" />
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-20" />
              ))}
            </div>
          </Card>
          <Card>
            <Skeleton className="h-4 w-full" />
          </Card>
        </div>
      </Container>
    );
  if (error || !character)
    return (
      <Container>
        <p className="text-danger">{t("Character not found.")}</p>
      </Container>
    );

  return (
    <Container>
      {/* Título con retorno + acciones en dos niveles: las de navegación del
          personaje (grid) y las utilidades (fila discreta), en vez de siete
          pastillas envueltas en la cabecera. */}
      <div className="mb-4 flex items-center gap-1">
        <Link
          to="/characters"
          aria-label={t("Back")}
          className="-ml-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-(--duration-fast) hover:text-text"
        >
          <ArrowLeftIcon />
        </Link>
        <h1 className="min-w-0 truncate font-serif text-2xl font-bold tracking-tight text-text sm:text-3xl">
          {character.name}
        </h1>
      </div>
      <div className="mb-3 grid grid-cols-3 gap-2">
        <Link to={`/characters/${character.id}/edit`} className="contents">
          <Button variant="secondary" className="w-full">{t("Edit")}</Button>
        </Link>
        <Link to={`/characters/${character.id}/inventory`} className="contents">
          <Button variant="secondary" className="w-full">{t("Inventory")}</Button>
        </Link>
        <Link to={`/characters/${character.id}/avatar`} className="contents">
          <Button variant="secondary" className="w-full">{t("Avatar")}</Button>
        </Link>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        <Link to={`/characters/${character.id}/print`}>
          <Button variant="ghost" size="sm">{t("Print")}</Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            void downloadOrShare(
              `${character.name}.cairn.json`,
              serializeCharacter(character),
            )
          }
        >
          {t("Export")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void handleShowQr()}
        >
          {t("QR")}
        </Button>
      </div>

      <Modal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        title={t("Character QR code")}
      >
        {qrError ? (
          <p role="alert" className="text-sm text-danger">
            {qrError}
          </p>
        ) : qrDataUrl ? (
          <div className="flex flex-col items-center gap-3">
            <img
              src={qrDataUrl}
              alt={t("QR code for {{name}}", { name: character.name })}
              className="h-auto w-full max-w-xs"
            />
            <p className="text-sm text-muted">
              {t("Scan or copy this code to import the character elsewhere.")}
            </p>
          </div>
        ) : null}
      </Modal>

      <div className="flex flex-col gap-4">
        <Card>
          <p className="mb-3 text-sm text-muted">{character.background}</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            <div className="text-sm">
              <span className="font-medium text-text">{t("Strength")}</span>
              <span className="ml-2 text-muted">{character.strength}/{character.strengthMax}</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-text">{t("Dexterity")}</span>
              <span className="ml-2 text-muted">{character.dexterity}/{character.dexterityMax}</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-text">{t("Willpower")}</span>
              <span className="ml-2 text-muted">{character.willpower}/{character.willpowerMax}</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-text">{t("HP")}</span>
              <span className="ml-2 text-muted">{character.hp}/{character.hpMax}</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-text">{t("Armor")}</span>
              <span className="ml-2 text-muted">{character.armor ?? "0"}</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-text">{t("Gold")}</span>
              <span className="ml-2 text-muted">{character.gold}</span>
            </div>
          </div>
        </Card>

        {character.bonds && (
          <Card>
            <h2 className="mb-2 font-serif text-lg text-text">{t("Bonds")}</h2>
            <p className="whitespace-pre-wrap text-sm text-muted">{character.bonds}</p>
          </Card>
        )}

        {character.omens && (
          <Card>
            <h2 className="mb-2 font-serif text-lg text-text">{t("Omens")}</h2>
            <p className="whitespace-pre-wrap text-sm text-muted">{character.omens}</p>
          </Card>
        )}

        {character.traits && (
          <Card>
            <h2 className="mb-2 font-serif text-lg text-text">{t("Traits")}</h2>
            <p className="text-sm text-muted">{character.traits}</p>
          </Card>
        )}

        <Card>
          <h2 className="mb-3 font-serif text-lg text-text">{t("Inventory")}</h2>
          <ul className="flex flex-col gap-2">
            {character.items.map((it) => (
              <li key={it.id} className="flex flex-wrap items-center gap-2 text-sm text-text">
                {it.name}
                {it.tags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Container>
  );
}

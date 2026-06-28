import { useTranslation } from "react-i18next";
import type { Item, Container } from "@kw/shared";
import { containerSlots, isContainerFull } from "@kw/core";
import { Card, Badge, Button } from "../ui/index.js";

interface ContainerViewProps {
  container: Container;
  items: Item[];
  containers: Container[];
  onDeleteItem: (itemId: number) => void;
}

export function ContainerView({
  container,
  items,
  containers,
  onDeleteItem,
}: ContainerViewProps) {
  const { t } = useTranslation();
  const used = containerSlots(items, container.id);
  const full = isContainerFull(items, containers, container.id);
  const containerItems = items.filter((it) => it.location === container.id);

  return (
    <Card className={full ? "mt-4 border-danger/50" : "mt-4"}>
      <h3 className="mb-3 font-serif text-lg text-text">
        {container.name}{" "}
        <span className={full ? "text-danger" : "text-muted"}>
          ({used}/{container.slots} {t("Slots")})
        </span>
      </h3>
      <ul className="flex flex-col divide-y divide-border">
        {containerItems.map((it) => (
          <li
            key={it.id}
            className="flex items-center justify-between gap-2 py-2"
          >
            <span className="flex flex-wrap items-center gap-2 text-text">
              {it.name}
              {it.tags.map((tag) => (
                <Badge key={tag}>{t(tag)}</Badge>
              ))}
            </span>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`${t("Delete")} ${it.name}`}
              onClick={() => onDeleteItem(it.id)}
            >
              ×
            </Button>
          </li>
        ))}
        {containerItems.length === 0 && (
          <li className="py-2 text-muted">—</li>
        )}
      </ul>
    </Card>
  );
}

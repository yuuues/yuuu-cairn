import { useTranslation } from "react-i18next";
import type { Item, Container } from "@kw/shared";
import { containerSlots, isContainerFull } from "@kw/core";

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
    <section className={full ? "container encumbered" : "container"}>
      <h3>
        {container.name} ({used}/{container.slots} {t("Slots")})
      </h3>
      <ul>
        {containerItems.map((it) => (
          <li key={it.id}>
            {it.name}
            {it.tags.length > 0 ? ` (${it.tags.map((tag) => t(tag)).join(", ")})` : ""}{" "}
            <button type="button" onClick={() => onDeleteItem(it.id)}>
              ×
            </button>
          </li>
        ))}
        {containerItems.length === 0 && <li className="empty">—</li>}
      </ul>
    </section>
  );
}

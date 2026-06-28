import type {
  Background,
  GearItem,
  TableOption,
  Item,
  Container,
} from "@kw/shared";

const SECOND_BOND_BG = "Roll a second time on the Bonds table";
const SECOND_BOND_T1 = "roll a second time on the Bonds table";

/** Número de vínculos requeridos (paridad get_required_bonds_count). */
export function requiredBondsCount(
  background: Background | null,
  table1OptionDesc: string
): number {
  if (!background) return 1;
  if ((background.background_description ?? "").includes(SECOND_BOND_BG)) return 2;
  if (table1OptionDesc && table1OptionDesc.includes(SECOND_BOND_T1)) return 2;
  return 1;
}

/** Normaliza items de gear a Item base (tags por defecto []), sin id/location. */
export function itemsFromGear(gear: GearItem[]): Item[] {
  return gear.map((g) => {
    const tags = Array.isArray(g.tags) ? g.tags : [];
    return { ...g, tags, id: 0, location: 0 } as Item;
  });
}

/** Asigna ids incrementales desde 1 y location 0 (paridad generate_character). */
export function assignItemIds(items: Item[]): Item[] {
  return items.map((it, idx) => ({ ...it, id: idx + 1, location: 0 }));
}

/**
 * Construye la lista de contenedores: Main (id 0, 10 slots) + starting_containers
 * + containers de table1/table2, con ids incrementales desde 1.
 */
export function buildContainers(
  background: Background | null,
  t1: TableOption | undefined,
  t2: TableOption | undefined
): Container[] {
  const containers: Container[] = [{ id: 0, name: "Main", slots: 10 }];
  let idx = 1;
  const push = (defs: { name: string; slots: number }[] | undefined) => {
    if (!defs) return;
    for (const c of defs) {
      containers.push({ ...c, id: idx++ } as Container);
    }
  };
  push(background?.starting_containers);
  push(t1?.containers);
  push(t2?.containers);
  return containers;
}

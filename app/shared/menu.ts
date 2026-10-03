export interface Category {
  id: string;
  name: string;
  blurb: string;
  position: number;
}

export interface MenuOption {
  id: string;
  name: string;
  priceCents: number;
}

export interface OptionGroup {
  id: string;
  name: string;
  kind: "one" | "many";
  required: boolean;
  options: MenuOption[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  priceCents: number;
  photo: string;
  optionGroupIds: string[];
  hidden: boolean;
  soldOutUntil: Date | null;
  position: number;
  createdAt: Date;
}

export function isSoldOut(item: MenuItem, now: Date = new Date()): boolean {
  return item.soldOutUntil !== null && item.soldOutUntil !== undefined && new Date(item.soldOutUntil).getTime() > now.getTime();
}

export function byPosition<T extends { position: number; name: string }>(a: T, b: T): number {
  return a.position - b.position || a.name.localeCompare(b.name);
}

export function itemsIn(items: Iterable<MenuItem>, categoryId: string, includeHidden = false): MenuItem[] {
  return [...items].filter((i) => i.categoryId === categoryId && (includeHidden || !i.hidden)).sort(byPosition);
}

export function groupsFor(item: MenuItem, groups: OptionGroup[]): OptionGroup[] {
  let found: OptionGroup[] = [];

  for (let id of item.optionGroupIds) {
    let group = groups.find((g) => g.id === id);

    if (group) {
      found.push(group);
    }
  }

  return found;
}

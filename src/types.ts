export interface Rarity {
  id: string;
  name: string;
  color: string;
}

export interface Weapon {
  id: string;
  weapon_id?: number;
  name: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Pattern {
  id: string;
  name: string;
}

export interface Wear {
  id: string;
  name: string;
}

export interface Collection {
  id: string;
  name: string;
  image?: string;
}

export interface Skin {
  id: string;
  name: string;
  description?: string | null;
  weapon: Weapon;
  category: Category;
  pattern?: Pattern | null;
  min_float: number;
  max_float: number;
  rarity: Rarity;
  stattrak: boolean;
  souvenir: boolean;
  paint_index?: string | null;
  wears?: Wear[];
  collections?: Collection[];
  image: string;
}

export type WearName =
  | "Factory New"
  | "Minimal Wear"
  | "Field-Tested"
  | "Well-Worn"
  | "Battle-Scarred";

export const WEAR_RANGES: { name: WearName; min: number; max: number }[] = [
  { name: "Factory New", min: 0.0, max: 0.07 },
  { name: "Minimal Wear", min: 0.07, max: 0.15 },
  { name: "Field-Tested", min: 0.15, max: 0.38 },
  { name: "Well-Worn", min: 0.38, max: 0.45 },
  { name: "Battle-Scarred", min: 0.45, max: 1.0 },
];

export function wearFromFloat(f: number): WearName {
  return (WEAR_RANGES.find((w) => f >= w.min && f <= w.max)?.name ??
    "Field-Tested") as WearName;
}

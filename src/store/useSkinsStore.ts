import { create } from "zustand";
import type { Skin } from "../types";
import { fetchAllSkins } from "../api/skins";

export interface Filters {
  search: string;
  weapon: string;
  category: string;
  rarity: string;
  collection: string;
  stattrak: boolean | null;
}

interface SkinsState {
  skins: Skin[];
  loading: boolean;
  error: string | null;
  filters: Filters;
  page: number;
  pageSize: number;
  load: () => Promise<void>;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  resetFilters: () => void;
  setPage: (n: number) => void;
}

const initialFilters: Filters = {
  search: "",
  weapon: "",
  category: "",
  rarity: "",
  collection: "",
  stattrak: null,
};

export const useSkinsStore = create<SkinsState>((set, get) => ({
  skins: [],
  loading: false,
  error: null,
  filters: initialFilters,
  page: 1,
  pageSize: 24,
  load: async () => {
    if (get().skins.length || get().loading) return;
    set({ loading: true, error: null });
    try {
      const skins = await fetchAllSkins();
      set({ skins, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value }, page: 1 })),
  resetFilters: () => set({ filters: initialFilters, page: 1 }),
  setPage: (n) => set({ page: n }),
}));

export function applyFilters(skins: Skin[], f: Filters): Skin[] {
  const q = f.search.trim().toLowerCase();
  return skins.filter((s) => {
    if (q && !s.name.toLowerCase().includes(q)) return false;
    if (f.weapon && s.weapon?.name !== f.weapon) return false;
    if (f.category && s.category?.name !== f.category) return false;
    if (f.rarity && s.rarity?.name !== f.rarity) return false;
    if (
      f.collection &&
      !(s.collections || []).some((c) => c.name === f.collection)
    )
      return false;
    if (f.stattrak === true && !s.stattrak) return false;
    return true;
  });
}

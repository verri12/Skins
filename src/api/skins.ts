import axios from "axios";
import type { Skin } from "../types";

const SKINS_URLS = [
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json",
  "https://cdn.jsdelivr.net/gh/ByMykel/CSGO-API@main/public/api/en/skins.json",
  "https://bymykel.github.io/CSGO-API/api/en/skins.json",
];

let cache: Skin[] | null = null;

export async function fetchAllSkins(): Promise<Skin[]> {
  if (cache) return cache;
  let lastErr: unknown;
  for (const url of SKINS_URLS) {
    try {
      const { data } = await axios.get<Skin[]>(url, { timeout: 30000 });
      if (Array.isArray(data) && data.length) {
        cache = data.filter((s) => s.image && s.rarity);
        return cache;
      }
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(
    `Falha ao baixar skins. Verifique sua conexão. (${
      (lastErr as Error)?.message ?? "sem detalhes"
    })`
  );
}

export async function fetchSkinById(id: string): Promise<Skin | undefined> {
  const all = await fetchAllSkins();
  return all.find((s) => s.id === id);
}

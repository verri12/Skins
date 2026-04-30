import axios from "axios";
import type { WearName } from "../types";

/**
 * Steam Market price.
 *
 * Estratégias (em cascata):
 *  1. /api/price → Cloudflare Pages Function (server-side, sem CORS).
 *     Em produção (Cloudflare Pages) é a melhor fonte.
 *  2. Public CORS proxy (allorigins) como fallback para dev local.
 *  3. Retorna null se ambos falharem (UI mostra "Indisponível").
 */
export interface PriceData {
  wear: WearName;
  lowest_price?: string;
  median_price?: string;
  volume?: string;
}

const APP_ID = 730; // CS2 / CS:GO
const CURRENCY = 7; // 7 = BRL · 1 = USD · 3 = EUR

function buildMarketHashName(
  baseName: string,
  wear: WearName,
  stattrak = false
): string {
  const prefix = stattrak ? "StatTrak™ " : "";
  return `${prefix}${baseName} (${wear})`;
}

interface SteamPriceResponse {
  success?: boolean;
  lowest_price?: string;
  median_price?: string;
  volume?: string;
}

async function tryPagesFunction(
  market_hash_name: string
): Promise<SteamPriceResponse | null> {
  try {
    const { data } = await axios.get<SteamPriceResponse>("/api/price", {
      params: { name: market_hash_name, appid: APP_ID, currency: CURRENCY },
      timeout: 10000,
    });
    return data?.success ? data : null;
  } catch {
    return null;
  }
}

async function tryCorsProxy(
  market_hash_name: string
): Promise<SteamPriceResponse | null> {
  const steamUrl =
    `https://steamcommunity.com/market/priceoverview/?appid=${APP_ID}` +
    `&currency=${CURRENCY}&market_hash_name=${encodeURIComponent(market_hash_name)}`;
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(steamUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(steamUrl)}`,
    `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(steamUrl)}`,
  ];
  for (const url of proxies) {
    try {
      const { data } = await axios.get<SteamPriceResponse>(url, {
        timeout: 8000,
      });
      if (data?.success) return data;
    } catch {
      // try next
    }
  }
  return null;
}

export async function fetchPrice(
  baseName: string,
  wear: WearName,
  stattrak = false
): Promise<PriceData | null> {
  const market_hash_name = buildMarketHashName(baseName, wear, stattrak);

  const data =
    (await tryPagesFunction(market_hash_name)) ??
    (await tryCorsProxy(market_hash_name));

  if (!data) return null;
  return {
    wear,
    lowest_price: data.lowest_price,
    median_price: data.median_price,
    volume: data.volume,
  };
}

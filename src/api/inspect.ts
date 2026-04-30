/**
 * Cliente para `/api/inspect` (Cloudflare Pages Function que proxia a CSFloat
 * API pública). Devolve os dados reais de float/pattern/stickers de um item
 * a partir do inspect link da Steam.
 */
import axios from "axios";

export interface InspectSticker {
  stickerId: number;
  slot: number;
  wear?: number;
  scale?: number;
  rotation?: number;
  name?: string;
}

export interface InspectResult {
  float: number;
  paintseed: number;
  paintindex: number;
  defindex: number;
  rarity: number;
  origin: number;
  quality: number;
  stattrak: boolean;
  killeaterscore?: number;
  customname: string | null;
  stickers: InspectSticker[];
  min_float?: number;
  max_float?: number;
  wear_name?: string;
  full_item_name?: string;
  item_name?: string;
  weapon_type?: string;
  imageurl?: string;
}

const INSPECT_REGEX =
  /^steam:\/\/rungame\/730\/\d+\/\+csgo_econ_action_preview(?:\s|%20)[SM]\d+A\d+D\d+$/i;

export function isValidInspectLink(link: string): boolean {
  return INSPECT_REGEX.test(link.trim());
}

export async function inspectItem(inspectLink: string): Promise<InspectResult> {
  const link = inspectLink.trim();
  if (!isValidInspectLink(link)) {
    throw new Error(
      "Inspect link inválido. Cole o link no formato 'steam://rungame/730/.../+csgo_econ_action_preview S...A...D...'"
    );
  }

  const { data } = await axios.get<InspectResult | { error: string }>(
    `/api/inspect?url=${encodeURIComponent(link)}`
  );

  if ("error" in data) {
    throw new Error(data.error);
  }
  return data;
}

/**
 * Cloudflare Pages Function — Proxy para o endpoint público da CSFloat API.
 *
 * Disponível em:
 *   /api/inspect?url=<inspect_link>
 *
 * `inspect_link` é o link da Steam que aparece em "Inspect in Game...":
 *   steam://rungame/730/.../+csgo_econ_action_preview%20S<steamid>A<assetid>D<d>
 *   steam://rungame/730/.../+csgo_econ_action_preview%20M<m>A<assetid>D<d>
 *
 * A CSFloat mantém um pool de bots conectados ao Game Coordinator do CS2 e
 * devolve os dados reais do item: float, paint seed (pattern), paint index,
 * stickers, etc.
 *
 * Cacheamos 7 dias porque o item é praticamente imutável (stickers raspáveis
 * são exceção rara — usuário pode forçar refresh ignorando o cache da CF
 * com `?nocache=1`).
 */

interface CsfloatSticker {
  stickerId: number;
  slot: number;
  wear?: number;
  scale?: number;
  rotation?: number;
  name?: string;
}

interface CsfloatItem {
  floatvalue: number;
  paintseed: number;
  paintindex: number;
  defindex: number;
  rarity: number;
  origin: number;
  quality: number;
  killeatervalue?: number;
  killeaterscoretype?: number;
  customname?: string;
  stickers?: CsfloatSticker[];
  imageurl?: string;
  min?: number;
  max?: number;
  weapon_type?: string;
  item_name?: string;
  rarity_name?: string;
  quality_name?: string;
  origin_name?: string;
  wear_name?: string;
  full_item_name?: string;
}

interface CsfloatResponse {
  iteminfo?: CsfloatItem;
  error?: string;
  code?: number;
}

const INSPECT_REGEX =
  /^steam:\/\/rungame\/730\/\d+\/\+csgo_econ_action_preview(?:\s|%20)[SM]\d+A\d+D\d+$/i;

export const onRequestGet: PagesFunction = async (ctx) => {
  const url = new URL(ctx.request.url);
  const inspectUrl = url.searchParams.get("url");
  const noCache = url.searchParams.get("nocache") === "1";

  if (!inspectUrl) {
    return json({ error: "missing url" }, 400);
  }

  // Validação básica de formato — evita SSRF acidental.
  if (!INSPECT_REGEX.test(inspectUrl.trim())) {
    return json(
      {
        error:
          "invalid inspect link. esperado: steam://rungame/730/.../+csgo_econ_action_preview S...A...D... (ou M...A...D...)",
      },
      400
    );
  }

  const cache = caches.default;
  const cacheKey = new Request(
    `${url.origin}/api/inspect?url=${encodeURIComponent(inspectUrl)}`,
    { method: "GET" }
  );

  if (!noCache) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  }

  try {
    const upstream = `https://api.csfloat.com/?url=${encodeURIComponent(
      inspectUrl
    )}`;
    const r = await fetch(upstream, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; CSSkinsViewer/1.0; +https://csgoskins.gg)",
        accept: "application/json",
      },
      cf: { cacheTtl: 60 * 60 * 24 * 7, cacheEverything: true },
    });

    if (!r.ok) {
      const text = await r.text();
      return json(
        { error: "upstream error", status: r.status, body: text.slice(0, 300) },
        502
      );
    }

    const data = (await r.json()) as CsfloatResponse;
    if (data.error || !data.iteminfo) {
      return json(
        { error: data.error ?? "no iteminfo returned", code: data.code },
        404
      );
    }

    const it = data.iteminfo;
    const result = {
      float: it.floatvalue,
      paintseed: it.paintseed,
      paintindex: it.paintindex,
      defindex: it.defindex,
      rarity: it.rarity,
      origin: it.origin,
      quality: it.quality,
      stattrak: (it.killeatervalue ?? -1) >= 0,
      killeaterscore: it.killeatervalue,
      customname: it.customname ?? null,
      stickers: it.stickers ?? [],
      min_float: it.min,
      max_float: it.max,
      wear_name: it.wear_name,
      full_item_name: it.full_item_name,
      item_name: it.item_name,
      weapon_type: it.weapon_type,
      imageurl: it.imageurl,
    };

    const res = new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=604800, immutable",
        "access-control-allow-origin": "*",
      },
    });
    if (!noCache) ctx.waitUntil(cache.put(cacheKey, res.clone()));
    return res;
  } catch (e) {
    return json({ error: (e as Error).message }, 502);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
    },
  });
}

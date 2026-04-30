/**
 * Cloudflare Pages Function — Proxy server-side para Steam Market.
 *
 * Quando publicado em Cloudflare Pages, esta função fica disponível em
 *   /api/price?name=<market_hash_name>
 * e contorna totalmente o CORS porque a chamada ao Steam é feita do edge
 * (não do navegador).
 *
 * Cache de 30 minutos via Cache API do Cloudflare para reduzir rate-limit.
 */
export const onRequestGet: PagesFunction = async (ctx) => {
  const url = new URL(ctx.request.url);
  const name = url.searchParams.get("name");
  const currency = url.searchParams.get("currency") ?? "7"; // 7 = BRL
  const appid = url.searchParams.get("appid") ?? "730";

  if (!name) {
    return new Response(JSON.stringify({ error: "missing name" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const cache = caches.default;
  const cacheKey = new Request(ctx.request.url, ctx.request);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const steamUrl =
    `https://steamcommunity.com/market/priceoverview/` +
    `?appid=${appid}&currency=${currency}&market_hash_name=${encodeURIComponent(name)}`;

  try {
    const r = await fetch(steamUrl, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; CSSkinsViewer/1.0; +https://csgoskins.gg)",
        accept: "application/json",
      },
      cf: { cacheTtl: 1800, cacheEverything: true },
    });
    const body = await r.text();
    const res = new Response(body, {
      status: r.status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=1800",
        "access-control-allow-origin": "*",
      },
    });
    ctx.waitUntil(cache.put(cacheKey, res.clone()));
    return res;
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: (e as Error).message }),
      {
        status: 502,
        headers: {
          "content-type": "application/json",
          "access-control-allow-origin": "*",
        },
      }
    );
  }
};

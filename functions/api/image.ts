/**
 * Cloudflare Pages Function — Proxy server-side para imagens do Steam CDN.
 *
 * Disponível em:
 *   /api/image?u=<url-encoded-steam-cdn-url>
 *
 * Por que existe:
 *  - O THREE.TextureLoader (WebGL) exige CORS ao carregar a textura para não
 *    "tainted" o canvas. Os mirrors do Steam (akamai/cloudflare/fastly) nem
 *    sempre devolvem `access-control-allow-origin: *`, e alguns retornam 404
 *    (ex.: steamcdn-a.akamaihd.net).
 *  - Buscar do edge da Cloudflare elimina CORS, normaliza erros e ainda
 *    aproveita o cache do POP.
 */
const ALLOWED_HOSTS = [
  "community.cloudflare.steamstatic.com",
  "community.fastly.steamstatic.com",
  "community.akamai.steamstatic.com",
  "steamcommunity-a.akamaihd.net",
  "steamcdn-a.akamaihd.net",
  // CSFloat screenshot service (imagens renderizadas server-side com
  // float/pattern reais do item, retornadas pela API de inspect).
  "s.csfloat.com",
  "cdn.csfloat.com",
  "render.csgofloat.com",
];

export const onRequestGet: PagesFunction = async (ctx) => {
  const url = new URL(ctx.request.url);
  const target = url.searchParams.get("u");

  if (!target) {
    return new Response("missing u", { status: 400 });
  }

  let upstream: URL;
  try {
    upstream = new URL(target);
  } catch {
    return new Response("invalid url", { status: 400 });
  }

  if (!ALLOWED_HOSTS.includes(upstream.hostname)) {
    return new Response("host not allowed", { status: 400 });
  }

  const cache = caches.default;
  const cacheKey = new Request(ctx.request.url, ctx.request);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  // Mirrors da Steam compartilham a mesma estrutura de URL, então faz
  // sentido tentá-los como fallback um do outro. Hosts não-Steam (CSFloat
  // etc) são consultados apenas no host original.
  const STEAM_MIRRORS = ALLOWED_HOSTS.filter((h) =>
    h.includes("steam") || h.includes("akamaihd")
  );
  const isSteam = STEAM_MIRRORS.includes(upstream.hostname);
  const fallbackOrder = isSteam
    ? [upstream.hostname, ...STEAM_MIRRORS.filter((h) => h !== upstream.hostname)]
    : [upstream.hostname];

  for (const host of fallbackOrder) {
    const candidate = new URL(upstream.toString());
    candidate.hostname = host;
    try {
      const r = await fetch(candidate.toString(), {
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; CSSkinsViewer/1.0; +https://csgoskins.gg)",
          accept: "image/*",
        },
        cf: { cacheTtl: 86400, cacheEverything: true },
      });
      if (!r.ok) continue;

      const res = new Response(r.body, {
        status: 200,
        headers: {
          "content-type": r.headers.get("content-type") ?? "image/png",
          "cache-control": "public, max-age=86400, immutable",
          "access-control-allow-origin": "*",
        },
      });
      ctx.waitUntil(cache.put(cacheKey, res.clone()));
      return res;
    } catch {
      // tenta próximo mirror
    }
  }

  return new Response("upstream failed", {
    status: 502,
    headers: { "access-control-allow-origin": "*" },
  });
};
